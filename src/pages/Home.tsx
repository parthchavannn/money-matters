import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, ClipboardCheck, Info, SkipForward, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bar, EmptyState, SectionTitle, Stat } from "@/components/common";
import { TransactionRow } from "@/components/TransactionRow";
import { useTransactionDialog } from "@/components/TransactionDialog";
import {
  buildInsights,
  budgetLines,
  dueRecurring,
  goalProgress,
  netWorthAsOf,
  reviewDue,
  summarizeMonth,
  upcomingRecurring,
} from "@/domain/calc";
import { currentMonth, friendlyDate, monthEnd, monthLabel, shiftMonth, todayISO } from "@/domain/dates";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function Home() {
  const { data, fmt, payRecurring, skipRecurring } = useFinance();
  const { openAdd } = useTransactionDialog();
  const today = todayISO();
  const month = currentMonth();

  const view = useMemo(() => {
    const { transactions, accounts, budgets, recurring } = data;
    const nw = netWorthAsOf(accounts, transactions);
    const lastMonthEnd = monthEnd(shiftMonth(month, -1));
    const hasLast = accounts.some((a) => !a.archived && a.openingDate <= lastMonthEnd);
    const nwPrev = hasLast ? netWorthAsOf(accounts, transactions, lastMonthEnd) : null;
    return {
      nw,
      nwChange: nwPrev ? nw.net - nwPrev.net : null,
      cur: summarizeMonth(transactions, month),
      prev: summarizeMonth(transactions, shiftMonth(month, -1)),
      budget: budgetLines(budgets, transactions, month, today),
      due: dueRecurring(recurring, today),
      upcoming: upcomingRecurring(recurring, today, 14),
      insights: buildInsights(data, (n) => fmt(n), today),
      review: reviewDue(data, today),
      recent: [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6),
    };
  }, [data, month, today, fmt]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = data.settings.name.trim().split(" ")[0];
  const { nw, cur, budget } = view;
  const budgetTotal = budget.reduce((s, l) => s + l.limit, 0);
  const budgetSpent = budget.reduce((s, l) => s + l.spent, 0);
  const activeGoals = data.goals.filter((g) => !goalProgress(g, today).done).slice(0, 3);

  if (data.accounts.length === 0) {
    return (
      <EmptyState
        emoji="👋"
        title="Let's add your first account"
        body="Start with where your money lives — a bank account, cash, a card. Everything else builds on that."
        action={
          <Button asChild>
            <Link to="/wealth?add=1">Add an account</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{format(parseISO(today), "EEEE, d MMMM")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
      </div>

      {/* Net worth */}
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm sm:p-6">
        <div className="text-xs font-medium uppercase tracking-wide opacity-80">Net worth</div>
        <div className="tabular mt-1 text-3xl font-semibold sm:text-4xl">{fmt(nw.net)}</div>
        <div className="mt-1 text-sm opacity-90">
          {view.nwChange === null ? (
            "Track a full month to see your trend"
          ) : (
            <>
              {fmt(view.nwChange, { sign: true })} since {monthLabel(shiftMonth(month, -1), true)} month-end
            </>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary-foreground/20 pt-3 text-sm">
          <div>
            <div className="opacity-75">Assets</div>
            <div className="tabular font-semibold">{fmt(nw.assets)}</div>
          </div>
          <div>
            <div className="opacity-75">Owed</div>
            <div className="tabular font-semibold">{fmt(nw.liabilities)}</div>
          </div>
        </div>
      </section>

      {/* This month */}
      <section>
        <SectionTitle
          action={
            <Link to="/insights" className="text-xs font-medium text-primary hover:underline">
              Details
            </Link>
          }
        >
          {monthLabel(month)}
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="In" value={fmt(cur.income)} tone={cur.income > 0 ? "good" : "default"} />
          <Stat
            label="Out"
            value={fmt(cur.expense)}
            sub={view.prev.expense > 0 ? `${fmt(view.prev.expense)} last month` : undefined}
          />
          <Stat
            label="Saved"
            value={fmt(cur.saved)}
            tone={cur.saved < 0 ? "bad" : cur.saved > 0 ? "good" : "default"}
            sub={cur.savingsRate !== null ? `${Math.round(cur.savingsRate)}% of income` : undefined}
          />
        </div>
      </section>

      {/* Needs attention */}
      {(view.due.length > 0 || view.review) && (
        <section>
          <SectionTitle>Needs attention</SectionTitle>
          <div className="space-y-2">
            {view.review && (
              <Link
                to={`/review?month=${view.review}`}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent p-3 text-accent-foreground hover:border-primary"
              >
                <ClipboardCheck className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-sm">
                  <span className="font-semibold">{monthLabel(view.review)} review is ready.</span> Confirm balances and close the month.
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {view.due.map((r) => {
              const late = r.nextDate < today;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <span className="text-xl" aria-hidden>
                    {data.categories.find((c) => c.name === r.category)?.emoji ?? "🧾"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.note || r.category}</div>
                    <div className={cn("text-xs", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {late ? `Overdue · ${friendlyDate(r.nextDate, today)}` : "Due today"} · {fmt(r.amount)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      payRecurring(r.id);
                      toast.success(r.type === "income" ? "Income recorded" : "Marked as paid", { description: r.note || r.category });
                    }}
                  >
                    <Check className="mr-1 h-4 w-4" /> {r.type === "income" ? "Received" : "Paid"}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Skip this one" title="Skip this one" onClick={() => skipRecurring(r.id)}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights */}
      {view.insights.length > 0 && (
        <section>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Worth knowing
            </span>
          </SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {view.insights.slice(0, 4).map((i) => {
              const Icon = i.tone === "warn" ? AlertTriangle : i.tone === "good" ? Check : Info;
              const body = (
                <div
                  className={cn(
                    "flex h-full gap-3 rounded-xl border bg-card p-3",
                    i.href && "transition hover:border-primary/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      i.tone === "warn" ? "text-warning" : i.tone === "good" ? "text-success" : "text-muted-foreground"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{i.detail}</div>
                  </div>
                </div>
              );
              return i.href ? (
                <Link key={i.id} to={i.href}>
                  {body}
                </Link>
              ) : (
                <div key={i.id}>{body}</div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <section>
          <SectionTitle
            action={
              <Link to="/plan?tab=budget" className="text-xs font-medium text-primary hover:underline">
                {budget.length ? "Manage" : "Set up"}
              </Link>
            }
          >
            Budget
          </SectionTitle>
          {budget.length === 0 ? (
            <EmptyState
              emoji="🎯"
              title="No budgets yet"
              body="Set limits for the categories you want to keep an eye on."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/plan?tab=budget">Set a budget</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">Overall</span>
                  <span className="tabular text-muted-foreground">
                    {fmt(budgetSpent)} of {fmt(budgetTotal)}
                  </span>
                </div>
                <Bar pct={(budgetSpent / budgetTotal) * 100} status={budgetSpent > budgetTotal ? "over" : budgetSpent / budgetTotal > 0.85 ? "near" : "ok"} label="Overall budget" />
              </div>
              {budget.slice(0, 4).map((l) => (
                <div key={l.category}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{l.category}</span>
                    <span className={cn("tabular", l.status === "over" ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {l.remaining >= 0 ? `${fmt(l.remaining)} left` : `${fmt(-l.remaining)} over`}
                    </span>
                  </div>
                  <Bar pct={l.pct} status={l.status} label={l.category} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Goals + upcoming */}
        <section className="space-y-6">
          <div>
            <SectionTitle
              action={
                <Link to="/plan?tab=goals" className="text-xs font-medium text-primary hover:underline">
                  {data.goals.length ? "All goals" : "Add goal"}
                </Link>
              }
            >
              Goals
            </SectionTitle>
            {activeGoals.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {data.goals.length ? "All goals reached 🎉" : "Saving for something? Add a goal and watch it fill up."}
              </p>
            ) : (
              <div className="space-y-3 rounded-xl border bg-card p-4">
                {activeGoals.map((g) => {
                  const p = goalProgress(g, today);
                  return (
                    <div key={g.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>
                          {g.emoji} {g.name}
                        </span>
                        <span className="tabular text-xs text-muted-foreground">{Math.round(p.pct)}%</span>
                      </div>
                      <Bar pct={p.pct} label={g.name} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {view.upcoming.length > 0 && (
            <div>
              <SectionTitle>Coming up</SectionTitle>
              <div className="divide-y rounded-xl border bg-card">
                {view.upcoming.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.note || r.category}</div>
                      <div className="text-xs text-muted-foreground">{friendlyDate(r.nextDate, today)}</div>
                    </div>
                    <div className={cn("tabular font-medium", r.type === "income" && "text-success")}>
                      {r.type === "income" ? "+" : ""}
                      {fmt(r.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Recent */}
      <section>
        <SectionTitle
          action={
            <Link to="/activity" className="text-xs font-medium text-primary hover:underline">
              See all
            </Link>
          }
        >
          Recent activity
        </SectionTitle>
        {view.recent.length === 0 ? (
          <EmptyState
            emoji="✍️"
            title="Nothing logged yet"
            body="Add your first expense or income — press N anywhere, or tap the + button."
            action={<Button onClick={() => openAdd()}>Add transaction</Button>}
          />
        ) : (
          <div className="rounded-xl border bg-card p-1">
            {view.recent.map((t) => (
              <TransactionRow key={t.id} tx={t} showDate />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
