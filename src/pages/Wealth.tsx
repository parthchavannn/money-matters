import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Archive, ArchiveRestore, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, SectionTitle, Stat } from "@/components/common";
import { netWorthAsOf, netWorthSeries } from "@/domain/calc";
import { monthLabel, todayISO } from "@/domain/dates";
import { ACCOUNT_KINDS, isLiability } from "@/domain/meta";
import type { Account, AccountKind } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { cn } from "@/lib/utils";

export default function Wealth() {
  const { data, balances, fmt, fmtCompact } = useFinance();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [updating, setUpdating] = useState<Account | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (params.get("add")) {
      setEditing("new");
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const nw = useMemo(() => netWorthAsOf(data.accounts, data.transactions), [data.accounts, data.transactions]);
  const series = useMemo(() => netWorthSeries(data.accounts, data.transactions, 12), [data.accounts, data.transactions]);
  const chart = useMemo(() => {
    const firstOpen = data.accounts.filter((a) => !a.archived).map((a) => a.openingDate).sort()[0];
    return series.filter((p) => !firstOpen || p.month >= firstOpen.slice(0, 7)).map((p) => ({ label: monthLabel(p.month, true), full: monthLabel(p.month), net: Math.round(p.net) }));
  }, [series, data.accounts]);

  const live = data.accounts.filter((a) => !a.archived);
  const archived = data.accounts.filter((a) => a.archived);
  const assets = live.filter((a) => !isLiability(a.kind));
  const debts = live.filter((a) => isLiability(a.kind));

  return (
    <div>
      <PageHeader
        title="Wealth"
        subtitle="Everything you own and owe, in one place."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        }
      />

      {data.accounts.length === 0 ? (
        <EmptyState
          emoji="🏦"
          title="Where does your money live?"
          body="Add your bank accounts, cash, wallets, investments — and anything you owe, like a credit card or loan. Net worth is just the sum."
          action={<Button onClick={() => setEditing("new")}>Add your first account</Button>}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Net worth" value={fmt(nw.net)} tone={nw.net < 0 ? "bad" : "default"} />
            <Stat label="Assets" value={fmt(nw.assets)} />
            <Stat label="Owed" value={fmt(nw.liabilities)} tone={nw.liabilities > 0 ? "warn" : "default"} />
          </div>

          {chart.length >= 2 && (
            <section className="rounded-xl border bg-card p-4">
              <SectionTitle>Net worth, month-end</SectionTitle>
              <div className="h-52 w-full" role="img" aria-label="Net worth over the last months">
                <ResponsiveContainer>
                  <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickLine={false} axisLine={false} width={56} fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtCompact(v)} domain={["auto", "auto"]} />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))" }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow">
                            <div className="text-xs text-muted-foreground">{payload[0].payload.full}</div>
                            <div className="tabular font-semibold">{fmt(payload[0].payload.net)}</div>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#nw)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <AccountGroup title="Assets" accounts={assets} balances={balances} onEdit={setEditing} onUpdate={setUpdating} />
          {debts.length > 0 && <AccountGroup title="Owed" accounts={debts} balances={balances} onEdit={setEditing} onUpdate={setUpdating} />}

          {archived.length > 0 && (
            <div>
              <button className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowArchived((s) => !s)}>
                {showArchived ? "Hide" : "Show"} {archived.length} closed account{archived.length > 1 ? "s" : ""}
              </button>
              {showArchived && <div className="mt-2"><AccountGroup title="Closed" accounts={archived} balances={balances} onEdit={setEditing} onUpdate={setUpdating} muted /></div>}
            </div>
          )}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing !== null && <AccountForm key={editing === "new" ? "new" : editing.id} account={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={updating !== null} onOpenChange={(o) => !o && setUpdating(null)}>
        <DialogContent className="sm:max-w-sm">{updating && <UpdateBalance account={updating} onClose={() => setUpdating(null)} />}</DialogContent>
      </Dialog>
    </div>
  );
}

function AccountGroup({
  title,
  accounts,
  balances,
  onEdit,
  onUpdate,
  muted,
}: {
  title: string;
  accounts: Account[];
  balances: Map<string, number>;
  onEdit: (a: Account) => void;
  onUpdate: (a: Account) => void;
  muted?: boolean;
}) {
  const { fmt } = useFinance();
  if (accounts.length === 0) return null;
  const total = accounts.reduce((s, a) => s + Math.abs(balances.get(a.id) ?? 0), 0);
  return (
    <section>
      <SectionTitle action={<span className="tabular text-xs text-muted-foreground">{fmt(total)}</span>}>{title}</SectionTitle>
      <div className={cn("divide-y rounded-xl border bg-card", muted && "opacity-70")}>
        {accounts.map((a) => {
          const b = balances.get(a.id) ?? 0;
          const liab = isLiability(a.kind);
          return (
            <div key={a.id} className="flex items-center gap-3 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg" aria-hidden>
                {ACCOUNT_KINDS[a.kind].emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{ACCOUNT_KINDS[a.kind].label}</div>
              </div>
              <div className="text-right">
                <div className={cn("tabular text-sm font-semibold", liab && b < 0 && "text-warning", !liab && b < 0 && "text-destructive")}>
                  {liab ? fmt(-b) : fmt(b)}
                </div>
                {liab && b > 0 && <Badge variant="secondary" className="text-[10px]">Overpaid</Badge>}
              </div>
              <div className="flex">
                {!a.archived && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Update ${a.name} balance`} title="Update balance" onClick={() => onUpdate(a)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${a.name}`} onClick={() => onEdit(a)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const parseAmount = (s: string) => Math.round(parseFloat(s.replace(/,/g, "")) * 100) / 100;

function AccountForm({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { data, addAccount, updateAccount, deleteAccount } = useFinance();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "bank");
  const [balance, setBalance] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const [error, setError] = useState("");
  const liab = isLiability(kind);

  // Editing can't flip an account between asset and liability — that would invert its history.
  const kinds = (Object.keys(ACCOUNT_KINDS) as AccountKind[]).filter((k) => !account || isLiability(k) === isLiability(account.kind));

  const save = () => {
    const n = name.trim();
    if (!n) return setError("Give the account a name.");
    if (data.accounts.some((a) => a.id !== account?.id && !a.archived && a.name.toLowerCase() === n.toLowerCase())) return setError("You already have an account with that name.");
    if (account) {
      updateAccount(account.id, { name: n, kind });
      toast.success("Saved");
      return onClose();
    }
    const amt = balance.trim() === "" ? 0 : parseAmount(balance);
    if (!Number.isFinite(amt) || amt < 0) return setError(liab ? "Enter the amount you owe (zero or more)." : "Enter a balance of zero or more.");
    addAccount({ name: n, kind, openingBalance: liab ? -amt : amt, openingDate: asOf || todayISO() });
    toast.success("Account added", { description: n });
    onClose();
  };

  const used = account && data.transactions.some((t) => t.accountId === account.id || t.toAccountId === account.id);

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
        <DialogDescription>
          {account ? "To change the balance, use the refresh button on the account." : "Add things you own, and things you owe."}
        </DialogDescription>
      </DialogHeader>
      <div>
        <Label htmlFor="a-name" className="mb-1.5 block text-xs text-muted-foreground">Name</Label>
        <Input id="a-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Salary, Wallet, Home loan" onKeyDown={(e) => e.key === "Enter" && save()} />
      </div>
      <div>
        <Label className="mb-1.5 block text-xs text-muted-foreground">Type</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as AccountKind)}>
          <SelectTrigger aria-label="Account type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {kinds.map((k) => <SelectItem key={k} value={k}>{ACCOUNT_KINDS[k].emoji} {ACCOUNT_KINDS[k].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!account && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="a-bal" className="mb-1.5 block text-xs text-muted-foreground">{liab ? "Amount owed today" : "Balance today"}</Label>
            <Input id="a-bal" inputMode="decimal" value={balance} placeholder="0" onChange={(e) => setBalance(e.target.value.replace(/[^0-9.,]/g, ""))} onKeyDown={(e) => e.key === "Enter" && save()} />
          </div>
          <div>
            <Label htmlFor="a-asof" className="mb-1.5 block text-xs text-muted-foreground">As of</Label>
            <Input id="a-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {account && (
          <>
            <Button variant="ghost" onClick={() => { updateAccount(account.id, { archived: !account.archived }); toast(account.archived ? "Account reopened" : "Account closed", { description: account.archived ? undefined : "It no longer counts toward net worth. History is kept." }); onClose(); }}>
              {account.archived ? <ArchiveRestore className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
              {account.archived ? "Reopen" : "Close account"}
            </Button>
            {!used && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { deleteAccount(account.id); toast("Account deleted"); onClose(); }}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </>
        )}
        <Button className="ml-auto" onClick={save}>{account ? "Save changes" : "Add account"}</Button>
      </div>
    </div>
  );
}

function UpdateBalance({ account, onClose }: { account: Account; onClose: () => void }) {
  const { balances, reconcile, fmt } = useFinance();
  const liab = isLiability(account.kind);
  const current = balances.get(account.id) ?? 0;
  const shown = liab ? -current : current;
  const [val, setVal] = useState(String(Math.round(shown * 100) / 100));
  const n = parseAmount(val);
  const diff = Number.isFinite(n) ? n - shown : 0;

  const submit = () => {
    if (!Number.isFinite(n) || n < 0) return;
    if (diff !== 0) {
      reconcile(null, [{ accountId: account.id, actual: n }]);
      toast.success("Balance updated", { description: `${account.name}: ${fmt(n)}` });
    }
    onClose();
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Update {account.name}</DialogTitle>
        <DialogDescription>
          Tracked balance is {fmt(shown)}. Enter what it actually {liab ? "owes" : "holds"} now — the difference is logged as an adjustment, not income or spending.
        </DialogDescription>
      </DialogHeader>
      <Input autoFocus inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ""))} className="tabular h-12 text-center text-2xl font-semibold" aria-label="Actual balance" />
      {diff !== 0 && Number.isFinite(diff) && (
        <p className="text-center text-sm text-muted-foreground">
          Adjustment of <span className={cn("font-medium", (liab ? -diff : diff) >= 0 ? "text-success" : "text-destructive")}>{fmt(liab ? -diff : diff, { sign: true })}</span>
        </p>
      )}
      <Button type="submit" className="w-full">Update balance</Button>
    </form>
  );
}
