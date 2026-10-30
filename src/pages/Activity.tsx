import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, MonthSwitcher, PageHeader } from "@/components/common";
import { TransactionRow } from "@/components/TransactionRow";
import { useTransactionDialog } from "@/components/TransactionDialog";
import { currentMonth, friendlyDate } from "@/domain/dates";
import type { Transaction } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

const TYPES = [
  { v: "all", l: "All" },
  { v: "expense", l: "Spent" },
  { v: "income", l: "Earned" },
  { v: "transfer", l: "Transfers" },
] as const;

const ALL = "__all__";

export default function Activity() {
  const { data, fmt } = useFinance();
  const { openAdd } = useTransactionDialog();
  const [month, setMonth] = useState(currentMonth());
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["v"]>("all");
  const [account, setAccount] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const searching = q.trim().length > 0;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const accName = new Map(data.accounts.map((a) => [a.id, a.name.toLowerCase()]));
    return data.transactions
      .filter((t) => {
        if (!searching && !t.date.startsWith(month)) return false;
        if (type !== "all" && t.type !== type) return false;
        if (account !== ALL && t.accountId !== account && t.toAccountId !== account) return false;
        if (category !== ALL && t.category !== category) return false;
        if (needle) {
          const hay = `${t.note ?? ""} ${t.category ?? ""} ${accName.get(t.accountId) ?? ""} ${t.amount}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [data, month, q, type, account, category, searching]);

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return [...m.entries()];
  }, [filtered]);

  const totals = useMemo(() => {
    let inn = 0;
    let out = 0;
    for (const t of filtered) {
      if (t.type === "income") inn += t.amount;
      else if (t.type === "expense") out += t.amount;
    }
    return { inn, out };
  }, [filtered]);

  const filtersActive = type !== "all" || account !== ALL || category !== ALL || searching;
  const clear = () => {
    setQ("");
    setType("all");
    setAccount(ALL);
    setCategory(ALL);
  };
  const usedCategories = [...new Set(data.transactions.map((t) => t.category).filter(Boolean))] as string[];

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={searching ? "Searching all months" : undefined}
        actions={!searching && <MonthSwitcher month={month} onChange={setMonth} />}
      />

      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes, categories, accounts, amounts…"
            className="pl-9 pr-9"
            aria-label="Search transactions"
          />
          {q && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setQ("")} aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Type">
            {TYPES.map((t) => (
              <button
                key={t.v}
                onClick={() => setType(t.v)}
                aria-pressed={type === t.v}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  type === t.v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.l}
              </button>
            ))}
          </div>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs" aria-label="Account filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {data.accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-auto min-w-[8rem] text-xs" aria-label="Category filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {usedCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="tabular mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
          </span>
          {totals.inn > 0 && <span className="text-success">In {fmt(totals.inn)}</span>}
          {totals.out > 0 && <span>Out {fmt(totals.out)}</span>}
        </div>
      )}

      {groups.length === 0 ? (
        data.transactions.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="No transactions yet"
            body="Log your first one — the + button (or the N key) is always one tap away."
            action={<Button onClick={() => openAdd()}>Add transaction</Button>}
          />
        ) : (
          <EmptyState
            emoji="🔍"
            title={filtersActive ? "Nothing matches" : "Nothing this month"}
            body={filtersActive ? "Try removing a filter or searching for something else." : "No transactions recorded in this month yet."}
            action={filtersActive ? <Button variant="outline" onClick={clear}>Clear filters</Button> : <Button onClick={() => openAdd()}>Add transaction</Button>}
          />
        )
      ) : (
        <div className="space-y-4">
          {groups.map(([date, txns]) => {
            const dayOut = txns.reduce((s, t) => (t.type === "expense" ? s + t.amount : s), 0);
            return (
              <section key={date}>
                <div className="mb-1 flex items-baseline justify-between px-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{friendlyDate(date)}</h2>
                  {dayOut > 0 && <span className="tabular text-xs text-muted-foreground">−{fmt(dayOut)}</span>}
                </div>
                <div className="rounded-xl border bg-card p-1">
                  {txns.map((t) => (
                    <TransactionRow key={t.id} tx={t} showDate={searching} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
