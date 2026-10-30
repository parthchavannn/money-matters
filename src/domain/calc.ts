import {
  addDaysISO,
  advanceDate,
  currentMonth,
  daysBetween,
  daysInMonth,
  monthEnd,
  monthLabel,
  monthOf,
  monthRange,
  shiftMonth,
  todayISO,
} from "./dates";
import { ACCOUNT_KINDS, isLiability } from "./meta";
import type {
  Account,
  AppData,
  Goal,
  ISODate,
  MonthKey,
  Recurring,
  Transaction,
} from "./types";

/* ───────────────────────── balances & net worth ───────────────────────── */

/** Balance of every account on `asOf` (inclusive). Liabilities come back negative. */
export function balancesAsOf(
  accounts: Account[],
  txns: Transaction[],
  asOf: ISODate = "9999-12-31"
): Map<string, number> {
  const bal = new Map<string, number>();
  const opened = new Map<string, ISODate>();
  for (const a of accounts) {
    bal.set(a.id, a.openingBalance);
    opened.set(a.id, a.openingDate);
  }
  const apply = (id: string | undefined, date: ISODate, delta: number) => {
    if (!id || !bal.has(id) || date < opened.get(id)!) return;
    bal.set(id, bal.get(id)! + delta);
  };
  for (const t of txns) {
    if (t.date > asOf) continue;
    switch (t.type) {
      case "income":
      case "adjustment":
        apply(t.accountId, t.date, t.amount);
        break;
      case "expense":
        apply(t.accountId, t.date, -t.amount);
        break;
      case "transfer":
        apply(t.accountId, t.date, -t.amount);
        apply(t.toAccountId, t.date, t.amount);
        break;
    }
  }
  return bal;
}

export interface NetWorth {
  assets: number;
  liabilities: number; // positive number = amount owed
  net: number;
}

export function netWorthAsOf(
  accounts: Account[],
  txns: Transaction[],
  asOf: ISODate = "9999-12-31"
): NetWorth {
  const live = accounts.filter((a) => !a.archived && a.openingDate <= asOf);
  const bal = balancesAsOf(live, txns, asOf);
  let assets = 0;
  let liabilities = 0;
  for (const a of live) {
    const b = bal.get(a.id) ?? 0;
    if (isLiability(a.kind)) liabilities += -b;
    else assets += b;
  }
  return { assets, liabilities, net: assets - liabilities };
}

/** Net worth at the end of each of the last `n` months (the current month ends today). */
export function netWorthSeries(
  accounts: Account[],
  txns: Transaction[],
  n = 12,
  today: ISODate = todayISO()
) {
  return monthRange(n, monthOf(today)).map((m) => {
    const end = monthEnd(m) < today ? monthEnd(m) : today;
    return { month: m, ...netWorthAsOf(accounts, txns, end) };
  });
}

/* ───────────────────────── monthly numbers ───────────────────────── */

export const inMonth = (txns: Transaction[], month: MonthKey) =>
  txns.filter((t) => t.date.startsWith(month));

export interface MonthSummary {
  month: MonthKey;
  income: number;
  expense: number;
  saved: number;
  /** null when there is no income to compare against */
  savingsRate: number | null;
  count: number;
}

export function summarizeMonth(txns: Transaction[], month: MonthKey): MonthSummary {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const t of txns) {
    if (!t.date.startsWith(month)) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
    else continue;
    count++;
  }
  const saved = income - expense;
  return { month, income, expense, saved, savingsRate: income > 0 ? (saved / income) * 100 : null, count };
}

