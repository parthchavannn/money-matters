import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { balancesAsOf } from "@/domain/calc";
import { advanceDate, monthEnd, todayISO } from "@/domain/dates";
import { CURRENCIES, emptyData } from "@/domain/meta";
import type {
  Account,
  AppData,
  Category,
  Goal,
  MonthKey,
  Recurring,
  Settings,
  Transaction,
} from "@/domain/types";
import { buildSampleData } from "./sample";
import { STORAGE_KEY, clearData, loadData, saveData } from "./storage";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type NewTx = Omit<Transaction, "id">;
type NewRecurring = Omit<Recurring, "id" | "anchorDay" | "active"> & { active?: boolean };

export interface ReconcileEntry {
  accountId: string;
  /** what the account actually holds right now (liabilities: amount owed, positive) */
  actual: number;
}

interface Finance {
  data: AppData;
  /** live balance of every account (liabilities negative) */
  balances: Map<string, number>;
  fmt: (n: number, opts?: { decimals?: boolean; sign?: boolean }) => string;
  fmtCompact: (n: number) => string;

  addTransaction: (t: NewTx) => Transaction;
  updateTransaction: (id: string, patch: Partial<NewTx>) => void;
  deleteTransaction: (id: string) => void;

  addAccount: (a: Omit<Account, "id">) => Account;
  updateAccount: (id: string, patch: Partial<Omit<Account, "id">>) => void;
  deleteAccount: (id: string) => boolean;

  setBudget: (category: string, limit: number) => void;

  addRecurring: (r: NewRecurring) => void;
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, "id">>) => void;
  deleteRecurring: (id: string) => void;
  /** Posts the due occurrence as a real transaction and moves the schedule forward. */
  payRecurring: (id: string, amount?: number) => void;
  skipRecurring: (id: string) => void;

  addGoal: (g: Omit<Goal, "id" | "saved"> & { saved?: number }) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (id: string, amount: number) => void;

  addCategory: (c: Category) => boolean;
  removeCategory: (name: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  /**
   * Makes each account's balance match what it really holds by posting an adjustment.
   * With a month: dated at that month's end and marks the month reviewed. With null: dated today.
   */
  reconcile: (month: MonthKey | null, entries: ReconcileEntry[]) => void;

  replaceAll: (data: AppData) => void;
  loadSample: () => void;
  resetAll: () => void;
}

