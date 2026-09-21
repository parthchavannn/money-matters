import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { useMonthly } from "@/hooks/useMonthly";
import {
  buildSummaries,
  currentMonthKey,
  lastNMonthKeys,
  monthLabel,
} from "@/lib/monthly";

export default function MonthlyCheckin() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const { user, accounts, balances, checkins, loading, refresh } = useMonthly();

  const [month, setMonth] = useState(currentMonthKey());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [income, setIncome] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const activeAccounts = accounts.filter((a) => a.is_active);

  // Prefill from what is already saved for the chosen month
  useEffect(() => {
    const next: Record<string, string> = {};
    activeAccounts.forEach((a) => {
      const row = balances.find(
        (b) => b.account_id === a.id && b.month === month
      );
      next[a.id] = row ? String(row.balance) : "";
    });
    setAmounts(next);
    const chk = checkins.find((c) => c.month === month);
    setIncome(chk ? String(chk.income) : "");
    setNote(chk?.note || "");
  }, [month, accounts, balances, checkins]);

  const totalNow = useMemo(
    () =>
      activeAccounts.reduce(
        (s, a) => s + (parseFloat(amounts[a.id] || "0") || 0),
        0
      ),
    [amounts, activeAccounts]
  );

  const previousTotal = useMemo(() => {
    const earlier = balances.filter((b) => b.month < month);
    if (!earlier.length) return null;
    const lastMonth = earlier
      .map((b) => b.month)
      .sort()
      .slice(-1)[0];
    return earlier
      .filter((b) => b.month === lastMonth)
      .reduce((s, b) => s + b.balance, 0);
  }, [balances, month]);

  const saved = previousTotal === null ? null : totalNow - previousTotal;
  const incomeNum = parseFloat(income || "0") || 0;
  const spent = saved === null ? null : incomeNum - saved;

  const save = async () => {
    if (!user) return;
    if (!activeAccounts.length) {
      toast.error("Add at least one account first");
      return;
    }
    setSaving(true);
    const balanceRows = activeAccounts.map((a) => ({
      user_id: user.id,
      account_id: a.id,
      month,
      balance: parseFloat(amounts[a.id] || "0") || 0,
    }));

    const [balRes, chkRes] = await Promise.all([
      supabase
        .from("account_balances")
        .upsert(balanceRows, { onConflict: "account_id,month" }),
      supabase.from("monthly_checkins").upsert(
        {
          user_id: user.id,
          month,
          income: incomeNum,
          note: note.trim() || null,
        },
        { onConflict: "user_id,month" }
      ),
    ]);
    setSaving(false);

    if (balRes.error || chkRes.error) {
      console.error(balRes.error || chkRes.error);
      toast.error("Could not save your check-in. Please try again.");
      return;
    }
    await refresh();
    toast.success(`${monthLabel(month)} saved`);
    navigate("/dashboard");
  };

  const monthOptions = lastNMonthKeys(18);
  const preview = buildSummaries(balances, checkins);
  const alreadySaved = preview.some((s) => s.month === month && s.hasCheckin);

  return (
    <>
      <Helmet>
        <title>Monthly check-in | Money Matter</title>
        <meta
          name="description"
          content="Enter your month-end balances once a month and see whether you saved or overspent."
        />
      </Helmet>

      <div className="p-4 md:p-8 md:pl-72 space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Monthly check-in
          </h1>
          <p className="text-sm text-muted-foreground">
            Once a month, type in what's left in each account and what you
            earned. That's it — we work out the rest.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : activeAccounts.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">First, add where your money sits</p>
              <Button asChild>
                <Link to="/accounts">Add an account</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {alreadySaved ? "Update" : "Fill in"} {monthLabel(month)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Which month?</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                          {monthLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Balance at the end of the month
                  </p>
                  {activeAccounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Label htmlFor={`bal-${a.id}`} className="flex-1">
                        {a.name}
                      </Label>
                      <Input
                        id={`bal-${a.id}`}
                        type="number"
                        inputMode="decimal"
                        className="w-40"
                        placeholder="0"
                        value={amounts[a.id] ?? ""}
                        onChange={(e) =>
                          setAmounts((p) => ({ ...p, [a.id]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="income">Money you received this month</Label>
                  <Input
                    id="income"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Salary, business income, rent, gifts — everything that came
                    in.
                  </p>
                </div>

                <div>
                  <Label htmlFor="note">Anything unusual? (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Bought a phone, wedding gift, bonus..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save this month"}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">What this means</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total money you have
                  </p>
                  <p className="text-2xl font-bold">{format(totalNow)}</p>
                </div>
                {saved === null ? (
                  <p className="text-sm text-muted-foreground">
                    This is your first month. Next month we'll be able to show
                    whether you saved or overspent.
                  </p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Compared to last entry
                      </p>
                      <p
                        className={`text-xl font-bold flex items-center gap-1 ${
                          saved >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {saved >= 0 ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                        {saved >= 0 ? "+" : "-"}
                        {format(Math.abs(saved))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Roughly what you spent
                      </p>
                      <p className="text-xl font-bold">
                        {format(Math.max(0, spent ?? 0))}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
