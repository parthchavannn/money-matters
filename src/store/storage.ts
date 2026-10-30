import { z } from "zod";
import { emptyData } from "@/domain/meta";
import type { AppData } from "@/domain/types";

const KEY = "money-matter:data";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const kinds = ["bank", "savings", "cash", "wallet", "investment", "credit_card", "loan", "other"] as const;

export const appDataSchema = z.object({
  version: z.literal(2),
  settings: z.object({
    name: z.string(),
    currency: z.string().min(3).max(3),
    theme: z.enum(["light", "dark", "system"]),
    onboarded: z.boolean(),
  }),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(kinds),
      openingBalance: z.number(),
      openingDate: iso,
      archived: z.boolean().optional(),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["income", "expense", "transfer", "adjustment"]),
      amount: z.number(),
      date: iso,
      accountId: z.string(),
      toAccountId: z.string().optional(),
      category: z.string().optional(),
      note: z.string().optional(),
      recurringId: z.string().optional(),
    })
  ),
  recurring: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["income", "expense"]),
      amount: z.number(),
      category: z.string(),
      accountId: z.string(),
      note: z.string(),
      frequency: z.enum(["weekly", "monthly", "yearly"]),
      nextDate: iso,
      anchorDay: z.number().int().min(1).max(31),
      active: z.boolean(),
    })
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      target: z.number(),
      saved: z.number(),
      targetDate: iso.optional(),
    })
  ),
  budgets: z.record(z.number()),
  categories: z.array(
    z.object({ name: z.string(), emoji: z.string(), type: z.enum(["income", "expense"]) })
  ),
  reviewedMonths: z.array(z.string()),
});

export type LoadResult = { data: AppData; recovered: boolean };

/** Device-cache key. Signed-in users get their own namespace so accounts never share a cache. */
export const dataKeyFor = (userId: string) => `${KEY}:user:${userId}`;
export const syncMetaKeyFor = (userId: string) => `money-matter:sync:${userId}`;

export function loadData(key: string = KEY): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { data: emptyData(), recovered: false };
  }
  if (!raw) return { data: emptyData(), recovered: false };
  try {
    const parsed = appDataSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { data: parsed.data as AppData, recovered: false };
  } catch {
    /* fall through to recovery */
  }
  // Never silently destroy someone's records: keep the unreadable copy aside.
  try {
    localStorage.setItem(`${key}:corrupt-backup`, raw);
  } catch {
    /* storage full — nothing more we can do */
  }
  return { data: emptyData(), recovered: true };
}

/** Returns false when the browser refused the write (quota / private mode). */
export function saveData(data: AppData, key: string = KEY): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData(key: string = KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEY = KEY;

/** Remove everything cached on this device for a user (on sign-out / account deletion). */
export function purgeUserCache(userId: string) {
  try {
    const k = dataKeyFor(userId);
    localStorage.removeItem(k);
    localStorage.removeItem(`${k}:corrupt-backup`);
    localStorage.removeItem(syncMetaKeyFor(userId));
  } catch {
    /* ignore */
  }
}

export function parseImport(text: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const parsed = appDataSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `Not a Money Matter backup (${first.path.join(".") || "root"}: ${first.message}).` };
  }
  return { ok: true, data: parsed.data as AppData };
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportTransactionsCSV(data: AppData): string {
  const name = new Map(data.accounts.map((a) => [a.id, a.name]));
  const rows = [["Date", "Type", "Amount", "Category", "Account", "To account", "Note"]];
  [...data.transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((t) =>
      rows.push([
        t.date,
        t.type,
        String(t.amount),
        t.category ?? "",
        name.get(t.accountId) ?? "",
        t.toAccountId ? name.get(t.toAccountId) ?? "" : "",
        t.note ?? "",
      ])
    );
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
