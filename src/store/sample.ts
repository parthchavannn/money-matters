import { addDaysISO, monthOf, shiftMonth, todayISO } from "@/domain/dates";
import { emptyData } from "@/domain/meta";
import { advanceDate } from "@/domain/dates";
import type { Account, AppData, Recurring, Transaction } from "@/domain/types";

/** Small deterministic PRNG so the demo looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** ~4 months of realistic activity, so every screen has something to show. */
export function buildSampleData(name = "Alex", currency = "INR"): AppData {
  const today = todayISO();
  const rand = rng(42);
  const start = `${shiftMonth(monthOf(today), -4)}-01`;
  const id = (p: string, i: number) => `sample-${p}-${i}`;

  const accounts: Account[] = [
    { id: id("a", 1), name: "Salary account", kind: "bank", openingBalance: 85000, openingDate: start },
    { id: id("a", 2), name: "Wallet", kind: "cash", openingBalance: 3000, openingDate: start },
    { id: id("a", 3), name: "Emergency fund", kind: "savings", openingBalance: 150000, openingDate: start },
    { id: id("a", 4), name: "Index funds", kind: "investment", openingBalance: 220000, openingDate: start },
    { id: id("a", 5), name: "Credit card", kind: "credit_card", openingBalance: -12000, openingDate: start },
    { id: id("a", 6), name: "Car loan", kind: "loan", openingBalance: -360000, openingDate: start },
  ];
  const [bank, cash, fund, invest, card, loan] = accounts.map((a) => a.id);

  const txns: Transaction[] = [];
  let n = 0;
  const add = (t: Omit<Transaction, "id">) => txns.push({ id: id("t", ++n), ...t });
  const months = [-4, -3, -2, -1, 0].map((d) => shiftMonth(monthOf(today), d));
  const pad = (d: number) => String(d).padStart(2, "0");

  for (const m of months) {
    const dated = (day: number) => `${m}-${pad(day)}`;
    const push = (day: number, t: Omit<Transaction, "id" | "date">) => {
      const date = dated(day);
      if (date <= today) add({ ...t, date });
    };
    push(1, { type: "income", amount: 95000, category: "Salary", accountId: bank, note: "Monthly salary" });
    push(2, { type: "expense", amount: 24000, category: "Rent & Housing", accountId: bank, note: "Rent" });
    push(3, { type: "transfer", amount: 14500, accountId: bank, toAccountId: loan, note: "Car EMI" });
    push(5, { type: "transfer", amount: 15000, accountId: bank, toAccountId: invest, note: "SIP" });
    push(6, { type: "transfer", amount: 10000, accountId: bank, toAccountId: fund, note: "Emergency fund top-up" });
    push(8, { type: "expense", amount: 1399, category: "Bills & Utilities", accountId: bank, note: "Broadband" });
    push(9, { type: "expense", amount: 649, category: "Subscriptions", accountId: card, note: "Streaming" });
    push(12, { type: "transfer", amount: 8000, accountId: bank, toAccountId: card, note: "Card payment" });
    for (let d = 1; d <= 28; d++) {
      if (rand() < 0.55) {
        const pick = rand();
        if (pick < 0.35) push(d, { type: "expense", amount: Math.round(180 + rand() * 520), category: "Food & Dining", accountId: rand() < 0.5 ? card : cash, note: ["Lunch", "Dinner out", "Coffee", "Swiggy"][Math.floor(rand() * 4)] });
        else if (pick < 0.55) push(d, { type: "expense", amount: Math.round(900 + rand() * 1900), category: "Groceries", accountId: bank, note: "Groceries" });
        else if (pick < 0.8) push(d, { type: "expense", amount: Math.round(60 + rand() * 340), category: "Transport", accountId: cash, note: ["Metro", "Auto", "Cab"][Math.floor(rand() * 3)] });
        else if (pick < 0.92) push(d, { type: "expense", amount: Math.round(500 + rand() * 3500), category: "Shopping", accountId: card, note: "Shopping" });
        else push(d, { type: "expense", amount: Math.round(300 + rand() * 900), category: "Entertainment", accountId: card, note: "Movie night" });
      }
    }
  }

  const recurringDefs: Array<Omit<Recurring, "id" | "nextDate" | "anchorDay" | "active"> & { day: number }> = [
    { type: "income", amount: 95000, category: "Salary", accountId: bank, note: "Monthly salary", frequency: "monthly", day: 1 },
    { type: "expense", amount: 24000, category: "Rent & Housing", accountId: bank, note: "Rent", frequency: "monthly", day: 2 },
    { type: "expense", amount: 1399, category: "Bills & Utilities", accountId: bank, note: "Broadband", frequency: "monthly", day: 8 },
    { type: "expense", amount: 649, category: "Subscriptions", accountId: card, note: "Streaming", frequency: "monthly", day: 9 },
    { type: "expense", amount: 18500, category: "Insurance", accountId: bank, note: "Health insurance", frequency: "yearly", day: 20 },
  ];
  const recurring: Recurring[] = recurringDefs.map(({ day, ...r }, i) => {
    const thisMonth = `${monthOf(today)}-${pad(Math.min(day, 28))}`;
    let next = thisMonth;
    // Already-posted occurrences this month were generated above, so the next one is in the future.
    if (next <= today) next = advanceDate(next, r.frequency === "yearly" ? "monthly" : r.frequency, day);
    if (r.frequency === "yearly") next = addDaysISO(today, 20);
    return { id: id("r", i + 1), ...r, nextDate: next, anchorDay: Number(next.slice(8, 10)), active: true };
  });

  const base = emptyData();
  return {
    ...base,
    settings: { name, currency, theme: "system", onboarded: true },
    accounts,
    transactions: txns,
    recurring,
    goals: [
      { id: id("g", 1), name: "Goa trip", emoji: "🏖️", target: 60000, saved: 22000, targetDate: addDaysISO(today, 120) },
      { id: id("g", 2), name: "New laptop", emoji: "💻", target: 90000, saved: 41000, targetDate: addDaysISO(today, 200) },
      { id: id("g", 3), name: "Emergency fund (6 months)", emoji: "🛟", target: 400000, saved: 150000 },
    ],
    budgets: {
      "Food & Dining": 9000,
      Groceries: 12000,
      Transport: 4000,
      Shopping: 6000,
      Entertainment: 2500,
      "Bills & Utilities": 3000,
    },
    reviewedMonths: [],
  };
}
