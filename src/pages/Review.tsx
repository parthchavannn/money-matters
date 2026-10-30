import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, EmptyState, PageHeader, SectionTitle, Stat } from "@/components/common";
import { balancesAsOf, budgetLines, spendByCategory, summarizeMonth } from "@/domain/calc";
import { currentMonth, monthEnd, monthLabel, shiftMonth, todayISO } from "@/domain/dates";
import { ACCOUNT_KINDS, isLiability } from "@/domain/meta";
import { reviewDue } from "@/domain/calc";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Month-end review: see how the month went, then make every account match reality.
 * Differences become labelled adjustments — never silently counted as income or spending.
 */
export default function Review() {
  const { data, fmt, reconcile } = useFinance();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const today = todayISO();

  const requested = params.get("month");
  const month = requested && MONTH_RE.test(requested) ? requested : reviewDue(data, today) ?? shiftMonth(currentMonth(), -1);
  const asOf = monthEnd(month) < today ? monthEnd(month) : today;
  const alreadyDone = data.reviewedMonths.includes(month);

  const accounts = data.accounts.filter((a) => !a.archived && a.openingDate <= asOf);
  const expected = useMemo(() => balancesAsOf(accounts, data.transactions, asOf), [accounts, data.transactions, asOf]);
  const summary = useMemo(() => summarizeMonth(data.transactions, month), [data.transactions, month]);
  const lines = useMemo(() => budgetLines(data.budgets, data.transactions, month, today), [data, month, today]);
  const topCat = useMemo(() => spendByCategory(data.transactions, month)[0], [data.transactions, month]);

  // What the user types, keyed by account. Empty = "matches what's tracked".
  const [typed, setTyped] = useState<Record<string, string>>({});
  const shown = (id: string) => {
    const a = accounts.find((x) => x.id === id)!;
    const e = expected.get(id) ?? 0;
    return isLiability(a.kind) ? -e : e;
  };
  const actualOf = (id: string) => {
    const t = typed[id];
    if (t === undefined || t.trim() === "") return shown(id);
    const n = parseFloat(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : shown(id);
  };
  const diffOf = (id: string) => Math.round((actualOf(id) - shown(id)) * 100) / 100;
  const changed = accounts.filter((a) => diffOf(a.id) !== 0);

  if (accounts.length === 0) {
    return <EmptyState emoji="🏦" title="Nothing to review yet" body="Add an account first." action={<Button asChild><Link to="/wealth?add=1">Add an account</Link></Button>} />;
  }

  const finish = () => {
    reconcile(
      month,
      changed.map((a) => ({ accountId: a.id, actual: actualOf(a.id) }))
    );
    toast.success(`${monthLabel(month)} closed`, {
      description: changed.length ? `${changed.length} balance${changed.length > 1 ? "s" : ""} adjusted.` : "Everything already matched.",
    });
    navigate("/");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link>
      </Button>
      <PageHeader title={`${monthLabel(month)} review`} subtitle={alreadyDone ? "Already reviewed — you can run it again any time." : "Two minutes to make sure your numbers are right."} />

      <div className="space-y-6">
        <section>
          <SectionTitle>1 · How the month went</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="In" value={fmt(summary.income)} tone={summary.income > 0 ? "good" : "default"} />
            <Stat label="Out" value={fmt(summary.expense)} />
            <Stat label="Saved" value={fmt(summary.saved)} tone={summary.saved < 0 ? "bad" : "good"} sub={summary.savingsRate !== null ? `${Math.round(summary.savingsRate)}%` : undefined} />
          </div>
          {topCat && <p className="mt-2 text-sm text-muted-foreground">Biggest category: <span className="font-medium text-foreground">{topCat.category}</span> · {fmt(topCat.amount)}</p>}
          {lines.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl border bg-card p-4">
              {lines.map((l) => (
                <div key={l.category}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{l.category}</span>
                    <span className={cn("tabular", l.status === "over" ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {fmt(l.spent)} / {fmt(l.limit)}
                    </span>
                  </div>
                  <Bar pct={l.pct} status={l.status} label={l.category} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>2 · Do your balances match reality?</SectionTitle>
          <p className="mb-3 text-sm text-muted-foreground">
            Open each bank / wallet / card as of {monthLabel(month)} end and enter the real number. Leave a field alone if it already matches.
          </p>
          <div className="divide-y rounded-xl border bg-card">
            {accounts.map((a) => {
              const liab = isLiability(a.kind);
              const d = diffOf(a.id);
              const netEffect = liab ? -d : d;
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                  <span className="text-lg" aria-hidden>{ACCOUNT_KINDS[a.kind].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="tabular text-xs text-muted-foreground">
                      Tracked {liab ? "owed" : "balance"}: {fmt(shown(a.id))}
                    </div>
                  </div>
                  <div className="w-40">
                    <Input
                      inputMode="decimal"
                      aria-label={`Actual ${liab ? "amount owed" : "balance"} for ${a.name}`}
                      placeholder={String(Math.round(shown(a.id) * 100) / 100)}
                      value={typed[a.id] ?? ""}
                      onChange={(e) => setTyped((t) => ({ ...t, [a.id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                      className="tabular text-right"
                    />
                    {d !== 0 && (
                      <div className={cn("tabular mt-0.5 text-right text-[11px]", netEffect >= 0 ? "text-success" : "text-destructive")}>
                        {fmt(netEffect, { sign: true })} unaccounted
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {changed.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Differences are saved as “Balance adjustment” entries. They don't count as income or spending — but a big one usually means a transaction is missing.
            </p>
          )}
        </section>

        <div className="sticky bottom-20 z-10 md:bottom-4">
          <Button size="lg" className="w-full shadow-lg" onClick={finish}>
            <PartyPopper className="mr-2 h-4 w-4" /> {changed.length ? `Adjust ${changed.length} & close ${monthLabel(month, true)}` : `Everything matches — close ${monthLabel(month, true)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
