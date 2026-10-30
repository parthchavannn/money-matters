import { afterEach, describe, expect, it } from "vitest";
import { buildSampleData } from "@/store/sample";
import { emptyData } from "@/domain/meta";
import type { AppData } from "@/domain/types";
import { SyncEngine, type CloudStore, type PushResult, type Remote, type SyncMeta, type SyncStatus } from "./syncEngine";

/** An in-memory stand-in for the server with the same revision rules as the SQL migration. */
class FakeServer implements CloudStore {
  row: Remote | null = null;
  pushes = 0;
  fetchError: Error | null = null;
  pushError: Error | null = null;
  gate: Promise<void> | null = null; // hold pushes open to simulate a slow network

  async fetch() {
    if (this.fetchError) throw this.fetchError;
    return this.row ? { data: this.row.data, revision: this.row.revision } : null;
  }
  async push(data: AppData, base: number | null): Promise<PushResult> {
    if (this.pushError) throw this.pushError;
    if (this.gate) await this.gate;
    this.pushes++;
    if (base === null) {
      if (this.row) return { status: "conflict" };
      this.row = { data, revision: 1 };
      return { status: "ok", revision: 1 };
    }
    if (!this.row || this.row.revision !== base) return { status: "conflict" };
    this.row = { data, revision: base + 1 };
    return { status: "ok", revision: base + 1 };
  }
  /** Another device writes. */
  otherDevice(data: AppData) {
    this.row = { data, revision: (this.row?.revision ?? 0) + 1 };
  }
}

function harness(opts: { local?: AppData; meta?: SyncMeta } = {}) {
  const server = new FakeServer();
  const h = {
    server,
    local: opts.local ?? emptyData(),
    meta: opts.meta ?? ({ base: null, dirty: false } as SyncMeta),
    statuses: [] as SyncStatus[],
    engine: null as unknown as SyncEngine,
    /** what the UI does when the user edits something */
    edit(mutate: (d: AppData) => AppData) {
      h.local = mutate(h.local);
      h.engine.notifyChange();
    },
  };
  h.engine = new SyncEngine(
    server,
    {
      getData: () => h.local,
      apply: (d) => (h.local = d),
      loadMeta: () => ({ ...h.meta }),
      saveMeta: (m) => (h.meta = { ...m }),
      onStatus: (s) => h.statuses.push(s),
    },
    60_000,
    60_000
  );
  return h;
}

const onboarded = (name: string): AppData => ({ ...emptyData(), settings: { ...emptyData().settings, name, onboarded: true } });
const live: SyncEngine[] = [];
const track = (h: ReturnType<typeof harness>) => (live.push(h.engine), h);
afterEach(() => live.splice(0).forEach((e) => e.dispose()));

describe("first sign-in", () => {
  it("uploads this device's data when the account is new", async () => {
    const h = track(harness({ local: onboarded("Ann") }));
    await h.engine.init();
    expect(h.server.row?.revision).toBe(1);
    expect(h.server.row?.data.settings.name).toBe("Ann");
    expect(h.meta).toEqual({ base: 1, dirty: false });
    expect(h.engine.status).toBe("synced");
  });

  it("does not upload an empty, not-yet-onboarded document", async () => {
    const h = track(harness());
    await h.engine.init();
    expect(h.server.row).toBeNull();
    expect(h.engine.status).toBe("synced");
    // …but the first real edit creates the row.
    h.edit((d) => ({ ...d, settings: { ...d.settings, onboarded: true } }));
    await h.engine.flush();
    expect(h.server.row?.revision).toBe(1);
  });

  it("moves pre-account device data into the account only if the user agrees", async () => {
    const legacy = buildSampleData("Old", "INR");
    const yes = track(harness());
    await yes.engine.init({ legacy, askLegacy: async () => true });
    expect(yes.server.row?.data.accounts.length).toBe(legacy.accounts.length);

    const no = track(harness());
    await no.engine.init({ legacy, askLegacy: async () => false });
    expect(no.server.row).toBeNull();
    expect(no.local.accounts.length).toBe(0);
  });

  it("loads the server copy for an existing account", async () => {
    const h = track(harness());
    h.server.row = { data: buildSampleData("Server"), revision: 7 };
    await h.engine.init();
    expect(h.local.settings.name).toBe("Server");
    expect(h.meta).toEqual({ base: 7, dirty: false });
    expect(h.server.pushes).toBe(0);
  });
});

