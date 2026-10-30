import { useRef, useState } from "react";
import { Download, FileSpreadsheet, FlaskConical, Plus, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionTitle } from "@/components/common";
import { CURRENCIES } from "@/domain/meta";
import type { ThemePref } from "@/domain/types";
import { useFinance } from "@/store/FinanceContext";
import { download, exportJSON, exportTransactionsCSV, parseImport } from "@/store/storage";
import { todayISO } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { useAuth } from "@/cloud/AuthContext";
import { useSync } from "@/cloud/syncContext";
import { purgeUserCache } from "@/store/storage";
import SyncBadge from "@/components/SyncBadge";
import { LogOut } from "lucide-react";

type Confirm = null | "reset" | "sample" | { import: ReturnType<typeof parseImport> & { ok: true } };

export default function Settings() {
  const { data, updateSettings, addCategory, removeCategory, replaceAll, loadSample, resetAll } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");

  const onFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const res = parseImport(text);
    if ("error" in res) return toast.error("Couldn't import", { description: res.error });
    setConfirm({ import: res });
  };

  const addCat = () => {
    const name = catName.trim();
    if (!name) return;
    if (!addCategory({ name, emoji: catEmoji.trim() || "🏷️", type: catType })) return toast.error("That category already exists.");
    setCatName("");
    setCatEmoji("");
  };

  const auth = useAuth();
  const sync = useSync();
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [busy, setBusy] = useState(false);

  const doSignOut = async () => {
    if (!auth.user) return;
    setBusy(true);
    await sync.flush();
    if (sync.hasUnsynced() && !window.confirm("Some recent changes haven't reached the server yet and will be lost if you sign out. Sign out anyway?")) {
      setBusy(false);
      return;
    }
    const id = auth.user.id;
    await auth.signOut();
    purgeUserCache(id);
    setBusy(false);
  };

  const doDelete = async () => {
    if (!auth.user) return;
    setBusy(true);
    const id = auth.user.id;
    const r = await auth.deleteAccount();
    setBusy(false);
    if (r.error) return toast.error("Couldn't delete your account", { description: r.error });
    purgeUserCache(id);
    setDeleting(false);
  };

  const counts = { t: data.transactions.length, a: data.accounts.length };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Settings" />

      {auth.enabled && auth.user && (
        <section className="space-y-3">
          <SectionTitle>Account</SectionTitle>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Signed in as</div>
                <div className="truncate text-sm font-medium">{auth.user.email}</div>
              </div>
              <SyncBadge />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={doSignOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleteText(""); setDeleting(true); }}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete account &amp; data
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle>Profile & display</SectionTitle>
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-name" className="mb-1.5 block text-xs text-muted-foreground">Your name</Label>
            <Input id="s-name" value={data.settings.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="What should we call you?" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Currency</Label>
            <Select value={data.settings.currency} onValueChange={(v) => updateSettings({ currency: v })}>
              <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Theme</Label>
            <div className="inline-flex rounded-lg bg-muted p-0.5">
              {(["system", "light", "dark"] as ThemePref[]).map((t) => (
                <button key={t} onClick={() => updateSettings({ theme: t })} aria-pressed={data.settings.theme === t} className={cn("rounded-md px-4 py-1.5 text-sm font-medium capitalize", data.settings.theme === t ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Changing currency only changes how amounts are displayed — it doesn't convert anything you've entered.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Categories</SectionTitle>
        <div className="rounded-xl border bg-card p-4">
          {(["expense", "income"] as const).map((type) => (
            <div key={type} className="mb-4">
              <div className="mb-2 text-xs font-medium capitalize text-muted-foreground">{type}</div>
              <div className="flex flex-wrap gap-1.5">
                {data.categories.filter((c) => c.type === type).map((c) => (
                  <span key={c.name} className="group inline-flex items-center gap-1 rounded-full border bg-background py-1 pl-2.5 pr-1.5 text-sm">
                    <span aria-hidden>{c.emoji}</span> {c.name}
                    <button onClick={() => removeCategory(c.name)} aria-label={`Remove ${c.name}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Input value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} placeholder="🏷️" maxLength={4} className="w-16 text-center" aria-label="Emoji" />
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="New category" className="min-w-0 flex-1" aria-label="Category name" />
            <Select value={catType} onValueChange={(v) => setCatType(v as "expense" | "income")}>
              <SelectTrigger className="w-28" aria-label="Category type"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
            </Select>
            <Button onClick={addCat} disabled={!catName.trim()}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Removing a category keeps your past transactions as they are. It only stops being offered for new ones.</p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Your data</SectionTitle>
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {auth.enabled ? "Your data is saved to your account and cached on this device, so it works offline and syncs everywhere you sign in. A backup is still handy before big changes." : "Everything is stored privately in this browser — nothing is uploaded. Clearing site data erases it, so download a backup now and then. (Set up a backend to enable accounts and sync — see the README.)"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { download(`money-matter-backup-${todayISO()}.json`, exportJSON(data), "application/json"); toast.success("Backup downloaded"); }}>
              <Download className="mr-1.5 h-4 w-4" /> Backup (JSON)
            </Button>
            <Button variant="outline" disabled={counts.t === 0} onClick={() => download(`transactions-${todayISO()}.csv`, exportTransactionsCSV(data), "text/csv")}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Transactions (CSV)
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> Restore backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="text-xs text-muted-foreground">{counts.a} accounts · {counts.t} transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => (counts.t || counts.a ? setConfirm("sample") : loadSample())}>
            <FlaskConical className="mr-1.5 h-4 w-4" /> Load demo data
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirm("reset")}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Erase everything
          </Button>
        </div>
      </section>

      <AlertDialog open={deleting} onOpenChange={(o) => !busy && setDeleting(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account and all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your login and everything stored for you on our servers and on this device. It can't be undone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteText !== "DELETE" || busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); void doDelete(); }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "reset" ? "Erase all data?" : confirm === "sample" ? "Replace your data with the demo?" : "Replace your data with this backup?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "All accounts, transactions, budgets and goals will be deleted from this browser" + (auth.enabled ? " and from your account's synced copy (your login stays)" : "") + ". This can't be undone — download a backup first if unsure."
                : confirm === "sample"
                ? "Your current accounts and transactions will be replaced by made-up demo data. Download a backup first if you want to keep them."
                : confirm && typeof confirm === "object"
                ? `This backup has ${confirm.import.data.accounts.length} accounts and ${confirm.import.data.transactions.length} transactions. Your current data will be replaced.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(confirm === "reset" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => {
                if (confirm === "reset") { resetAll(); toast("All data erased"); }
                else if (confirm === "sample") { loadSample(); toast.success("Demo data loaded"); }
                else if (confirm && typeof confirm === "object") { replaceAll(confirm.import.data); toast.success("Backup restored"); }
                setConfirm(null);
              }}
            >
              {confirm === "reset" ? "Erase everything" : "Replace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
