import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/cloud/syncContext";

/** Small, honest indicator of whether your latest edit is safely on the server. */
export default function SyncBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { enabled, status, detail, flush } = useSync();
  if (!enabled) return null;

  const view =
    status === "syncing" || status === "idle"
      ? { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Syncing…", tone: "text-muted-foreground" }
      : status === "synced"
      ? { icon: <Check className="h-3.5 w-3.5" />, text: "All changes saved", tone: "text-success" }
      : status === "offline"
      ? { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Offline — saved on this device", tone: "text-warning" }
      : status === "conflict"
      ? { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Needs your attention", tone: "text-warning" }
      : { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Couldn't sync — tap to retry", tone: "text-destructive" };

  return (
    <button
      type="button"
      onClick={() => void flush()}
      title={detail}
      aria-live="polite"
      className={cn("flex items-center gap-1.5 text-xs", view.tone, className)}
    >
      {view.icon}
      <span className={compact ? "sr-only" : undefined}>{view.text}</span>
    </button>
  );
}
