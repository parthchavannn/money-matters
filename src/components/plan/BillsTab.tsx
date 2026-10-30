import { useState } from "react";
import { Check, Pause, Pencil, Play, Plus, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Stat } from "@/components/common";
import { monthlyEquivalent } from "@/domain/calc";
import { friendlyDate, todayISO } from "@/domain/dates";
import type { Frequency, Recurring } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

const FREQ: Record<Frequency, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export default function BillsTab() {
  const { data, fmt, payRecurring, skipRecurring, updateRecurring } = useFinance();
  const [editing, setEditing] = useState<Recurring | "new" | null>(null);
  const today = todayISO();

  const active = data.recurring.filter((r) => r.active);
  const monthlyOut = active.filter((r) => r.type === "expense").reduce((s, r) => s + monthlyEquivalent(r), 0);
  const monthlyIn = active.filter((r) => r.type === "income").reduce((s, r) => s + monthlyEquivalent(r), 0);
  const sorted = [...data.recurring].sort((a, b) => Number(b.active) - Number(a.active) || a.nextDate.localeCompare(b.nextDate));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Rent, subscriptions, EMIs, salary — anything that repeats. They show up on Home when due.</p>
        <Button onClick={() => setEditing("new")} disabled={data.accounts.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {data.recurring.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Recurring out / month" value={fmt(monthlyOut)} />
          <Stat label="Recurring in / month" value={fmt(monthlyIn)} tone={monthlyIn > 0 ? "good" : "default"} />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          emoji="🔁"
          title="No recurring items yet"
          body={data.accounts.length ? "Add rent, subscriptions or your salary once and never re-type them." : "Add an account first, then set up your recurring bills."}
          action={data.accounts.length ? <Button onClick={() => setEditing("new")}>Add recurring item</Button> : undefined}
        />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {sorted.map((r) => {
            const due = r.active && r.nextDate <= today;
            const late = r.active && r.nextDate < today;
            return (
              <div key={r.id} className={cn("flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap", !r.active && "opacity-60")}>
                <span className="text-xl" aria-hidden>
                  {data.categories.find((c) => c.name === r.category)?.emoji ?? "🧾"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{r.note || r.category}</span>
                    {r.type === "income" && <Badge variant="secondary" className="text-[10px]">Income</Badge>}
                    {!r.active && <Badge variant="outline" className="text-[10px]">Paused</Badge>}
                  </div>
                  <div className={cn("text-xs", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {FREQ[r.frequency]} · {r.active ? (late ? `overdue since ${friendlyDate(r.nextDate, today)}` : `next ${friendlyDate(r.nextDate, today)}`) : "not scheduled"}
                  </div>
                </div>
                <div className={cn("tabular text-sm font-semibold", r.type === "income" && "text-success")}>{fmt(r.amount)}</div>
                <div className="flex items-center">
                  {due && (
                    <>
                      <Button size="sm" onClick={() => { payRecurring(r.id); toast.success(r.type === "income" ? "Income recorded" : "Marked as paid"); }}>
                        <Check className="mr-1 h-4 w-4" /> {r.type === "income" ? "Received" : "Paid"}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Skip" title="Skip this one" onClick={() => skipRecurring(r.id)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" aria-label={r.active ? "Pause" : "Resume"} title={r.active ? "Pause" : "Resume"} onClick={() => updateRecurring(r.id, { active: !r.active, nextDate: !r.active && r.nextDate < today ? today : r.nextDate })}>
                    {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          {editing !== null && <BillForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillForm({ item, onClose }: { item?: Recurring; onClose: () => void }) {
  const { data, addRecurring, updateRecurring, deleteRecurring } = useFinance();
  const accounts = data.accounts.filter((a) => !a.archived || a.id === item?.accountId);
  const [type, setType] = useState<"expense" | "income">(item?.type ?? "expense");
  const [note, setNote] = useState(item?.note ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [accountId, setAccountId] = useState(item?.accountId ?? accounts[0]?.id ?? "");
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? "monthly");
  const [nextDate, setNextDate] = useState(item?.nextDate ?? todayISO());
  const [error, setError] = useState("");

  const cats = data.categories.filter((c) => c.type === type);

  const save = () => {
    const amt = parseFloat(amount);
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (!category) return setError("Pick a category.");
    if (!accountId) return setError("Choose an account.");
    if (!nextDate) return setError("Pick the next due date.");
    const payload = { type, note: note.trim(), amount: amt, category, accountId, frequency, nextDate };
    if (item) updateRecurring(item.id, payload);
    else addRecurring(payload);
    toast.success(item ? "Saved" : "Recurring item added");
    onClose();
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{item ? "Edit recurring item" : "New recurring item"}</DialogTitle>
        <DialogDescription>You'll get a one-tap "Paid" on Home when it's due.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setCategory(""); }}
            className={cn("rounded-md py-1.5 text-sm font-medium", type === t ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {t === "expense" ? "Bill / expense" : "Income"}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="b-note" className="mb-1.5 block text-xs text-muted-foreground">Name</Label>
        <Input id="b-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === "income" ? "e.g. Salary" : "e.g. Rent, Netflix, Car EMI"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="b-amt" className="mb-1.5 block text-xs text-muted-foreground">Amount</Label>
          <Input id="b-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Repeats</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger aria-label="Frequency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FREQ) as Frequency[]).map((f) => <SelectItem key={f} value={f}>{FREQ[f]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Category"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.name} value={c.name}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">{type === "income" ? "Into" : "Paid from"}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger aria-label="Account"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="b-date" className="mb-1.5 block text-xs text-muted-foreground">Next due</Label>
        <Input id="b-date" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        {item && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteRecurring(item.id); toast("Recurring item deleted"); onClose(); }}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        )}
        <Button className="ml-auto" onClick={save}>{item ? "Save changes" : "Add"}</Button>
      </div>
    </div>
  );
}
