/** Every date is a local calendar date string: "yyyy-MM-dd". Every month is "yyyy-MM". */
export type ISODate = string;
export type MonthKey = string;

export type AccountKind =
  | "bank"
  | "savings"
  | "cash"
  | "wallet"
  | "investment"
  | "credit_card"
  | "loan"
  | "other";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /**
   * Signed balance on `openingDate`. Liabilities (credit card, loan) are
   * stored negative — the UI lets people type "amount owed" as a positive number.
   */
  openingBalance: number;
  /** Transactions dated before this don't affect the balance. */
  openingDate: ISODate;
  /** Closed accounts stay in history but leave pickers and net worth. */
  archived?: boolean;
}

/**
 * income / expense  → move money in or out of `accountId`
 * transfer          → `accountId` → `toAccountId` (bill payments, savings, EMIs); not income or spend
 * adjustment        → signed correction from a balance reconcile or investment revaluation; not income or spend
 */
export type TxType = "income" | "expense" | "transfer" | "adjustment";

export interface Transaction {
  id: string;
  type: TxType;
  /** Positive, except for `adjustment` where the sign is the direction. */
  amount: number;
  date: ISODate;
  accountId: string;
  toAccountId?: string;
  category?: string;
  note?: string;
  recurringId?: string;
}

export type Frequency = "weekly" | "monthly" | "yearly";

export interface Recurring {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  accountId: string;
  note: string;
  frequency: Frequency;
  /** Next date this is due. */
  nextDate: ISODate;
  /** Day of month the schedule was created on, so Jan 31 → Feb 28 → Mar 31 doesn't drift. */
  anchorDay: number;
  active: boolean;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  targetDate?: ISODate;
}

export interface Category {
  name: string;
  emoji: string;
  type: "income" | "expense";
}

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  name: string;
  currency: string;
  theme: ThemePref;
  onboarded: boolean;
}

export interface AppData {
  version: 2;
  settings: Settings;
  accounts: Account[];
  transactions: Transaction[];
  recurring: Recurring[];
  goals: Goal[];
  /** category name → monthly limit */
  budgets: Record<string, number>;
  categories: Category[];
  /** months the user has completed the month-end review for */
  reviewedMonths: MonthKey[];
}
