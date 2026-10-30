// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { buildSampleData } from "@/store/sample";
import { STORAGE_KEY } from "@/store/storage";
import type { AppData } from "@/domain/types";

const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const seed = (d: AppData) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
const go = (hash: string) => {
  window.location.hash = hash;
};
const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

// The chart pages are lazy-loaded; warm them so a cold first import doesn't eat a test's timeout.
beforeAll(async () => {
  await Promise.all([import("@/pages/Wealth"), import("@/pages/Insights")]);
}, 60_000);

beforeEach(() => {
  localStorage.clear();
  go("");
});
afterEach(() => cleanup());

describe("first run", () => {
  it("onboards a new user and lands on Home with their accounts", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText(/what should we call you/i), "Priya");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const names = await screen.findAllByLabelText("Account name");
    await user.clear(names[0]);
    await user.type(names[0], "Salary account");
    await user.type(screen.getAllByLabelText("Balance")[0], "50000");
    await user.click(screen.getByRole("button", { name: /start tracking/i }));

    expect(await screen.findByText(/Priya/)).toBeTruthy();
    const d = stored();
    expect(d.settings).toMatchObject({ name: "Priya", onboarded: true });
    expect(d.accounts.find((a) => a.name === "Salary account")?.openingBalance).toBe(50000);
  });

  it("offers demo data and opens a fully populated Home", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /show me around with demo data/i }));
    expect(await screen.findByText("Net worth")).toBeTruthy();
    expect(stored().transactions.length).toBeGreaterThan(50);
  });
});

describe("quick add", () => {
  it("records an expense from anywhere with the N key", async () => {
    const user = userEvent.setup();
    const d = buildSampleData("Sam", "INR");
    seed(d);
    render(<App />);
    await screen.findByText("Net worth");
    const before = d.transactions.length;

    await user.keyboard("n");
    const amount = await screen.findByLabelText("Amount");
    await user.type(amount, "1234.50");
    await user.click(screen.getByRole("button", { name: /Groceries/ }));
    await user.type(screen.getByLabelText(/note/i), "Test shop");
    await user.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => expect(stored().transactions.length).toBe(before + 1));
    const added = stored().transactions.find((t) => t.note === "Test shop")!;
    expect(added).toMatchObject({ type: "expense", amount: 1234.5, category: "Groceries" });
  });

  it("validates before saving", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    render(<App />);
    await screen.findByText("Net worth");
    await user.keyboard("n");
    await user.click(await screen.findByRole("button", { name: /^Save$/ }));
    expect(await screen.findByText(/amount greater than zero/i)).toBeTruthy();
  });

  it("asks for an account first when none exist", async () => {
    const user = userEvent.setup();
    seed({ ...buildSampleData(), accounts: [], transactions: [], recurring: [] });
    render(<App />);
    await user.keyboard("n");
    expect(await screen.findByText(/add an account first/i)).toBeTruthy();
  });

  it("typing an 'n' into a field doesn't open the dialog", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    go("#/activity");
    render(<App />);
    await user.type(await screen.findByLabelText(/search transactions/i), "nnn");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("screens render with realistic data", () => {
  const routes: [string, RegExp][] = [
    ["#/", /Net worth/],
    ["#/activity", /Activity/],
    ["#/plan?tab=budget", /Monthly limits/],
    ["#/plan?tab=bills", /Recurring/i],
    ["#/plan?tab=goals", /Goa trip/],
    ["#/wealth", /Assets/],
    ["#/insights", /Spending by category/],
    ["#/review", /review/i],
    ["#/settings", /Your data/],
  ];
  for (const [route, text] of routes) {
    it(route, async () => {
      seed(buildSampleData());
      go(route);
      render(<App />);
      expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
      expect(screen.queryByText(/something went wrong/i)).toBeNull();
    });
  }

  it("old routes redirect to their new home", async () => {
    seed(buildSampleData());
    go("#/budget-planner");
    render(<App />);
    expect(await screen.findByText(/Monthly limits/)).toBeTruthy();
    expect(window.location.hash).toContain("#/plan");
  });

  it("unknown routes show a friendly page", async () => {
    seed(buildSampleData());
    go("#/nope");
    render(<App />);
    expect(await screen.findByText(/page not found/i)).toBeTruthy();
  });
});

describe("planning flows", () => {
  it("suggests round-number budgets from history", async () => {
    const user = userEvent.setup();
    seed({ ...buildSampleData(), budgets: {} });
    go("#/plan?tab=budget");
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /suggest from history/i }));
    await waitFor(() => expect(Object.keys(stored().budgets).length).toBeGreaterThan(0));
    for (const v of Object.values(stored().budgets)) expect(v % 100).toBe(0);
  });

  it("marks a due bill paid: posts a transaction and moves the schedule forward", async () => {
    const user = userEvent.setup();
    const d = buildSampleData();
    const bill = { ...d.recurring[1], nextDate: "2020-01-05", anchorDay: 5 }; // rent, long overdue
    seed({ ...d, recurring: [bill] });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Paid$/ }));
    await waitFor(() => {
      const s = stored();
      expect(s.recurring[0].nextDate).toBe("2020-02-05");
      expect(s.transactions.some((t) => t.recurringId === bill.id)).toBe(true);
    });
  });

  it("adds money to a goal", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    go("#/plan?tab=goals");
    render(<App />);
    const card = (await screen.findByText(/Goa trip/)).closest("div.rounded-xl") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: /add money/i }));
    await user.type(await screen.findByLabelText("Amount"), "5000");
    await user.click(screen.getByRole("button", { name: /add to goal/i }));
    await waitFor(() => expect(stored().goals.find((g) => g.name === "Goa trip")!.saved).toBe(27000));
  });
});

describe("month-end review", () => {
  it("turns a typed balance into a labelled adjustment and marks the month reviewed", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    const month = thisMonth();
    go(`#/review?month=${month}`);
    render(<App />);
    await user.type(await screen.findByLabelText(/Actual balance for Wallet/i), "999");
    await user.click(screen.getByRole("button", { name: /adjust 1 & close/i }));
    await waitFor(() => {
      const s = stored();
      expect(s.reviewedMonths).toContain(month);
      const adj = s.transactions.filter((t) => t.type === "adjustment");
      expect(adj.length).toBe(1);
      expect(adj[0].note).toBe("Balance reconciled");
    });
  });

  it("closing with nothing changed posts no adjustments", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    const month = thisMonth();
    go(`#/review?month=${month}`);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /everything matches/i }));
    await waitFor(() => expect(stored().reviewedMonths).toContain(month));
    expect(stored().transactions.some((t) => t.type === "adjustment")).toBe(false);
  });
});

describe("data safety", () => {
  it("keeps unreadable saved data aside instead of destroying it", async () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    render(<App />);
    await screen.findByText(/call you/i);
    expect(localStorage.getItem("money-matter:data:corrupt-backup")).toBe("{not valid json");
  });

  it("erase-everything requires confirmation", async () => {
    const user = userEvent.setup();
    seed(buildSampleData());
    go("#/settings");
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /erase everything/i }));
    expect(await screen.findByText(/can't be undone/i)).toBeTruthy();
    expect(stored().transactions.length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /erase everything/i }).pop()!);
    await waitFor(() => expect(stored().accounts.length).toBe(0));
  });
});
