import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { todayISO } from "@/domain/dates";
import { ACCOUNT_KINDS } from "@/domain/meta";
import type { Transaction } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";

type FormType = "expense" | "income" | "transfer";

export interface OpenOptions {
  type?: FormType;
  accountId?: string;
  toAccountId?: string;
  category?: string;
  note?: string;
  amount?: number;
}

interface Dialogs {
  openAdd: (opts?: OpenOptions) => void;
  openEdit: (tx: Transaction) => void;
}
const Ctx = createContext<Dialogs | undefined>(undefined);
export const useTransactionDialog = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTransactionDialog must be used inside TransactionDialogProvider");
  return c;
};

export const TransactionDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ open: boolean; editing?: Transaction; opts?: OpenOptions; nonce: number }>({
    open: false,
    nonce: 0,
  });

  const openAdd = useCallback(
    (opts?: OpenOptions) => setState((s) => ({ open: true, opts, nonce: s.nonce + 1 })),
    []
  );
  const openEdit = useCallback(
    (editing: Transaction) => setState((s) => ({ open: true, editing, nonce: s.nonce + 1 })),
    []
  );
  const value = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit]);

  // "N" opens quick-add from anywhere (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      openAdd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAdd]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          {state.open && (
            <TransactionForm
              key={state.nonce}
              editing={state.editing}
              opts={state.opts}
              onClose={() => setState((s) => ({ ...s, open: false }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
};

const TYPE_LABEL: Record<FormType, string> = { expense: "Expense", income: "Income", transfer: "Transfer" };

function TransactionForm({
  editing,
  opts,
  onClose,
}: {
  editing?: Transaction;
  opts?: OpenOptions;
  onClose: () => void;
}) {
  const { data, addTransaction, updateTransaction, deleteTransaction, fmt } = useFinance();
  const accounts = data.accounts.filter((a) => !a.archived || a.id === editing?.accountId || a.id === editing?.toAccountId);
  const amountRef = useRef<HTMLInputElement>(null);

  const initialType: FormType =
    editing && editing.type !== "adjustment" ? (editing.type as FormType) : opts?.type ?? "expense";
  const [type, setType] = useState<FormType>(initialType);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : opts?.amount ? String(opts.amount) : "");
  const [category, setCategory] = useState(editing?.category ?? opts?.category ?? "");
  const [accountId, setAccountId] = useState(editing?.accountId ?? opts?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId ?? opts?.toAccountId ?? "");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [note, setNote] = useState(editing?.note ?? opts?.note ?? "");
  const [error, setError] = useState("");

  const cats = data.categories.filter((c) => c.type === (type === "income" ? "income" : "expense"));

  // Smart defaults: the account and category you used last for this type.
  const lastOfType = useMemo(
    () =>
      [...data.transactions]
        .filter((t) => t.type === type)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [data.transactions, type]
  );

  useEffect(() => {
    if (editing) return;
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      const pick =
        (lastOfType && accounts.find((a) => a.id === lastOfType.accountId)?.id) ||
        accounts.find((a) => ACCOUNT_KINDS[a.kind].liquid)?.id ||
        accounts[0]?.id ||
        "";
      setAccountId(pick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, accounts.length]);

  useEffect(() => {
    // Category belongs to the type; reset when it no longer applies.
    if (type === "transfer") return;
    if (category && cats.some((c) => c.name === category)) return;
    setCategory(editing ? category : lastOfType?.category && cats.some((c) => c.name === lastOfType.category) ? lastOfType.category : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  if (accounts.length === 0) {
    return (
      <div className="py-4 text-center">
        <div className="mb-2 text-4xl">🏦</div>
        <DialogTitle>Add an account first</DialogTitle>
        <DialogDescription className="mt-1">
          Transactions live inside accounts (bank, cash, wallet…). It takes ten seconds.
        </DialogDescription>
        <Button asChild className="mt-4" onClick={onClose}>
          <Link to="/wealth?add=1">Add an account</Link>
        </Button>
      </div>
    );
  }

  const acct = accounts.find((a) => a.id === accountId);
  const beforeOpening = acct && date < acct.openingDate;

  const submit = (another: boolean) => {
    const amt = Math.round(parseFloat(amount.replace(/,/g, "")) * 100) / 100;
    if (!Number.isFinite(amt) || amt <= 0) return setError("Enter an amount greater than zero.");
    if (!accountId) return setError("Choose an account.");
    if (type === "transfer") {
      if (!toAccountId) return setError("Choose where the money goes.");
      if (toAccountId === accountId) return setError("From and to accounts must be different.");
    } else if (!category) return setError("Pick a category.");
    if (!date) return setError("Pick a date.");

    const payload = {
      type,
      amount: amt,
      date,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      category: type === "transfer" ? undefined : category,
      note: note.trim() || undefined,
    } as const;

    if (editing) {
      updateTransaction(editing.id, payload);
      toast.success("Saved");
      return onClose();
    }
    addTransaction(payload);
    toast.success(`${TYPE_LABEL[type]} added`, { description: `${fmt(amt, { decimals: amt % 1 !== 0 })}${category ? ` · ${category}` : ""}` });
    if (another) {
      setAmount("");
      setNote("");
      setError("");
      amountRef.current?.focus();
    } else onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
        <DialogDescription className="sr-only">Record money moving in, out, or between your accounts.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Transaction type">
        {(Object.keys(TYPE_LABEL) as FormType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={cn(
              "rounded-md py-1.5 text-sm font-medium transition",
              type === t
                ? t === "income"
                  ? "bg-card text-success shadow-sm"
                  : t === "transfer"
                  ? "bg-card text-foreground shadow-sm"
                  : "bg-card text-destructive shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="tx-amount" className="sr-only">
          Amount
        </Label>
        <Input
          id="tx-amount"
          ref={amountRef}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^0-9.,]/g, ""));
            setError("");
          }}
          className="tabular h-14 text-center text-3xl font-semibold"
        />
      </div>

      {type !== "transfer" && (
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Category</Label>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setCategory(c.name);
                  setError("");
                }}
                aria-pressed={category === c.name}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-sm transition",
                  category === c.name
                    ? "border-primary bg-accent font-medium text-accent-foreground"
                    : "bg-card hover:bg-muted"
                )}
              >
                <span aria-hidden>{c.emoji}</span> {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn("grid gap-3", type === "transfer" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <AccountSelect
          label={type === "transfer" ? "From" : type === "income" ? "Into account" : "Paid from"}
          value={accountId}
          onChange={setAccountId}
          accounts={accounts}
        />
        {type === "transfer" && (
          <AccountSelect
            label="To"
            value={toAccountId}
            onChange={setToAccountId}
            accounts={accounts.filter((a) => a.id !== accountId)}
            placeholder="Choose account"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tx-date" className="mb-1.5 block text-xs text-muted-foreground">
            Date
          </Label>
          <Input id="tx-date" type="date" value={date} max="2999-12-31" onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="tx-note" className="mb-1.5 block text-xs text-muted-foreground">
            Note (optional)
          </Label>
          <Input id="tx-note" value={note} maxLength={120} placeholder="e.g. Dinner" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {beforeOpening && (
        <p className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This is dated before {acct?.name} started tracking ({acct?.openingDate}), so it won't change that balance.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        {editing ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              deleteTransaction(editing.id);
              onClose();
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => submit(true)}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" className="ml-auto">
          {editing ? "Save changes" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function AccountSelect({
  label,
  value,
  onChange,
  accounts,
  placeholder = "Select account",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accounts: { id: string; name: string; kind: keyof typeof ACCOUNT_KINDS }[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {ACCOUNT_KINDS[a.kind].emoji} {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
