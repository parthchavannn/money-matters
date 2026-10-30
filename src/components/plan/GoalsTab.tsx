import { useState } from "react";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bar, EmptyState } from "@/components/common";
import { goalProgress } from "@/domain/calc";
import { friendlyDate, todayISO } from "@/domain/dates";
import type { Goal } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

const EMOJIS = ["🎯", "🏖️", "🏠", "🚗", "💻", "📱", "🎓", "💍", "🛟", "👶", "🎁", "📈"];

export default function GoalsTab() {
  const { data, fmt, contributeToGoal } = useFinance();
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [adding, setAdding] = useState<Goal | null>(null);
  const today = todayISO();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Things you're saving for. Add money whenever you set some aside.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> New goal
        </Button>
      </div>

      {data.goals.length === 0 ? (
        <EmptyState emoji="🎯" title="What are you saving for?" body="A trip, a laptop, an emergency fund — give it a target and a date." action={<Button onClick={() => setEditing("new")}>Create a goal</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.goals.map((g) => {
            const p = goalProgress(g, today);
            return (
              <div key={g.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      <span aria-hidden>{g.emoji}</span> {g.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.targetDate ? `By ${friendlyDate(g.targetDate, today)}` : "No deadline"}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${g.name}`} onClick={() => setEditing(g)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="tabular mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-semibold">{fmt(g.saved)}</span>
                  <span className="text-sm text-muted-foreground">of {fmt(g.target)}</span>
                </div>
                <Bar className="mt-1.5" pct={p.pct} status={p.done ? "done" : "ok"} label={g.name} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className={cn("text-xs", p.overdue ? "text-destructive" : "text-muted-foreground")}>
                    {p.done ? "🎉 Goal reached" : p.overdue ? "Past its date" : p.monthlyNeeded !== null ? `Save ~${fmt(p.monthlyNeeded)}/month to get there` : `${fmt(p.remaining)} to go`}
                  </p>
                  {!p.done && (
                    <Button size="sm" variant="outline" onClick={() => setAdding(g)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add money
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null && <GoalForm key={editing === "new" ? "new" : editing.id} goal={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={adding !== null} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="sm:max-w-sm">
          {adding && <AddMoney goal={adding} onDone={(amt) => { contributeToGoal(adding.id, amt); toast.success(amt >= 0 ? "Added to goal" : "Removed from goal"); setAdding(null); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddMoney({ goal, onDone }: { goal: Goal; onDone: (amt: number) => void }) {
  const { fmt } = useFinance();
  const [amt, setAmt] = useState("");
  const [sign, setSign] = useState<1 | -1>(1);
  const n = parseFloat(amt);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (n > 0) onDone(sign * n); }} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{goal.emoji} {goal.name}</DialogTitle>
        <DialogDescription>Currently {fmt(goal.saved)} of {fmt(goal.target)}.</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => setSign((s) => (s === 1 ? -1 : 1))} aria-label={sign === 1 ? "Switch to withdraw" : "Switch to add"}>
          {sign === 1 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </Button>
        <Input autoFocus inputMode="decimal" placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} className="tabular text-lg" aria-label="Amount" />
      </div>
      <Button type="submit" className="w-full" disabled={!(n > 0)}>{sign === 1 ? "Add to goal" : "Withdraw from goal"}</Button>
    </form>
  );
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { addGoal, updateGoal, deleteGoal } = useFinance();
  const [name, setName] = useState(goal?.name ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [saved, setSaved] = useState(goal ? String(goal.saved) : "");
  const [date, setDate] = useState(goal?.targetDate ?? "");
  const [error, setError] = useState("");

  const save = () => {
    const t = parseFloat(target);
    const s = parseFloat(saved || "0");
    if (!name.trim()) return setError("Give your goal a name.");
    if (!(t > 0)) return setError("Enter a target amount.");
    if (!(s >= 0)) return setError("Saved amount can't be negative.");
    const payload = { name: name.trim(), emoji, target: t, saved: s, targetDate: date || undefined };
    if (goal) updateGoal(goal.id, payload);
    else addGoal(payload);
    toast.success(goal ? "Goal updated" : "Goal created");
    onClose();
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
        <DialogDescription className="sr-only">Name, target amount and optional deadline.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={emoji === e} className={cn("h-9 w-9 rounded-lg border text-lg", emoji === e ? "border-primary bg-accent" : "bg-card hover:bg-muted")}>
            {e}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="g-name" className="mb-1.5 block text-xs text-muted-foreground">Name</Label>
        <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa trip" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="g-target" className="mb-1.5 block text-xs text-muted-foreground">Target</Label>
          <Input id="g-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <div>
          <Label htmlFor="g-saved" className="mb-1.5 block text-xs text-muted-foreground">Saved so far</Label>
          <Input id="g-saved" inputMode="decimal" value={saved} placeholder="0" onChange={(e) => setSaved(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
      </div>
      <div>
        <Label htmlFor="g-date" className="mb-1.5 block text-xs text-muted-foreground">Target date (optional)</Label>
        <Input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        {goal && (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteGoal(goal.id); toast("Goal deleted"); onClose(); }}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        )}
        <Button className="ml-auto" onClick={save}>{goal ? "Save changes" : "Create goal"}</Button>
      </div>
    </div>
  );
}
