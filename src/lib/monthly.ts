export type AccountRow = {
  id: string;
  name: string;
  type: string;
  notes: string | null;
  is_active: boolean;
};

export type BalanceRow = {
  id: string;
  account_id: string;
  month: string;
  balance: number;
};

export type CheckinRow = {
  id: string;
  month: string;
  income: number;
  note: string | null;
};

export type MonthSummary = {
  month: string; // yyyy-MM-01
  label: string; // e.g. "Sep 2026"
  totalBalance: number;
  income: number;
  /** balance change vs previous recorded month (null when no previous month) */
  saved: number | null;
  /** income - saved (null when saved is null) */
  spent: number | null;
  savingsRate: number | null;
  note: string | null;
  hasCheckin: boolean;
};

export const ASSET_TYPES = [
  { value: "bank", label: "Bank account" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet / UPI" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function previousMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 2, 1));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function lastNMonthKeys(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))
  );
}

/**
 * Builds a chronological list of month summaries from recorded balances and check-ins.
 * Saved = how much total money grew vs the previous recorded month.
 * Spent = income received that month minus what was saved.
 */
export function buildSummaries(
  balances: BalanceRow[],
  checkins: CheckinRow[]
): MonthSummary[] {
  const byMonth = new Map<string, number>();
  balances.forEach((b) => {
    byMonth.set(b.month, (byMonth.get(b.month) || 0) + Number(b.balance || 0));
  });
  const checkinMap = new Map<string, CheckinRow>();
  checkins.forEach((c) => checkinMap.set(c.month, c));

  const months = Array.from(
    new Set([...byMonth.keys(), ...checkinMap.keys()])
  ).sort();

  return months.map((month, idx) => {
    const totalBalance = byMonth.get(month) ?? 0;
    const checkin = checkinMap.get(month);
    const income = Number(checkin?.income || 0);
    const prevMonth = idx > 0 ? months[idx - 1] : null;
    const prevBalance = prevMonth ? byMonth.get(prevMonth) : undefined;
    const saved =
      prevMonth != null && prevBalance !== undefined
        ? totalBalance - prevBalance
        : null;
    const spent = saved === null ? null : income - saved;
    return {
      month,
      label: monthLabel(month),
      totalBalance,
      income,
      saved,
      spent,
      savingsRate: saved === null || income <= 0 ? null : (saved / income) * 100,
      note: checkin?.note ?? null,
      hasCheckin: !!checkin,
    };
  });
}