export function spendByCategory(txns: Transaction[], month: MonthKey) {
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" || !t.date.startsWith(month)) continue;
    const c = t.category || "Other";
    totals.set(c, (totals.get(c) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Spending for the days 1..`uptoDay` of `month` — for fair like-for-like comparison with a partial month. */
function expenseUpToDay(txns: Transaction[], month: MonthKey, uptoDay: number) {
  const cap = Math.min(uptoDay, daysInMonth(month));
  const limit = `${month}-${String(cap).padStart(2, "0")}`;
  return txns.reduce(
    (s, t) => (t.type === "expense" && t.date.startsWith(month) && t.date <= limit ? s + t.amount : s),
    0
  );
}

/* ───────────────────────── budgets ───────────────────────── */

export interface BudgetLine {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  /** where the month lands at the current pace (current month only, else = spent) */
  projected: number;
  status: "ok" | "near" | "over";
}

export function budgetLines(
  budgets: Record<string, number>,
  txns: Transaction[],
  month: MonthKey,
  today: ISODate = todayISO()
): BudgetLine[] {
  const spend = new Map(spendByCategory(txns, month).map((s) => [s.category, s.amount]));
  const isCurrent = month === monthOf(today);
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth(month);
  const total = daysInMonth(month);
  return Object.entries(budgets)
    .filter(([, limit]) => limit > 0)
    .map(([category, limit]) => {
      const spent = spend.get(category) ?? 0;
      const pct = (spent / limit) * 100;
      const projected = isCurrent && elapsed > 0 ? (spent / elapsed) * total : spent;
      const status: BudgetLine["status"] = spent > limit ? "over" : pct >= 85 ? "near" : "ok";
      return { category, limit, spent, remaining: limit - spent, pct, projected, status };
    })
    .sort((a, b) => b.pct - a.pct);
}

/* ───────────────────────── recurring bills & income ───────────────────────── */

export const dueRecurring = (items: Recurring[], today: ISODate = todayISO()) =>
  items.filter((r) => r.active && r.nextDate <= today).sort((a, b) => a.nextDate.localeCompare(b.nextDate));

export const upcomingRecurring = (items: Recurring[], today: ISODate = todayISO(), days = 14) => {
  const end = addDaysISO(today, days);
  return items
    .filter((r) => r.active && r.nextDate > today && r.nextDate <= end)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
};

/** Monthly-equivalent cost of a schedule. */
export const monthlyEquivalent = (r: Pick<Recurring, "amount" | "frequency">) =>
  r.frequency === "weekly" ? (r.amount * 52) / 12 : r.frequency === "yearly" ? r.amount / 12 : r.amount;

export const nextAfter = (r: Recurring) => advanceDate(r.nextDate, r.frequency, r.anchorDay);

/* ───────────────────────── goals ───────────────────────── */

export interface GoalProgress {
  pct: number;
  remaining: number;
  done: boolean;
  /** needed per month to hit the target date; null with no date or when done */
  monthlyNeeded: number | null;
  overdue: boolean;
}

export function goalProgress(goal: Goal, today: ISODate = todayISO()): GoalProgress {
  const remaining = Math.max(0, goal.target - goal.saved);
  const done = goal.target > 0 && goal.saved >= goal.target;
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  let monthlyNeeded: number | null = null;
  let overdue = false;
  if (goal.targetDate && !done) {
    const days = daysBetween(today, goal.targetDate);
    if (days < 0) overdue = true;
    else monthlyNeeded = remaining / Math.max(1, days / 30.4);
  }
  return { pct, remaining, done, monthlyNeeded, overdue };
}

/* ───────────────────────── insights ───────────────────────── */

export interface Insight {
  id: string;
  tone: "good" | "warn" | "info";
  title: string;
  detail: string;
  href?: string;
}

/** Rule-based, explainable nudges. Everything is computed from the user's own data. */
export function buildInsights(
  data: AppData,
  fmt: (n: number) => string,
  today: ISODate = todayISO()
): Insight[] {
  const out: Insight[] = [];
  const month = monthOf(today);
  const prev = shiftMonth(month, -1);
  const day = Number(today.slice(8, 10));
  const { transactions, budgets, recurring, accounts } = data;

  if (transactions.length > 0) {
    const last = transactions.reduce((m, t) => (t.date > m ? t.date : m), "0000-00-00");
    const gap = daysBetween(last, today);
    if (gap >= 3) {
      out.push({
        id: "stale",
        tone: "info",
        title: `Nothing logged for ${gap} days`,
        detail: "Add what you've spent since — it takes seconds and keeps your numbers honest.",
      });
    }
  }

  const overdue = dueRecurring(recurring, today).filter((r) => r.nextDate < today);
  if (overdue.length) {
    out.push({
      id: "overdue",
      tone: "warn",
      title: `${overdue.length} bill${overdue.length > 1 ? "s" : ""} overdue`,
      detail: overdue.map((r) => r.note || r.category).slice(0, 3).join(", "),
      href: "/plan?tab=bills",
    });
  }

  const lines = budgetLines(budgets, transactions, month, today);
  const over = lines.filter((l) => l.status === "over");
  if (over.length) {
    out.push({
      id: "over",
      tone: "warn",
      title: `Over budget on ${over.map((l) => l.category).slice(0, 2).join(" & ")}`,
      detail: `${fmt(over.reduce((s, l) => s + (l.spent - l.limit), 0))} past the limit this month.`,
      href: "/plan?tab=budget",
    });
  }
  const pacing = lines.filter((l) => l.status !== "over" && l.projected > l.limit * 1.05 && day >= 5);
  if (pacing.length) {
    const l = pacing[0];
    out.push({
      id: "pace",
      tone: "warn",
      title: `${l.category} is on pace to overshoot`,
      detail: `At this rate you'll spend ~${fmt(l.projected)} against a ${fmt(l.limit)} budget.`,
      href: "/plan?tab=budget",
    });
  }

  if (day >= 5) {
    const thisSoFar = expenseUpToDay(transactions, month, day);
    const lastSoFar = expenseUpToDay(transactions, prev, day);
    if (lastSoFar > 0 && thisSoFar > lastSoFar * 1.2) {
      out.push({
        id: "faster",
        tone: "warn",
        title: "Spending faster than last month",
        detail: `${fmt(thisSoFar)} so far vs ${fmt(lastSoFar)} by this day in ${monthLabel(prev)}.`,
        href: "/insights",
      });
    } else if (lastSoFar > 0 && thisSoFar < lastSoFar * 0.85) {
      out.push({
        id: "slower",
        tone: "good",
        title: "Spending less than last month",
        detail: `${fmt(lastSoFar - thisSoFar)} lower than this point in ${monthLabel(prev)}.`,
        href: "/insights",
      });
    }
  }

  const cur = summarizeMonth(transactions, month);
  if (cur.savingsRate !== null && cur.income > 0 && day >= 10) {
    if (cur.savingsRate >= 20) {
      out.push({
        id: "saving",
        tone: "good",
        title: `Saving ${Math.round(cur.savingsRate)}% of income`,
        detail: "You're above the 20% rule-of-thumb this month. Keep it up.",
      });
    } else if (cur.savingsRate < 0) {
      out.push({
        id: "deficit",
        tone: "warn",
        title: "Spending more than you've earned",
        detail: `${fmt(-cur.saved)} more out than in this month so far.`,
        href: "/insights",
      });
    }
  }

  const lastMonths = monthRange(4, shiftMonth(month, -1)).slice(1); // 3 full months before this one
  const spends = lastMonths.map((m) => summarizeMonth(transactions, m).expense).filter((v) => v > 0);
  if (spends.length >= 2) {
    const avg = spends.reduce((s, v) => s + v, 0) / spends.length;
    const bal = balancesAsOf(accounts, transactions);
    const liquid = accounts
      .filter((a) => !a.archived && ACCOUNT_KINDS[a.kind].liquid)
      .reduce((s, a) => s + (bal.get(a.id) ?? 0), 0);
    const months = liquid / avg;
    out.push({
      id: "runway",
      tone: months >= 6 ? "good" : months >= 3 ? "info" : "warn",
      title: `Cash cushion covers ${months.toFixed(1)} months`,
      detail: `Liquid money ÷ your ${fmt(avg)} average monthly spend. Aim for 3–6 months.`,
      href: "/wealth",
    });
  }

  const reviewMonth = reviewDue(data, today);
  if (reviewMonth) {
    out.push({
      id: "review",
      tone: "info",
      title: `${monthLabel(reviewMonth)} review is ready`,
      detail: "Confirm each balance and close the month — 2 minutes.",
      href: "/review",
    });
  }

  return out;
}

/** The month that should be reviewed now, if any: last month in its first 10 days, or this month in its last 3. */
export function reviewDue(data: AppData, today: ISODate = todayISO()): MonthKey | null {
  if (data.accounts.length === 0) return null;
  const month = monthOf(today);
  const day = Number(today.slice(8, 10));
  const reviewed = new Set(data.reviewedMonths);
  const prev = shiftMonth(month, -1);
  const hasHistory = data.transactions.some((t) => t.date.startsWith(prev));
  if (day <= 10 && hasHistory && !reviewed.has(prev)) return prev;
  if (daysInMonth(month) - day <= 2 && !reviewed.has(month)) return month;
  return null;
}

export { currentMonth };
