import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "@/components/ui/use-toast";
import { useMemo, useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as ReTooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Types
interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_date: string;
  transaction_type: string;
  category: string;
  description?: string;
}

const CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
] as const;

type Category = typeof CATEGORIES[number];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Tracker() {
  const { currency, rates, convert, format } = useCurrency();
  const { user } = useAuth();
  const rate = rates[currency.code] ?? 1; // INR -> selected

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyLimitINR, setDailyLimitINR] = useState<number>(0);

  const updateDailyProgress = () => {
    // Update progress bars based on daily tracking
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trackerUpdate'));
    }, 100);
  };

  // Form state
  const [amount, setAmount] = useState<string>(""); // entered in selected currency
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr());

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('transaction_type', 'expense')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toINR = (valueInCurrent: number) => (rate ? valueInCurrent / rate : valueInCurrent);

  const addExpense = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          amount: Math.round(toINR(amt)),
          transaction_date: date,
          transaction_type: 'expense',
          category,
          description: note?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions((prev) => [data, ...prev]);
      setAmount("");
      setNote("");
      setDate(todayStr());
      toast({ title: "Expense added", description: `${category}${note ? ` • ${note}` : ""}` });
      
      // Update daily progress
      updateDailyProgress();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({ title: "Error adding expense", variant: "destructive" });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Entry deleted" });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({ title: "Error deleting expense", variant: "destructive" });
    }
  };

  // Aggregations
  const todaysTotalINR = useMemo(() =>
    transactions.filter((t) => t.transaction_date === todayStr()).reduce((s, t) => s + t.amount, 0),
  [transactions]);

  const weekData = useMemo(() => {
    const arr: { label: string; date: string; totalINR: number }[] = [];
    const start = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = transactions.filter((t) => t.transaction_date === key).reduce((s, t) => s + t.amount, 0);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      arr.push({ label, date: key, totalINR: total });
    }
    return arr;
  }, [transactions]);

  const streakDays = useMemo(() => {
    if (!dailyLimitINR || dailyLimitINR <= 0) return 0;
    let streak = 0;
    const start = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = transactions.filter((t) => t.transaction_date === key).reduce((s, t) => s + t.amount, 0);
      if (total <= dailyLimitINR) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [transactions, dailyLimitINR]);

  const todaysTotalFormatted = format(todaysTotalINR);
  const dailyLimitFormatted = dailyLimitINR > 0 ? format(dailyLimitINR) : "Set a limit";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Daily Tracker – Money Matter</title>
        <meta name="description" content="Quickly log daily expenses, view weekly totals and streaks." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/tracker" />
      </Helmet>
      <div className="px-4 py-4">
        <header className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Daily Tracker</h1>
            <p className="text-muted-foreground">Log expenses in {currency.code}. Data is saved on your device.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Daily limit</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={dailyLimitINR ? Math.round(dailyLimitINR * rate).toString() : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setDailyLimitINR(Number.isFinite(v) ? Math.max(0, toINR(v)) : 0);
                }}
                className="w-28"
                aria-label="Daily spending limit"
              />
            </div>
            <div className="text-sm text-muted-foreground">Streak: <span className="font-medium text-foreground">{streakDays} days</span></div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add expense</CardTitle>
              <CardDescription>Fast entry for today or a past day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Amount ({currency.symbol})</label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" inputMode="decimal" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr()} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Note</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={addExpense}>Add</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly summary</CardTitle>
              <CardDescription>Totals for the last 7 days</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData.map((d) => ({ label: d.label, total: convert(d.totalINR) }))}>
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <ReTooltip formatter={(v: number) => [format(Math.round(toINR(v))), "Spent"]} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-muted-foreground">
                Today: <span className="font-medium text-foreground">{todaysTotalFormatted}</span> • Limit: <span className="font-medium text-foreground">{dailyLimitFormatted}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s expenses</CardTitle>
              <CardDescription>{new Date().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading expenses...</p>
              ) : transactions.filter((t) => t.transaction_date === todayStr()).length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries yet. Add your first expense above.</p>
              ) : (
                <ul className="space-y-3">
                  {transactions.filter((t) => t.transaction_date === todayStr()).map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <div className="font-medium">{t.category}{t.description ? ` • ${t.description}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{t.transaction_date}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{format(t.amount)}</div>
                        <Button variant="outline" onClick={() => deleteExpense(t.id)} aria-label="Delete">Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
        </Card>
      </section>
      </div>
    </div>
  );
}
