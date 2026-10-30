import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currentMonth, monthLabel, shiftMonth } from "@/domain/dates";
import type { MonthKey } from "@/domain/types";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
  className,
}: {
  emoji: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-3 text-4xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="font-medium">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type Tone = "default" | "good" | "bad" | "warn";
const toneText: Record<Tone, string> = {
  default: "text-foreground",
  good: "text-success",
  bad: "text-destructive",
  warn: "text-warning",
};

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-1 text-xl font-semibold sm:text-2xl", toneText[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Bar({
  pct,
  status = "ok",
  className,
  label,
}: {
  pct: number;
  status?: "ok" | "near" | "over" | "done";
  className?: string;
  label?: string;
}) {
  const color =
    status === "over" ? "bg-destructive" : status === "near" ? "bg-warning" : status === "done" ? "bg-success" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.min(100, pct))}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", color)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function MonthSwitcher({
  month,
  onChange,
  allowFuture = false,
}: {
  month: MonthKey;
  onChange: (m: MonthKey) => void;
  allowFuture?: boolean;
}) {
  const atCurrent = month >= currentMonth();
  return (
    <div className="inline-flex items-center rounded-lg border bg-card">
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        className="min-w-[8.5rem] px-1 text-center text-sm font-medium hover:text-primary"
        onClick={() => onChange(currentMonth())}
        title="Jump to this month"
      >
        {monthLabel(month)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        disabled={!allowFuture && atCurrent}
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** Colour + sign for a money amount in a list. */
export function amountClass(type: "income" | "expense" | "transfer" | "adjustment", amount = 0) {
  if (type === "income") return "text-success";
  if (type === "adjustment") return amount >= 0 ? "text-success" : "text-destructive";
  if (type === "transfer") return "text-muted-foreground";
  return "text-foreground";
}
