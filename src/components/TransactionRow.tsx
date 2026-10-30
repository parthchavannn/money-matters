import { ArrowLeftRight, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { amountClass } from "@/components/common";
import type { Transaction } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { useTransactionDialog } from "@/components/TransactionDialog";

export function TransactionRow({ tx, showDate = false }: { tx: Transaction; showDate?: boolean }) {
  const { data, fmt } = useFinance();
  const { openEdit } = useTransactionDialog();
  const name = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? "Deleted account";
  const cat = data.categories.find((c) => c.name === tx.category);

  const isTransfer = tx.type === "transfer";
  const isAdjust = tx.type === "adjustment";
  const title = isTransfer
    ? `${name(tx.accountId)} → ${name(tx.toAccountId)}`
    : isAdjust
    ? "Balance adjustment"
    : tx.note || tx.category || "Transaction";
  const sub = isTransfer
    ? tx.note || "Transfer"
    : isAdjust
    ? `${name(tx.accountId)}${tx.note ? ` · ${tx.note}` : ""}`
    : `${tx.category ?? "Uncategorised"} · ${name(tx.accountId)}`;

  const signed =
    tx.type === "income" ? fmt(tx.amount, { sign: true, decimals: tx.amount % 1 !== 0 })
    : tx.type === "expense" ? fmt(-tx.amount, { sign: true, decimals: tx.amount % 1 !== 0 })
    : tx.type === "adjustment" ? fmt(tx.amount, { sign: true, decimals: tx.amount % 1 !== 0 })
    : fmt(tx.amount, { decimals: tx.amount % 1 !== 0 });

  return (
    <button
      type="button"
      onClick={() => !isAdjust && openEdit(tx)}
      disabled={isAdjust}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition",
        isAdjust ? "cursor-default" : "hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base" aria-hidden>
        {isTransfer ? <ArrowLeftRight className="h-4 w-4 text-muted-foreground" /> : isAdjust ? <Scale className="h-4 w-4 text-muted-foreground" /> : cat?.emoji ?? "🧾"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {showDate ? `${tx.date} · ` : ""}
          {sub}
        </span>
      </span>
      <span className={cn("tabular shrink-0 text-sm font-semibold", amountClass(tx.type, tx.amount))}>{signed}</span>
    </button>
  );
}
