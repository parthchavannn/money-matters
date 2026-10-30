import { describe, expect, it } from "vitest";
import {
  balancesAsOf,
  budgetLines,
  buildInsights,
  dueRecurring,
  goalProgress,
  netWorthAsOf,
  netWorthSeries,
  reviewDue,
  spendByCategory,
  summarizeMonth,
} from "./calc";
import { advanceDate } from "./dates";
import { emptyData } from "./meta";
import type { Account, AppData, Transaction } from "./types";
import { buildSampleData } from "@/store/sample";
import { appDataSchema, parseImport, exportJSON } from "@/store/storage";

const acc = (id: string, kind: Account["kind"], openingBalance: number, openingDate = "2026-01-01"): Account => ({
  id,
  name: id,
  kind,
  openingBalance,
  openingDate,
});
let n = 0;
const tx = (t: Partial<Transaction> & Pick<Transaction, "type" | "amount" | "date" | "accountId">): Transaction => ({
  id: `t${++n}`,
  ...t,
});

describe("balances", () => {
  const accounts = [acc("bank", "bank", 1000), acc("card", "credit_card", -500), acc("loan", "loan", -10000)];

  it("applies income, expense, transfers and adjustments", () => {
    const txns = [
      tx({ type: "income", amount: 500, date: "2026-02-01", accountId: "bank" }),
      tx({ type: "expense", amount: 200, date: "2026-02-02", accountId: "bank" }),
      tx({ type: "expense", amount: 100, date: "2026-02-03", accountId: "card" }), // owe more
      tx({ type: "transfer", amount: 300, date: "2026-02-04", accountId: "bank", toAccountId: "card" }), // pay card
      tx({ type: "transfer", amount: 1000, date: "2026-02-05", accountId: "bank", toAccountId: "loan" }), // EMI
      tx({ type: "adjustment", amount: -50, date: "2026-02-06", accountId: "bank" }),
    ];
    const b = balancesAsOf(accounts, txns);
    expect(b.get("bank")).toBe(1000 + 500 - 200 - 300 - 1000 - 50);
    expect(b.get("card")).toBe(-500 - 100 + 300);
    expect(b.get("loan")).toBe(-10000 + 1000);
  });

  it("respects asOf and ignores activity before the opening date", () => {
    const a = [acc("bank", "bank", 100, "2026-03-01")];
    const txns = [
      tx({ type: "income", amount: 999, date: "2026-02-15", accountId: "bank" }),
      tx({ type: "income", amount: 50, date: "2026-03-10", accountId: "bank" }),
      tx({ type: "income", amount: 25, date: "2026-04-10", accountId: "bank" }),
    ];
    expect(balancesAsOf(a, txns, "2026-03-31").get("bank")).toBe(150);
    expect(balancesAsOf(a, txns).get("bank")).toBe(175);
  });

  it("ignores references to unknown accounts instead of throwing", () => {
    const txns = [tx({ type: "transfer", amount: 10, date: "2026-02-01", accountId: "bank", toAccountId: "ghost" })];
    expect(() => balancesAsOf(accounts, txns)).not.toThrow();
  });
});

