import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  parseISO,
} from "date-fns";
import type { Frequency, ISODate, MonthKey } from "./types";

export const toISO = (d: Date): ISODate => format(d, "yyyy-MM-dd");
export const todayISO = (): ISODate => toISO(new Date());
export const monthOf = (iso: ISODate): MonthKey => iso.slice(0, 7);
export const currentMonth = (): MonthKey => monthOf(todayISO());

const monthStart = (m: MonthKey) => parseISO(`${m}-01`);

export const shiftMonth = (m: MonthKey, delta: number): MonthKey =>
  format(addMonths(monthStart(m), delta), "yyyy-MM");

export const monthLabel = (m: MonthKey, short = false) =>
  format(monthStart(m), short ? "MMM" : "MMMM yyyy");

export const monthEnd = (m: MonthKey): ISODate => toISO(endOfMonth(monthStart(m)));
export const daysInMonth = (m: MonthKey) => getDaysInMonth(monthStart(m));
export const daysBetween = (from: ISODate, to: ISODate) =>
  differenceInCalendarDays(parseISO(to), parseISO(from));
export const addDaysISO = (iso: ISODate, n: number): ISODate => toISO(addDays(parseISO(iso), n));

/** [oldest … endMonth], `n` months long. */
export const monthRange = (n: number, endMonth: MonthKey = currentMonth()): MonthKey[] =>
  Array.from({ length: n }, (_, i) => shiftMonth(endMonth, i - (n - 1)));

export function friendlyDate(iso: ISODate, today: ISODate = todayISO()): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  const d = parseISO(iso);
  return format(d, d.getFullYear() === parseISO(today).getFullYear() ? "EEE, d MMM" : "d MMM yyyy");
}

/** Next occurrence after `date`, keeping the original day-of-month for monthly/yearly schedules. */
export function advanceDate(date: ISODate, frequency: Frequency, anchorDay: number): ISODate {
  const d = parseISO(date);
  if (frequency === "weekly") return toISO(addDays(d, 7));
  const next = frequency === "monthly" ? addMonths(d, 1) : addYears(d, 1);
  const day = Math.min(anchorDay, getDaysInMonth(next));
  next.setDate(day);
  return toISO(next);
}
