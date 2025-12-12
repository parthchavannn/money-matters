import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calculator, TrendingDown, Snowflake, Flame, Calendar, DollarSign, Clock, Target } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Debt {
  id: string;
  creditor_name: string;
  debt_type: string;
  remaining_amount: number;
  interest_rate: number | null;
  minimum_payment: number | null;
}

interface PayoffScheduleItem {
  month: number;
  date: string;
  debts: { [key: string]: number };
  totalRemaining: number;
  totalPaid: number;
}

const DebtPayoffCalculator = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { format: formatAmount } = useCurrency();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) {
      loadDebts();
    }
  }, [user, authLoading, navigate]);

  const loadDebts = async () => {
    try {
      const { data, error } = await supabase
        .from("debts")
        .select("id, creditor_name, debt_type, remaining_amount, interest_rate, minimum_payment")
        .eq("status", "active")
        .order("interest_rate", { ascending: false });

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error("Error loading debts:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => {
      if (strategy === "avalanche") {
        return (b.interest_rate || 0) - (a.interest_rate || 0);
      } else {
        return a.remaining_amount - b.remaining_amount;
      }
    });
  }, [debts, strategy]);

  const calculatePayoffSchedule = useMemo(() => {
    if (debts.length === 0) return { schedule: [], totalInterest: 0, months: 0 };

    const schedule: PayoffScheduleItem[] = [];
    const debtBalances = new Map<string, number>();
    debts.forEach(d => debtBalances.set(d.id, d.remaining_amount));

    const totalMinPayments = debts.reduce((sum, d) => sum + (d.minimum_payment || 50), 0);
    const monthlyBudget = totalMinPayments + extraPayment;

    let month = 0;
    let totalInterest = 0;
    const maxMonths = 360;

    while ([...debtBalances.values()].some(b => b > 0) && month < maxMonths) {
      month++;
      const date = new Date();
      date.setMonth(date.getMonth() + month);

      let availableExtra = extraPayment;
      const priorityOrder = [...sortedDebts].filter(d => (debtBalances.get(d.id) || 0) > 0);

      // Apply minimum payments and interest first
      priorityOrder.forEach(debt => {
        let balance = debtBalances.get(debt.id) || 0;
        if (balance <= 0) return;

        // Add monthly interest
        const monthlyRate = (debt.interest_rate || 0) / 100 / 12;
        const interest = balance * monthlyRate;
        totalInterest += interest;
        balance += interest;

        // Apply minimum payment
        const minPayment = Math.min(debt.minimum_payment || 50, balance);
        balance -= minPayment;

        debtBalances.set(debt.id, Math.max(0, balance));
      });

      // Apply extra payment to highest priority debt
      for (const debt of priorityOrder) {
        let balance = debtBalances.get(debt.id) || 0;
        if (balance <= 0 || availableExtra <= 0) continue;

        const extraToApply = Math.min(availableExtra, balance);
        balance -= extraToApply;
        availableExtra -= extraToApply;

        debtBalances.set(debt.id, Math.max(0, balance));
      }

      const debtSnapshot: { [key: string]: number } = {};
      let totalRemaining = 0;
      debtBalances.forEach((balance, id) => {
        debtSnapshot[id] = balance;
        totalRemaining += balance;
      });

      schedule.push({
        month,
        date: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        debts: debtSnapshot,
        totalRemaining,
        totalPaid: debts.reduce((sum, d) => sum + d.remaining_amount, 0) - totalRemaining + totalInterest
      });
    }

    return { schedule, totalInterest, months: month };
  }, [debts, sortedDebts, extraPayment]);

  const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalMinPayments = debts.reduce((sum, d) => sum + (d.minimum_payment || 50), 0);
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + calculatePayoffSchedule.months);

  const chartData = calculatePayoffSchedule.schedule.filter((_, i) => i % Math.max(1, Math.floor(calculatePayoffSchedule.schedule.length / 24)) === 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Debt Payoff Calculator | FinanceFlow</title>
        <meta name="description" content="Calculate your debt payoff timeline with Snowball and Avalanche strategies" />
      </Helmet>

      <div className="md:pl-64">
        <main className="min-h-screen bg-background pb-24 md:pb-8">
          <div className="container max-w-6xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Debt Payoff Calculator</h1>
                <p className="text-muted-foreground">Compare strategies and plan your debt-free date</p>
              </div>
            </div>

            {debts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Debts</h3>
                  <p className="text-muted-foreground mb-4">Add debts in the Debts page to use the payoff calculator</p>
                  <Button onClick={() => navigate("/debts")}>Go to Debts</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Strategy Selection */}
                <Tabs value={strategy} onValueChange={(v) => setStrategy(v as "avalanche" | "snowball")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="avalanche" className="flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      Avalanche
                    </TabsTrigger>
                    <TabsTrigger value="snowball" className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4" />
                      Snowball
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="avalanche" className="mt-4">
                    <Card className="border-orange-500/20 bg-orange-500/5">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Avalanche Method:</strong> Pay off highest interest rate debts first. 
                          This minimizes total interest paid and is mathematically optimal.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="snowball" className="mt-4">
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Snowball Method:</strong> Pay off smallest balances first.
                          Quick wins provide motivation to keep going.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Extra Payment Input */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Extra Monthly Payment
                    </CardTitle>
                    <CardDescription>Add extra amount beyond minimum payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="extra-payment">Extra Payment Amount</Label>
                        <Input
                          id="extra-payment"
                          type="number"
                          placeholder="0"
                          value={extraPayment || ""}
                          onChange={(e) => setExtraPayment(Number(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Monthly</p>
                        <p className="text-xl font-bold text-primary">{formatAmount(totalMinPayments + extraPayment)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-muted-foreground">Total Debt</span>
                      </div>
                      <p className="text-xl font-bold">{formatAmount(totalDebt)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Months to Payoff</span>
                      </div>
                      <p className="text-xl font-bold">{calculatePayoffSchedule.months}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Debt-Free Date</span>
                      </div>
                      <p className="text-lg font-bold">{payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-muted-foreground">Total Interest</span>
                      </div>
                      <p className="text-xl font-bold">{formatAmount(calculatePayoffSchedule.totalInterest)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payoff Timeline Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payoff Timeline</CardTitle>
                    <CardDescription>Projected debt balance over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            className="fill-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            className="fill-muted-foreground"
                          />
                          <Tooltip 
                            formatter={(value: number) => formatAmount(value)}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalRemaining"
                            name="Remaining Debt"
                            stroke="hsl(var(--destructive))"
                            fill="hsl(var(--destructive) / 0.2)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Debt Priority Order */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Priority Order</CardTitle>
                    <CardDescription>
                      {strategy === "avalanche" 
                        ? "Ordered by highest interest rate first" 
                        : "Ordered by smallest balance first"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sortedDebts.map((debt, index) => (
                      <div key={debt.id} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{debt.creditor_name}</span>
                            <Badge variant="outline">{debt.debt_type}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{formatAmount(debt.remaining_amount)}</span>
                            <span>{debt.interest_rate || 0}% APR</span>
                          </div>
                          <Progress 
                            value={100} 
                            className="h-1.5 mt-2"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default DebtPayoffCalculator;
