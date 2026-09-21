import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet, Edit, Trash2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { useMonthly } from "@/hooks/useMonthly";
import { ASSET_TYPES, AccountRow } from "@/lib/monthly";

export default function Accounts() {
  const { format } = useCurrency();
  const { user, accounts, balances, loading, refresh } = useMonthly();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [notes, setNotes] = useState("");

  const latestBalance = (accountId: string) => {
    const rows = balances
      .filter((b) => b.account_id === accountId)
      .sort((a, b) => a.month.localeCompare(b.month));
    return rows.length ? rows[rows.length - 1].balance : null;
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setType("bank");
    setNotes("");
    setOpen(true);
  };

  const openEdit = (a: AccountRow) => {
    setEditing(a);
    setName(a.name);
    setType(a.type);
    setNotes(a.notes || "");
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please give this place a name");
      return;
    }
    const payload = {
      user_id: user.id,
      name: name.trim(),
      type,
      notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("accounts").update(payload).eq("id", editing.id)
      : await supabase.from("accounts").insert(payload);
    if (error) {
      toast.error("Could not save. Please try again.");
      return;
    }
    toast.success(editing ? "Updated" : "Added");
    setOpen(false);
    refresh();
  };

  const remove = async (a: AccountRow) => {
    const { error } = await supabase.from("accounts").delete().eq("id", a.id);
    if (error) {
      toast.error("Could not remove it");
      return;
    }
    toast.success(`${a.name} removed`);
    refresh();
  };

  return (
    <>
      <Helmet>
        <title>Where your money sits | Money Matter</title>
        <meta
          name="description"
          content="Add the bank accounts, cash and wallets you want to check each month."
        />
      </Helmet>

      <div className="p-4 md:p-8 md:pl-72 space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Where your money sits
            </h1>
            <p className="text-sm text-muted-foreground">
              Add each bank account, cash pile or wallet once. Each month you
              just type in what's left in them.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add a place
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <Landmark className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Nothing added yet</p>
              <p className="text-sm text-muted-foreground">
                Start with your main bank account. You can add cash and wallets
                later.
              </p>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const bal = latestBalance(a.id);
              return (
                <Card key={a.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="truncate">{a.name}</span>
                      <Badge variant="secondary" className="capitalize">
                        {ASSET_TYPES.find((t) => t.value === a.type)?.label ||
                          a.type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Last amount you entered
                      </p>
                      <p className="text-xl font-bold">
                        {bal === null ? "—" : format(bal)}
                      </p>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground">{a.notes}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(a)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => remove(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit this place" : "Add a place for your money"}
            </DialogTitle>
            <DialogDescription>
              For example "HDFC Savings", "Cash at home" or "Mutual funds".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HDFC Savings"
              />
            </div>
            <div>
              <Label>Kind</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="acc-notes">Note (optional)</Label>
              <Input
                id="acc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Salary account"
              />
            </div>
            <Button className="w-full" onClick={save}>
              {editing ? "Save changes" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