const Ctx = createContext<Finance | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useRef(loadData());
  const [data, setData] = useState<AppData>(initial.current.data);
  const writeFailed = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (initial.current.recovered) {
      toast.error("Saved data couldn't be read", {
        description: "A copy was kept aside in your browser. Starting fresh — you can import a backup in Settings.",
        duration: 10000,
      });
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    const ok = saveData(data);
    if (!ok && !writeFailed.current) {
      writeFailed.current = true;
      toast.error("Couldn't save to this browser", {
        description: "Storage is full or blocked. Export a backup from Settings so you don't lose data.",
        duration: 12000,
      });
    }
    if (ok) writeFailed.current = false;
  }, [data]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(loadData().data);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Theme.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        data.settings.theme === "dark" ||
        (data.settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (data.settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [data.settings.theme]);

  const balances = useMemo(() => balancesAsOf(data.accounts, data.transactions), [data.accounts, data.transactions]);

  const currency = data.settings.currency;
  const { fmt, fmtCompact } = useMemo(() => {
    const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-US";
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const precise = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });
    return {
      fmt: (n: number, opts?: { decimals?: boolean; sign?: boolean }) => {
        const v = Math.abs(n) < 0.005 ? 0 : n;
        const f = opts?.decimals || (Math.abs(v) < 1000 && !Number.isInteger(v)) ? precise : whole;
        const s = f.format(opts?.sign ? Math.abs(v) : v);
        return opts?.sign ? `${v < 0 ? "−" : "+"}${s}` : s;
      },
      fmtCompact: (n: number) => compact.format(n),
    };
  }, [currency]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const actions = useMemo(() => {
    const addTransaction: Finance["addTransaction"] = (t) => {
      const tx = { ...t, id: newId() };
      update((d) => ({ ...d, transactions: [...d.transactions, tx] }));
      return tx;
    };

    const deleteTransaction: Finance["deleteTransaction"] = (id) => {
      const tx = dataRef.current.transactions.find((t) => t.id === id);
      if (!tx) return;
      update((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
      toast("Transaction deleted", {
        action: { label: "Undo", onClick: () => update((d) => ({ ...d, transactions: [...d.transactions, tx] })) },
      });
    };

    const payRecurring: Finance["payRecurring"] = (id, amount) =>
      update((d) => {
        const r = d.recurring.find((x) => x.id === id);
        if (!r) return d;
        const tx: Transaction = {
          id: newId(),
          type: r.type,
          amount: amount ?? r.amount,
          date: todayISO(),
          accountId: r.accountId,
          category: r.category,
          note: r.note || undefined,
          recurringId: r.id,
        };
        return {
          ...d,
          transactions: [...d.transactions, tx],
          recurring: d.recurring.map((x) =>
            x.id === id ? { ...x, nextDate: advanceDate(x.nextDate, x.frequency, x.anchorDay) } : x
          ),
        };
      });

    const api: Omit<Finance, "data" | "balances" | "fmt" | "fmtCompact"> = {
      addTransaction,
      updateTransaction: (id, patch) =>
        update((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTransaction,

      addAccount: (a) => {
        const acc = { ...a, id: newId() };
        update((d) => ({ ...d, accounts: [...d.accounts, acc] }));
        return acc;
      },
      updateAccount: (id, patch) =>
        update((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      deleteAccount: (id) => {
        const d = dataRef.current;
        const used =
          d.transactions.some((t) => t.accountId === id || t.toAccountId === id) ||
          d.recurring.some((r) => r.accountId === id);
        if (used) return false;
        update((cur) => ({ ...cur, accounts: cur.accounts.filter((a) => a.id !== id) }));
        return true;
      },

      setBudget: (category, limit) =>
        update((d) => {
          const budgets = { ...d.budgets };
          if (limit > 0) budgets[category] = limit;
          else delete budgets[category];
          return { ...d, budgets };
        }),

      addRecurring: (r) =>
        update((d) => ({
          ...d,
          recurring: [
            ...d.recurring,
            { ...r, id: newId(), active: r.active ?? true, anchorDay: Number(r.nextDate.slice(8, 10)) },
          ],
        })),
      updateRecurring: (id, patch) =>
        update((d) => ({
          ...d,
          recurring: d.recurring.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  anchorDay: patch.nextDate ? Number(patch.nextDate.slice(8, 10)) : r.anchorDay,
                }
              : r
          ),
        })),
      deleteRecurring: (id) => update((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) })),
      payRecurring,
      skipRecurring: (id) =>
        update((d) => ({
          ...d,
          recurring: d.recurring.map((r) =>
            r.id === id ? { ...r, nextDate: advanceDate(r.nextDate, r.frequency, r.anchorDay) } : r
          ),
        })),

      addGoal: (g) => update((d) => ({ ...d, goals: [...d.goals, { saved: 0, ...g, id: newId() }] })),
      updateGoal: (id, patch) =>
        update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),
      contributeToGoal: (id, amount) =>
        update((d) => ({
          ...d,
          goals: d.goals.map((g) => (g.id === id ? { ...g, saved: Math.max(0, g.saved + amount) } : g)),
        })),

      addCategory: (c) => {
        const exists = dataRef.current.categories.some(
          (x) => x.name.toLowerCase() === c.name.toLowerCase() && x.type === c.type
        );
        if (exists) return false;
        update((d) => ({ ...d, categories: [...d.categories, c] }));
        return true;
      },
      removeCategory: (name) =>
        update((d) => {
          const budgets = { ...d.budgets };
          delete budgets[name];
          return { ...d, categories: d.categories.filter((c) => c.name !== name), budgets };
        }),

      updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      reconcile: (month, entries) =>
        update((d) => {
          const today = todayISO();
          const date = month && monthEnd(month) < today ? monthEnd(month) : today;
          const bal = balancesAsOf(d.accounts, d.transactions, date);
          const adjustments: Transaction[] = [];
          for (const e of entries) {
            const acc = d.accounts.find((a) => a.id === e.accountId);
            if (!acc) continue;
            const target = acc.kind === "credit_card" || acc.kind === "loan" ? -Math.abs(e.actual) : e.actual;
            const delta = Math.round((target - (bal.get(acc.id) ?? 0)) * 100) / 100;
            if (delta !== 0)
              adjustments.push({
                id: newId(),
                type: "adjustment",
                amount: delta,
                date: date < acc.openingDate ? acc.openingDate : date,
                accountId: acc.id,
                note: "Balance reconciled",
              });
          }
          return {
            ...d,
            transactions: [...d.transactions, ...adjustments],
            reviewedMonths:
              !month || d.reviewedMonths.includes(month) ? d.reviewedMonths : [...d.reviewedMonths, month],
          };
        }),

      replaceAll: (next) => setData(next),
      loadSample: () => setData((d) => buildSampleData(d.settings.name || "Alex", d.settings.currency)),
      resetAll: () => {
        clearData();
        setData(emptyData());
      },
    };
    return api;
  }, [update]);

  const value = useMemo<Finance>(
    () => ({ data, balances, fmt, fmtCompact, ...actions }),
    [data, balances, fmt, fmtCompact, actions]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useFinance = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
};