describe("saving edits", () => {
  it("pushes an edit and advances the base revision", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("A"), revision: 3 };
    await h.engine.init();
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "B" } }));
    expect(h.engine.hasUnsynced).toBe(true);
    await h.engine.flush();
    expect(h.server.row?.data.settings.name).toBe("B");
    expect(h.server.row?.revision).toBe(4);
    expect(h.meta).toEqual({ base: 4, dirty: false });
    expect(h.engine.hasUnsynced).toBe(false);
  });

  it("an edit made while a push is in flight is not lost", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("A"), revision: 1 };
    await h.engine.init();
    let release!: () => void;
    h.server.gate = new Promise<void>((r) => (release = r));

    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "first" } }));
    const p = h.engine.flush();
    await Promise.resolve();
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "second" } })); // typed during the request
    h.server.gate = null;
    release();
    await p;
    await h.engine.flush();
    expect(h.server.row?.data.settings.name).toBe("second");
    expect(h.engine.hasUnsynced).toBe(false);
  });

  it("keeps edits and retries after the network drops", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("A"), revision: 1 };
    await h.engine.init();
    h.server.pushError = new TypeError("Failed to fetch");
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "offline edit" } }));
    await h.engine.flush();
    expect(h.engine.status).toBe("offline");
    expect(h.engine.hasUnsynced).toBe(true);
    expect(h.meta.dirty).toBe(true); // survives a tab close

    h.server.pushError = null;
    await h.engine.flush();
    expect(h.engine.status).toBe("synced");
    expect(h.server.row?.data.settings.name).toBe("offline edit");
  });
});

describe("two devices", () => {
  it("never overwrites a newer server version; the user picks", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("base"), revision: 1 };
    await h.engine.init();

    h.server.otherDevice(onboarded("from phone")); // revision 2
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "from laptop" } }));
    await h.engine.flush();

    expect(h.engine.status).toBe("conflict");
    expect(h.server.row?.data.settings.name).toBe("from phone"); // untouched
    expect(h.engine.conflictRemote?.revision).toBe(2);

    await h.engine.resolve("local");
    expect(h.server.row?.data.settings.name).toBe("from laptop");
    expect(h.server.row?.revision).toBe(3);
    expect(h.engine.status).toBe("synced");
  });

  it("can discard this device's edits in favour of the server", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("base"), revision: 1 };
    await h.engine.init();
    h.server.otherDevice(onboarded("from phone"));
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "from laptop" } }));
    await h.engine.flush();

    await h.engine.resolve("remote");
    expect(h.local.settings.name).toBe("from phone");
    expect(h.server.row?.data.settings.name).toBe("from phone");
    expect(h.engine.hasUnsynced).toBe(false);
  });

  it("detects, on launch, edits made offline on top of an out-of-date copy", async () => {
    const h = track(harness({ local: onboarded("offline"), meta: { base: 1, dirty: true } }));
    h.server.row = { data: onboarded("phone"), revision: 4 };
    await h.engine.init();
    expect(h.engine.status).toBe("conflict");
    expect(h.server.pushes).toBe(0);
  });

  it("pushes leftover offline edits on launch when the server hasn't moved", async () => {
    const h = track(harness({ local: onboarded("offline"), meta: { base: 4, dirty: true } }));
    h.server.row = { data: onboarded("old"), revision: 4 };
    await h.engine.init();
    expect(h.server.row?.data.settings.name).toBe("offline");
    expect(h.server.row?.revision).toBe(5);
  });

  it("pulls changes from another device when there's nothing unsynced", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("one"), revision: 1 };
    await h.engine.init();
    h.server.otherDevice(onboarded("two"));
    await h.engine.refresh();
    expect(h.local.settings.name).toBe("two");
    expect(h.meta.base).toBe(2);
  });

  it("does not let a refresh clobber unsynced local edits", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("one"), revision: 1 };
    await h.engine.init();
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "mine" } }));
    h.server.otherDevice(onboarded("two"));
    await h.engine.refresh();
    expect(h.local.settings.name).toBe("mine");
  });
});

describe("safety", () => {
  it("won't push over server data it couldn't read", async () => {
    const h = track(harness({ local: onboarded("local") }));
    h.server.row = { data: onboarded("precious"), revision: 2 };
    h.server.fetchError = new Error("Your cloud data is in an unexpected format.");
    await h.engine.init();
    expect(h.engine.status).toBe("error");
    h.edit((d) => ({ ...d, settings: { ...d.settings, name: "edit" } }));
    await h.engine.flush();
    expect(h.server.pushes).toBe(0);
    expect(h.server.row?.data.settings.name).toBe("precious");
  });

  it("recovers once the server is reachable again", async () => {
    const h = track(harness());
    h.server.row = { data: onboarded("srv"), revision: 1 };
    h.server.fetchError = new TypeError("Failed to fetch");
    await h.engine.init();
    expect(h.engine.status).toBe("offline");
    h.server.fetchError = null;
    await h.engine.flush();
    expect(h.engine.status).toBe("synced");
    expect(h.local.settings.name).toBe("srv");
  });
});
