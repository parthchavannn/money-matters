import type { AppData } from "@/domain/types";

export interface Remote {
  data: AppData;
  revision: number;
}

export type PushResult = { status: "ok"; revision: number } | { status: "conflict" };

/** The server, abstracted. Production: Supabase. Tests: an in-memory fake. */
export interface CloudStore {
  fetch(): Promise<Remote | null>;
  /** `base` is the revision this edit was made on top of; null = "no row exists yet". */
  push(data: AppData, base: number | null): Promise<PushResult>;
}

export interface SyncMeta {
  /** Server revision our local copy is based on (null = never synced). */
  base: number | null;
  /** Local edits not yet confirmed by the server. */
  dirty: boolean;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "conflict";

export interface SyncIO {
  getData(): AppData;
  /** Replace local state with data that came from the server / a chosen source. */
  apply(data: AppData): void;
  loadMeta(): SyncMeta;
  saveMeta(meta: SyncMeta): void;
  onStatus(status: SyncStatus, detail?: string): void;
}

export interface InitOptions {
  /** Pre-account data found on this device, if any. */
  legacy?: AppData | null;
  /** Ask the user whether to move that legacy data into the account. */
  askLegacy?: () => Promise<boolean>;
}

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Keeps one local document and one server document in step.
 *
 *  - Edits are saved locally first (by the app) and pushed here, debounced.
 *  - Every push carries the revision it was based on; if the server moved on,
 *    nothing is overwritten — we surface a conflict and let the user choose.
 *  - `dirty` + `base` are persisted, so edits made offline (or before a tab
 *    closed) are pushed on the next launch rather than lost.
 */
export class SyncEngine {
  status: SyncStatus = "idle";
  detail?: string;
  /** The last object handed to `apply` — lets the UI tell server-originated state from user edits. */
  applied: AppData | null = null;

  private base: number | null = null;
  private dirty = false;
  private initialized = false;
  private pendingRemote: Remote | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private initOpts: InitOptions = {};

  constructor(
    private store: CloudStore,
    private io: SyncIO,
    private debounceMs = 1200,
    private retryMs = 15000
  ) {}

  get hasUnsynced() {
    return this.dirty;
  }
  get isInitialized() {
    return this.initialized;
  }
  /** The server's version while a conflict is unresolved. */
  get conflictRemote() {
    return this.pendingRemote;
  }

  /* ─────────── lifecycle ─────────── */

  async init(opts: InitOptions = this.initOpts): Promise<void> {
    this.initOpts = opts;
    this.setStatus("syncing");
    let remote: Remote | null;
    try {
      remote = await this.store.fetch();
    } catch (e) {
      return this.fail(e);
    }
    if (this.disposed) return;

    const meta = this.io.loadMeta();
    this.base = meta.base;
    this.dirty = meta.dirty;

    if (!remote) {
      // Brand-new server account.
      const local = this.io.getData();
      let seed: AppData | null = local.settings.onboarded ? local : null;
      if (!seed && opts.legacy?.settings.onboarded && opts.askLegacy && (await opts.askLegacy())) {
        seed = opts.legacy;
        this.adopt(opts.legacy);
      }
      this.base = null;
      this.initialized = true;
      this.setDirty(!!seed);
      if (seed) await this.push();
      else this.setStatus("synced");
      return;
    }

    if (this.dirty) {
      this.initialized = true;
      if (this.base === remote.revision) return void (await this.push());
      this.pendingRemote = remote;
      return this.setStatus("conflict", "Your data changed on another device.");
    }

    this.adopt(remote.data);
    this.base = remote.revision;
    this.initialized = true;
    this.persist();
    this.setStatus("synced");
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  /* ─────────── local edits ─────────── */

  notifyChange() {
    this.setDirty(true);
    if (this.status === "conflict") return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.push(), this.debounceMs);
  }

  /** Push now (sign-out, tab hidden, coming back online). */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    if (!this.initialized) return this.init();
    if (this.dirty && this.status !== "conflict") await this.push();
    else if (!this.dirty && (this.status === "offline" || this.status === "error")) await this.refresh();
  }

  /** Pull remote changes made elsewhere — only when we have nothing unsynced to lose. */
  async refresh(): Promise<void> {
    if (!this.initialized) return this.init();
    if (this.dirty || this.inFlight || this.status === "conflict") return;
    try {
      const remote = await this.store.fetch();
      if (this.disposed || this.dirty || !remote) return;
      if (this.base === null || remote.revision > this.base) {
        this.adopt(remote.data);
        this.base = remote.revision;
        this.persist();
      }
      this.setStatus("synced");
    } catch (e) {
      this.fail(e);
    }
  }

  /** Settle a conflict: keep this device's data or take the server's. */
  async resolve(choice: "local" | "remote"): Promise<void> {
    const remote = this.pendingRemote;
    if (!remote) return;
    this.pendingRemote = null;
    this.base = remote.revision;
    if (choice === "remote") {
      this.adopt(remote.data);
      this.setDirty(false);
      this.setStatus("synced");
    } else {
      this.setDirty(true);
      this.status = "idle";
      await this.push();
    }
  }

  /* ─────────── internals ─────────── */

  private async push(): Promise<void> {
    if (!this.initialized || this.status === "conflict") return;
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.pushLoop().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async pushLoop(): Promise<void> {
    for (;;) {
      const snapshot = this.io.getData();
      this.setStatus("syncing");
      let result: PushResult;
      try {
        result = await this.store.push(snapshot, this.base);
      } catch (e) {
        return this.fail(e);
      }
      if (this.disposed) return;

      if (result.status === "conflict") {
        try {
          this.pendingRemote = await this.store.fetch();
        } catch (e) {
          return this.fail(e);
        }
        // Row vanished (e.g. deleted elsewhere): next push re-creates it.
        if (!this.pendingRemote) {
          this.base = null;
          continue;
        }
        return this.setStatus("conflict", "Your data changed on another device.");
      }

      this.base = result.revision;
      if (this.io.getData() === snapshot) {
        this.setDirty(false);
        return this.setStatus("synced");
      }
      this.persist(); // edited while in flight — go round again with the newer data
    }
  }

  private adopt(data: AppData) {
    this.applied = data;
    this.io.apply(data);
  }

  private setDirty(dirty: boolean) {
    this.dirty = dirty;
    this.persist();
  }

  private persist() {
    this.io.saveMeta({ base: this.base, dirty: this.dirty });
  }

  private setStatus(status: SyncStatus, detail?: string) {
    if (this.disposed) return;
    this.status = status;
    this.detail = detail;
    this.io.onStatus(status, detail);
  }

  private fail(e: unknown) {
    if (this.disposed) return;
    const offline = isOffline() || (e instanceof TypeError && /fetch|network/i.test(e.message));
    const message = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Sync failed";
    this.setStatus(offline ? "offline" : "error", offline ? "Saved on this device — will sync when you're back online." : message);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => void (this.initialized ? this.flush() : this.init()), this.retryMs);
  }
}
