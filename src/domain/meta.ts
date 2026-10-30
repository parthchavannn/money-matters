import type { AccountKind, AppData, Category } from "./types";

export const ACCOUNT_KINDS: Record<
  AccountKind,
  { label: string; emoji: string; liability: boolean; liquid: boolean }
> = {
  bank: { label: "Bank account", emoji: "🏦", liability: false, liquid: true },
  savings: { label: "Savings / FD", emoji: "🐖", liability: false, liquid: true },
  cash: { label: "Cash", emoji: "💵", liability: false, liquid: true },
  wallet: { label: "Wallet / UPI", emoji: "📱", liability: false, liquid: true },
  investment: { label: "Investment", emoji: "📈", liability: false, liquid: false },
  credit_card: { label: "Credit card", emoji: "💳", liability: true, liquid: false },
  loan: { label: "Loan / EMI", emoji: "🏠", liability: true, liquid: false },
  other: { label: "Other asset", emoji: "📦", liability: false, liquid: false },
};

export const isLiability = (kind: AccountKind) => ACCOUNT_KINDS[kind].liability;

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Food & Dining", emoji: "🍽️", type: "expense" },
  { name: "Groceries", emoji: "🛒", type: "expense" },
  { name: "Rent & Housing", emoji: "🏠", type: "expense" },
  { name: "Bills & Utilities", emoji: "💡", type: "expense" },
  { name: "Transport", emoji: "🚌", type: "expense" },
  { name: "Shopping", emoji: "🛍️", type: "expense" },
  { name: "Health", emoji: "🩺", type: "expense" },
  { name: "Entertainment", emoji: "🎬", type: "expense" },
  { name: "Travel", emoji: "✈️", type: "expense" },
  { name: "Education", emoji: "📚", type: "expense" },
  { name: "Insurance", emoji: "🛡️", type: "expense" },
  { name: "Subscriptions", emoji: "🔁", type: "expense" },
  { name: "Other", emoji: "🧾", type: "expense" },
  { name: "Salary", emoji: "💼", type: "income" },
  { name: "Business", emoji: "🏪", type: "income" },
  { name: "Interest & Returns", emoji: "💰", type: "income" },
  { name: "Gift", emoji: "🎁", type: "income" },
  { name: "Refund", emoji: "↩️", type: "income" },
  { name: "Other income", emoji: "➕", type: "income" },
];

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)", locale: "en-IN" },
  { code: "USD", label: "US Dollar ($)", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", locale: "de-DE" },
  { code: "GBP", label: "British Pound (£)", locale: "en-GB" },
  { code: "AED", label: "UAE Dirham (AED)", locale: "en-AE" },
  { code: "SGD", label: "Singapore Dollar (S$)", locale: "en-SG" },
  { code: "AUD", label: "Australian Dollar (A$)", locale: "en-AU" },
  { code: "CAD", label: "Canadian Dollar (C$)", locale: "en-CA" },
];

export const emptyData = (): AppData => ({
  version: 2,
  settings: { name: "", currency: "INR", theme: "system", onboarded: false },
  accounts: [],
  transactions: [],
  recurring: [],
  goals: [],
  budgets: {},
  categories: DEFAULT_CATEGORIES,
  reviewedMonths: [],
});
