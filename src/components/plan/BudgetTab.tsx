import { useMemo, useState } from "react";
import { Pencil, Plus, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, EmptyState, SectionTitle } from "@/components/common";
import { budgetLines, spendByCategory, summarizeMonth } from "@/domain/calc";
import { currentMonth, monthLabel, monthRange, shiftMonth, todayISO } from "@/domain/dates";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

export default function BudgetTab() {
  const { data, fmt, setBudget } = useFinance();
  const month = currentMonth();
  const today = todayISO();
  const lines = useMemo(() => budgetLines(data.budgets, data.transactions, month, today), [data, month, today]);
  const unbudgeted = useMemo(
    () => spendByCategory(data.transactions, month).filter((s) => !(s.category in data.budgets)),
    [data, month]
  );
  const total = lines.reduce((s, l) => s + l.limit, 0);
  const spent = lines.reduce((s, l) => s + l.spent, 0);

  const [newCat, setNewCat] = useState("");
  const [newLimit, setNewLimit] = useState("");

  const available = data.categories.filter((c) => c.type === "expense" && !(c.name in data.budgets));

  const suggest = () => {
    const months = monthRange(3, shiftMonth(month, -1)); // the 3 full months before this one
    const totals = new Map<string, number>();
    let used = 0;
    for (const m of months) {
      if (summarizeMonth(data.transactions, m).count > 0) used++;
      for (const s of spendByCategory(data.transactions, m)) totals.set(s.category, (totals.get(s.category) ?? 0) + s.amount);
    }
    if (used === 0) return toast.info("Not enough history yet", { description: "Log a full month of spending and I'll suggest limits." });
    let added = 0;
    for (const [cat, sum] of totals) {
      if (cat in data.budgets) continue;
      const avg = sum / used;
      if (avg < 100) continue;
      setBudget(cat, Math.ceil(avg / 100) * 100);
      added++;
    }
    if (!added) return toast.info("Every category with history already has a budget.");
    toast.success(`Added ${added} budget${added > 1 ? "s" : ""}`, {
      description: `Based on your average over the last ${used} month${used > 1 ? "s" : ""}. Adjust any of them.`,
    });
  };

  const add = () => {
    const limit = parseFloat(newLimit);
    if (!newCat || !(limit > 0)) return toast.error("Pick a category and enter a limit.");
    setBudget(newCat, limit);
    setNewCat("");
    setNewLimit("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Monthly limits for {monthLabel(month)}. Resets every month.</p>
        <Button variant="outline" size="sm" onClick={suggest}>
          <Wand2 className="mr-1.5 h-4 w-4" /> Suggest from history
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-muted-foreground">Spent of budgeted</div>
            <div className="tabular text-sm">
              <span className="text-lg font-semibold">{fmt(spent)}</span> <span className="text-muted-foreground">/ {fmt(total)}</span>
            </div>
          </div>
          <Bar className="mt-2 h-2.5" pct={(spent / total) * 100} status={spent > total ? "over" : spent / total > 0.85 ? "near" : "ok"} label="Total budget" />
          <p className="tabular mt-2 text-xs text-muted-foreground">
            {spent <= total ? `${fmt(total - spent)} left to spend` : `${fmt(spent - total)} over budget`}
          </p>
        </div>
      )}

      {lines.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Set your first budget"
          body="Pick a category and a monthly limit below — or let me suggest limits from what you've already spent."
        />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {lines.map((l) => (
            <BudgetRow key={l.category} line={l} />
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 text-sm font-medium">Add a budget</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger className="sm:flex-1" aria-label="Category">
              <SelectValue placeholder={available.length ? "Choose a category" : "All categories budgeted"} />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.emoji} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            inputMode="decimal"
            placeholder="Monthly limit"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9.]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="sm:w-40"
            aria-label="Monthly limit"
          />
          <Button onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {unbudgeted.length > 0 && lines.length > 0 && (
        <div>
          <SectionTitle>Spent this month without a budget</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map((s) => (
              <button
                key={s.category}
                onClick={() => setNewCat(s.category)}
                className="tabular rounded-full border bg-card px-3 py-1 text-xs hover:border-primary"
                title="Click to budget this category"
              >
                {s.category} · {fmt(s.amount)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetRow({ line }: { line: ReturnType<typeof budgetLines>[number] }) {
  const { data, fmt, setBudget } = useFinance();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(line.limit));
  const emoji = data.categories.find((c) => c.name === line.category)?.emoji ?? "🧾";

  const commit = () => {
    const n = parseFloat(val);
    setBudget(line.category, Number.isFinite(n) && n > 0 ? n : 0);
    setEditing(false);
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 text-sm font-medium">
          <span aria-hidden>{emoji}</span> {line.category}
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-8 w-28 text-right"
              aria-label={`${line.category} limit`}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="tabular text-sm">
              <span className={cn("font-semibold", line.status === "over" && "text-destructive")}>{fmt(line.spent)}</span>
              <span className="text-muted-foreground"> / {fmt(line.limit)}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${line.category} budget`} onClick={() => { setVal(String(line.limit)); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${line.category} budget`} onClick={() => setBudget(line.category, 0)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <Bar pct={line.pct} status={line.status} label={line.category} />
      <div className="tabular mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span className={cn(line.status === "over" && "font-medium text-destructive")}>
          {line.remaining >= 0 ? `${fmt(line.remaining)} left` : `${fmt(-line.remaining)} over`}
        </span>
        {line.projected > line.limit && line.status !== "over" && <span className="text-warning">On pace for {fmt(line.projected)}</span>}
        {line.status === "over" && <span>{Math.round(line.pct)}% used</span>}
      </div>
    </div>
  );
}