describe("net worth", () => {
  it("subtracts liabilities and skips archived accounts", () => {
    const accounts = [
      acc("bank", "bank", 5000),
      acc("card", "credit_card", -1200),
      { ...acc("old", "bank", 777), archived: true },
    ];
    expect(netWorthAsOf(accounts, [])).toEqual({ assets: 5000, liabilities: 1200, net: 3800 });
  });

  it("transfers between your own accounts don't change net worth, except paying down debt keeps it equal", () => {
    const accounts = [acc("bank", "bank", 5000), acc("loan", "loan", -3000)];
    const before = netWorthAsOf(accounts, []).net;
    const after = netWorthAsOf(accounts, [
      tx({ type: "transfer", amount: 1000, date: "2026-02-01", accountId: "bank", toAccountId: "loan" }),
    ]).net;
    expect(after).toBe(before);
  });

  it("builds a month-end series ending today", () => {
    const accounts = [acc("bank", "bank", 1000, "2026-01-01")];
    const txns = [tx({ type: "income", amount: 500, date: "2026-03-10", accountId: "bank" })];
    const s = netWorthSeries(accounts, txns, 4, "2026-04-15");
    expect(s.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(s.map((p) => p.net)).toEqual([1000, 1000, 1500, 1500]);
  });
});

describe("monthly numbers", () => {
  const txns = [
    tx({ type: "income", amount: 1000, date: "2026-03-01", accountId: "a" }),
    tx({ type: "expense", amount: 300, date: "2026-03-05", accountId: "a", category: "Food" }),
    tx({ type: "expense", amount: 100, date: "2026-03-06", accountId: "a", category: "Food" }),
    tx({ type: "expense", amount: 50, date: "2026-03-07", accountId: "a", category: "Fun" }),
    tx({ type: "transfer", amount: 999, date: "2026-03-08", accountId: "a", toAccountId: "b" }),
    tx({ type: "adjustment", amount: 999, date: "2026-03-09", accountId: "a" }),
    tx({ type: "expense", amount: 70, date: "2026-04-01", accountId: "a", category: "Food" }),
  ];

  it("summarises income/spend/savings and ignores transfers and adjustments", () => {
    const s = summarizeMonth(txns, "2026-03");
    expect(s).toMatchObject({ income: 1000, expense: 450, saved: 550, count: 4 });
    expect(s.savingsRate).toBeCloseTo(55);
  });

  it("returns a null savings rate with no income", () => {
    expect(summarizeMonth(txns, "2026-04").savingsRate).toBeNull();
  });

  it("groups spend by category, largest first", () => {
    expect(spendByCategory(txns, "2026-03")).toEqual([
      { category: "Food", amount: 400 },
      { category: "Fun", amount: 50 },
    ]);
  });
});

describe("budgets", () => {
  const txns = [
    tx({ type: "expense", amount: 450, date: "2026-03-05", accountId: "a", category: "Food" }),
    tx({ type: "expense", amount: 90, date: "2026-03-06", accountId: "a", category: "Fun" }),
  ];
  it("flags over / near / ok and projects the month on pace", () => {
    const lines = budgetLines({ Food: 400, Fun: 100, Travel: 500 }, txns, "2026-03", "2026-03-10");
    const by = Object.fromEntries(lines.map((l) => [l.category, l]));
    expect(by.Food.status).toBe("over");
    expect(by.Fun.status).toBe("near");
    expect(by.Travel.status).toBe("ok");
    expect(by.Food.projected).toBeCloseTo((450 / 10) * 31);
  });
  it("uses actual spend for past months", () => {
    const [l] = budgetLines({ Food: 400 }, txns, "2026-03", "2026-05-01");
    expect(l.projected).toBe(450);
  });
});

describe("recurring", () => {
  it("keeps the anchor day across short months", () => {
    expect(advanceDate("2026-01-31", "monthly", 31)).toBe("2026-02-28");
    expect(advanceDate("2026-02-28", "monthly", 31)).toBe("2026-03-31");
    expect(advanceDate("2026-03-31", "monthly", 31)).toBe("2026-04-30");
  });
  it("advances weekly and yearly", () => {
    expect(advanceDate("2026-03-01", "weekly", 1)).toBe("2026-03-08");
    expect(advanceDate("2028-02-29", "yearly", 29)).toBe("2029-02-28");
  });
  it("lists only active items that are due", () => {
    const base = { type: "expense" as const, amount: 1, category: "x", accountId: "a", note: "", frequency: "monthly" as const, anchorDay: 1 };
    const due = dueRecurring(
      [
        { ...base, id: "1", nextDate: "2026-03-01", active: true },
        { ...base, id: "2", nextDate: "2026-03-20", active: true },
        { ...base, id: "3", nextDate: "2026-03-01", active: false },
      ],
      "2026-03-10"
    );
    expect(due.map((r) => r.id)).toEqual(["1"]);
  });
});

describe("goals", () => {
  it("computes progress and monthly need", () => {
    const g = goalProgress(
      { id: "g", name: "x", emoji: "x", target: 1000, saved: 400, targetDate: "2026-09-01" },
      "2026-03-01"
    );
    expect(g.pct).toBe(40);
    expect(g.remaining).toBe(600);
    expect(g.monthlyNeeded).toBeGreaterThan(90);
    expect(g.monthlyNeeded).toBeLessThan(110);
  });
  it("handles done, overdue and zero targets", () => {
    expect(goalProgress({ id: "g", name: "x", emoji: "x", target: 100, saved: 150 }).done).toBe(true);
    expect(goalProgress({ id: "g", name: "x", emoji: "x", target: 100, saved: 10, targetDate: "2020-01-01" }, "2026-01-01").overdue).toBe(true);
    expect(goalProgress({ id: "g", name: "x", emoji: "x", target: 0, saved: 0 }).pct).toBe(0);
  });
});

describe("month-end review", () => {
  const data = (over: Partial<AppData>): AppData => ({ ...emptyData(), ...over });
  it("prompts for last month early in the month, once", () => {
    const base = data({
      accounts: [acc("a", "bank", 0)],
      transactions: [tx({ type: "income", amount: 1, date: "2026-02-10", accountId: "a" })],
    });
    expect(reviewDue(base, "2026-03-04")).toBe("2026-02");
    expect(reviewDue({ ...base, reviewedMonths: ["2026-02"] }, "2026-03-04")).toBeNull();
    expect(reviewDue(base, "2026-03-15")).toBeNull();
  });
  it("prompts for the current month in its last days", () => {
    expect(reviewDue(data({ accounts: [acc("a", "bank", 0)] }), "2026-03-30")).toBe("2026-03");
  });
  it("is silent with no accounts", () => {
    expect(reviewDue(data({}), "2026-03-30")).toBeNull();
  });
});

describe("sample data & persistence schema", () => {
  const sample = buildSampleData("Test", "INR");
  it("is valid against the storage schema and survives export → import", () => {
    expect(appDataSchema.safeParse(sample).success).toBe(true);
    const r = parseImport(exportJSON(sample));
    expect(r.ok).toBe(true);
  });
  it("produces sensible insights without throwing", () => {
    const ins = buildInsights(sample, (v) => String(Math.round(v)), "2026-03-20");
    expect(Array.isArray(ins)).toBe(true);
  });
  it("rejects junk imports with a readable error", () => {
    expect(parseImport("not json")).toMatchObject({ ok: false });
    expect(parseImport(JSON.stringify({ hello: 1 }))).toMatchObject({ ok: false });
  });
  it("sample references only accounts that exist", () => {
    const ids = new Set(sample.accounts.map((a) => a.id));
    for (const t of sample.transactions) {
      expect(ids.has(t.accountId)).toBe(true);
      if (t.toAccountId) expect(ids.has(t.toAccountId)).toBe(true);
    }
  });
});
