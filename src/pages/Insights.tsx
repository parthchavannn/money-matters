import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar as RBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, ClipboardCheck, Info } from "lucide-react";
import { Bar, EmptyState, MonthSwitcher, PageHeader, SectionTitle, Stat } from "@/components/common";
import { TransactionRow } from "@/components/TransactionRow";
import { buildInsights, spendByCategory, summarizeMonth } from "@/domain/calc";
import { currentMonth, monthLabel, monthRange, shiftMonth } from "@/domain/dates";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Insights() {
  const { data, fmt, fmtCompact } = useFinance();
  const [month, setMonth] = useState(currentMonth());
  const isCurrent = month === currentMonth();

  const v = useMemo(() => {
    const t = data.transactions;
    const cur = summarizeMonth(t, month);
    const prev = summarizeMonth(t, shiftMonth(month, -1));
    const cats = spendByCategory(t, month);
    const prevCats = new Map(spendByCategory(t, shiftMonth(month, -1)).map((c) => [c.category, c.amount]));
    const trend = monthRange(6, month).map((m) => {
      const s = summarizeMonth(t, m);
      return { label: monthLabel(m, true), Income: Math.round(s.income), Spent: Math.round(s.expense) };
    });
    const top = t.filter((x) => x.type === "expense" && x.date.startsWith(month)).sort((a, b) => b.amount - a.amount).slice(0, 5);
    return { cur, prev, cats, prevCats, trend, top };
  }, [data.transactions, month]);

  const insights = useMemo(() => (isCurrent ? buildInsights(data, (n) => fmt(n)) : []), [data, fmt, isCurrent]);
  const catTotal = v.cats.reduce((s, c) => s + c.amount, 0);
  const hasAny = data.transactions.length > 0;
  const delta = v.prev.expense > 0 ? ((v.cur.expense - v.prev.expense) / v.prev.expense) * 100 : null;

  return (
    <div>
      <PageHeader title="Insights" subtitle="Where your money went, and how it's trending." actions={<MonthSwitcher month={month} onChange={setMonth} />} />

      {!hasAny ? (
        <EmptyState emoji="📊" title="Insights appear as you log" body="Add a few transactions and this page fills with trends, category breakdowns and nudges." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Stat label="Income" value={fmt(v.cur.income)} tone={v.cur.income > 0 ? "good" : "default"} />
            <Stat
              label="Spent"
              value={fmt(v.cur.expense)}
              sub={
                delta === null ? undefined : (
                  <span className={cn("inline-flex items-center gap-0.5", delta > 0 ? "text-destructive" : "text-success")}>
                    {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(Math.round(delta))}% vs last month
                  </span>
                )
              }
            />
            <Stat label="Saved" value={fmt(v.cur.saved)} tone={v.cur.saved < 0 ? "bad" : v.cur.saved > 0 ? "good" : "default"} />
            <Stat label="Savings rate" value={v.cur.savingsRate === null ? "—" : `${Math.round(v.cur.savingsRate)}%`} sub={v.cur.savingsRate === null ? "No income logged" : "of income kept"} tone={v.cur.savingsRate !== null && v.cur.savingsRate < 0 ? "bad" : "default"} />
          </div>

          {insights.length > 0 && (
            <section>
              <SectionTitle>Right now</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                {insights.map((i) => {
                  const Icon = i.tone === "warn" ? AlertTriangle : i.tone === "good" ? Check : i.id === "review" ? ClipboardCheck : Info;
                  const inner = (
                    <div className="flex h-full gap-3 rounded-xl border bg-card p-3">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", i.tone === "warn" ? "text-warning" : i.tone === "good" ? "text-success" : "text-muted-foreground")} />
                      <div>
                        <div className="text-sm font-medium">{i.title}</div>
                        <div className="text-xs text-muted-foreground">{i.detail}</div>
                      </div>
                    </div>
                  );
                  return i.href ? <Link key={i.id} to={i.href} className="hover:[&>div]:border-primary/50">{inner}</Link> : <div key={i.id}>{inner}</div>;
                })}
              </div>
            </section>
          )}

          <section className="rounded-xl border bg-card p-4">
            <SectionTitle>Income vs spending, last 6 months</SectionTitle>
            <div className="h-56 w-full" role="img" aria-label="Bar chart of income and spending for the last six months">
              <ResponsiveContainer>
                <BarChart data={v.trend} margin={{ left: 0, right: 4, top: 8 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickLine={false} axisLine={false} width={52} fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(x) => fmtCompact(x)} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(val: number) => fmt(val)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <RBar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <RBar dataKey="Spent" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <SectionTitle>Spending by category</SectionTitle>
              {v.cats.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No spending in {monthLabel(month)}.</p>
              ) : (
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  {v.cats.map((c) => {
                    const prev = v.prevCats.get(c.category);
                    const chg = prev ? ((c.amount - prev) / prev) * 100 : null;
                    const emoji = data.categories.find((x) => x.name === c.category)?.emoji ?? "🧾";
                    return (
                      <div key={c.category}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate">
                            <span aria-hidden>{emoji}</span> {c.category}
                          </span>
                          <span className="tabular shrink-0">
                            <span className="font-medium">{fmt(c.amount)}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">{Math.round((c.amount / catTotal) * 100)}%</span>
                          </span>
                        </div>
                        <Bar pct={(c.amount / v.cats[0].amount) * 100} label={c.category} className="h-1.5" />
                        {chg !== null && Math.abs(chg) >= 10 && (
                          <div className={cn("mt-0.5 text-[11px]", chg > 0 ? "text-destructive" : "text-success")}>
                            {chg > 0 ? "▲" : "▼"} {Math.abs(Math.round(chg))}% vs last month
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <SectionTitle>Biggest expenses</SectionTitle>
              {v.top.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nothing to show yet.</p>
              ) : (
                <div className="rounded-xl border bg-card p-1">
                  {v.top.map((t) => <TransactionRow key={t.id} tx={t} showDate />)}
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={`/review?month=${month}`}><ClipboardCheck className="mr-1.5 h-4 w-4" /> Review {monthLabel(month)}</Link>
              </Button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
