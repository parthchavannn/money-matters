import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FlaskConical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_KINDS, CURRENCIES, isLiability } from "@/domain/meta";
import { todayISO } from "@/domain/dates";
import type { AccountKind } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";

interface Row {
  key: number;
  name: string;
  kind: AccountKind;
  amount: string;
}

const STARTERS: Row[] = [
  { key: 1, name: "Bank account", kind: "bank", amount: "" },
  { key: 2, name: "Cash", kind: "cash", amount: "" },
];

export default function Welcome() {
  const { data, updateSettings, addAccount, loadSample } = useFinance();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.settings.name);
  const [currency, setCurrency] = useState(data.settings.currency);
  const [rows, setRows] = useState<Row[]>(STARTERS);
  const [nextKey, setNextKey] = useState(3);

  const patch = (key: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const finish = () => {
    updateSettings({ name: name.trim(), currency, onboarded: true });
    const today = todayISO();
    for (const r of rows) {
      const n = r.name.trim();
      if (!n) continue;
      const amt = Math.abs(parseFloat(r.amount.replace(/,/g, "")) || 0);
      addAccount({ name: n, kind: r.kind, openingBalance: isLiability(r.kind) ? -amt : amt, openingDate: today });
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">M</span>
          <span className="text-lg font-semibold tracking-tight">Money Matter</span>
        </div>

        <div className="mb-6 flex gap-1.5" aria-label={`Step ${step + 1} of 2`}>
          {[0, 1].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
        </div>

        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Track everything, effortlessly.</h1>
              <p className="mt-2 text-muted-foreground">
                Spending, accounts, bills, goals and net worth — in one calm place. Takes about a minute to set up, and your data stays on your device.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="w-name" className="mb-1.5 block text-sm font-medium">What should we call you?</label>
                <Input id="w-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setStep(1)} placeholder="Your first name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { updateSettings({ name: name.trim(), currency }); loadSample(); navigate("/", { replace: true }); }}
            >
              <FlaskConical className="h-4 w-4" /> Just show me around with demo data
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Where does your money live?</h1>
              <p className="mt-2 text-muted-foreground">
                Add accounts with today's balance. Include anything you owe (credit card, loan) with the amount owed. You can change all of this later.
              </p>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center gap-2 rounded-xl border bg-card p-2">
                  <Select value={r.kind} onValueChange={(v) => patch(r.key, { kind: v as AccountKind })}>
                    <SelectTrigger className="w-14 shrink-0 px-2" aria-label="Account type"><SelectValue>{ACCOUNT_KINDS[r.kind].emoji}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACCOUNT_KINDS) as AccountKind[]).map((k) => <SelectItem key={k} value={k}>{ACCOUNT_KINDS[k].emoji} {ACCOUNT_KINDS[k].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Account name" className="min-w-0 flex-1" aria-label="Account name" />
                  <Input value={r.amount} inputMode="decimal" onChange={(e) => patch(r.key, { amount: e.target.value.replace(/[^0-9.,]/g, "") })} placeholder={isLiability(r.kind) ? "Owed" : "Balance"} className="tabular w-28 text-right" aria-label={isLiability(r.kind) ? "Amount owed" : "Balance"} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Remove">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => { setRows((r) => [...r, { key: nextKey, name: "", kind: "bank", amount: "" }]); setNextKey((k) => k + 1); }}>
                <Plus className="mr-1 h-4 w-4" /> Add another
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button size="lg" className="flex-1" onClick={finish}>Start tracking</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
