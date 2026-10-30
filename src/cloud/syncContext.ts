import { createContext, useContext } from "react";
import type { SyncStatus } from "./syncEngine";

export interface SyncState {
  /** false in local-only mode */
  enabled: boolean;
  status: SyncStatus;
  detail?: string;
  /** Push anything pending now. Resolves once the attempt has finished. */
  flush: () => Promise<void>;
  /** True while edits exist that the server hasn't confirmed. */
  hasUnsynced: () => boolean;
}

export const LOCAL_ONLY: SyncState = {
  enabled: false,
  status: "idle",
  flush: async () => {},
  hasUnsynced: () => false,
};

export const SyncContext = createContext<SyncState>(LOCAL_ONLY);
export const useSync = () => useContext(SyncContext);
