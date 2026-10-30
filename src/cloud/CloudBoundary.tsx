import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFinance } from "@/store/FinanceContext";
import { loadData, syncMetaKeyFor } from "@/store/storage";
import { SyncEngine, type CloudStore, type SyncMeta, type SyncStatus } from "./syncEngine";
import { SyncContext, type SyncState } from "./syncContext";

const readMeta = (userId: string): SyncMeta => {
  try {
    const raw = localStorage.getItem(syncMetaKeyFor(userId));
    if (raw) {
      const m = JSON.parse(raw);
      return { base: typeof m.base === "number" ? m.base : null, dirty: m.dirty === true };
    }
  } catch {
    /* fall through */
  }
  return { base: null, dirty: false };
};

/**
 * Sits inside FinanceProvider for signed-in users. Loads the server copy before the app
 * renders, then mirrors every edit to the server in the background.
 */
export function CloudBoundary({ store, userId, children }: { store: CloudStore; userId: string; children: React.ReactNode }) {
  const { data, replaceAll } = useFinance();
  const dataRef = useRef(data);
  dataRef.current = data;
  const replaceRef = useRef(replaceAll);
  replaceRef.current = replaceAll;

  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [askLegacy, setAskLegacy] = useState<((adopt: boolean) => void) | null>(null);

  useEffect(() => {
    const e = new SyncEngine(store, {
      getData: () => dataRef.current,
      apply: (d) => replaceRef.current(d),
      loadMeta: () => readMeta(userId),
      saveMeta: (m) => {
        try {
          localStorage.setItem(syncMetaKeyFor(userId), JSON.stringify(m));
        } catch {
          /* cache is best-effort; the server copy is authoritative */
        }
      },
      onStatus: (s, d) => {
        setStatus(s);
        setDetail(d);
      },
    });
    setEngine(e);

    // Data saved on this device before accounts existed — never adopt it silently:
    // on a shared computer it may belong to someone else.
    const legacy = loadData().data;
    void e
      .init({
        legacy: legacy.settings.onboarded ? legacy : null,
        askLegacy: () => new Promise<boolean>((resolve) => setAskLegacy(() => resolve)),
      })
      .finally(() => setReady(true));

    const onOnline = () => void e.flush();
    const onVisibility = () => void (document.visibilityState === "visible" ? e.refresh() : e.flush());
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      e.dispose();
    };
    // The store/user are fixed for the life of this boundary (App keys it by user id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror user edits to the server. Changes that came *from* the server are skipped.
  const lastSeen = useRef(data);
  useEffect(() => {
    if (!engine || data === lastSeen.current) return;
    lastSeen.current = data;
    if (data === engine.applied) return;
    engine.notifyChange();
  }, [data, engine]);

  const value = useMemo<SyncState>(
    () => ({
      enabled: true,
      status,
      detail,
      flush: async () => {
        await engine?.flush();
      },
      hasUnsynced: () => !!engine?.hasUnsynced,
    }),
    [engine, status, detail]
  );

  // Couldn't reach the server and there's nothing on this device to show.
  const unreachable = ready && !data.settings.onboarded && (status === "offline" || status === "error") && !askLegacy;
  const gate = !ready ? (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
      Loading your data…
    </div>
  ) : unreachable ? (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="mb-3 text-5xl">📡</div>
          <h1 className="text-xl font-semibold">Can't load your data</h1>
          <p className="mt-1 text-sm text-muted-foreground">{detail ?? "Check your connection and try again."}</p>
          <Button className="mt-4" onClick={() => void engine?.init()}>
            Try again
          </Button>
        </div>
      </div>
  ) : null;

  const remote = engine?.conflictRemote;
  return (
    <SyncContext.Provider value={value}>
      {gate ?? children}

      <AlertDialog open={askLegacy !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add the data on this device to your account?</AlertDialogTitle>
            <AlertDialogDescription>
              We found accounts and transactions saved in this browser from before you signed in. If they're yours, add them so they sync everywhere.
              If this is a shared computer and they belong to someone else, choose "Not mine".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                askLegacy?.(false);
                setAskLegacy(null);
              }}
            >
              Not mine
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                askLegacy?.(true);
                setAskLegacy(null);
              }}
            >
              Add to my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={status === "conflict"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your data changed on another device</AlertDialogTitle>
            <AlertDialogDescription>
              This device has edits that haven't synced, and your account was updated elsewhere in the meantime. Choose which version to keep — the other one is replaced.
              {remote && (
                <span className="mt-2 block text-foreground">
                  Other device: {remote.data.transactions.length} transactions · This device: {data.transactions.length} transactions
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => void engine?.resolve("remote")}>Use the other device's version</AlertDialogCancel>
            <AlertDialogAction onClick={() => void engine?.resolve("local")}>Keep this device's version</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SyncContext.Provider>
  );
}
