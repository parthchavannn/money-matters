import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, TrendingUp, TrendingDown, Wallet, PiggyBank, Target, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  expensesByCategory: Record<string, number>;
  goalProgress: { title: string; current: number; target: number; percentage: number }[];
  debtPayments: number;
  investmentValue: number;
}

export default function FinancialReport() {
  const { format: formatCurrency } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") };
  });

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth]);

  const fetchReportData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const [transactionsRes, goalsRes, debtsRes, investmentsRes, profileRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd")),
      supabase.from("goals").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id).eq("status", "active"),
      supabase.from("investments").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("monthly_income").eq("user_id", user.id).maybeSingle()
    ]);

    const transactions = transactionsRes.data || [];
    const goals = goalsRes.data || [];
    const debts = debtsRes.data || [];
    const investments = investmentsRes.data || [];
    const profile = profileRes.data;

    const income = profile?.monthly_income || 0;
    setMonthlyIncome(Number(income));

    const totalExpenses = transactions
      .filter(t => t.transaction_type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.transaction_type === "expense")
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
      });

    const goalProgress = goals.map(g => ({
      title: g.title,
      current: Number(g.current_amount) || 0,
      target: Number(g.target_amount),
      percentage: Math.round(((Number(g.current_amount) || 0) / Number(g.target_amount)) * 100)
    }));

    const debtPayments = debts.reduce((sum, d) => sum + (Number(d.monthly_payment) || 0), 0);
    const investmentValue = investments.reduce((sum, i) => sum + (Number(i.current_value) || Number(i.invested)), 0);

    setReportData({
      totalIncome: income,
      totalExpenses,
      netSavings: Number(income) - totalExpenses - debtPayments,
      expensesByCategory,
      goalProgress,
      debtPayments,
      investmentValue
    });
    setLoading(false);
  };

  const exportReport = () => {
    if (!reportData) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const monthName = format(new Date(year, month - 1), "MMMM yyyy");

    let csvContent = `Financial Report - ${monthName}\n\n`;
    csvContent += `SUMMARY\n`;
    csvContent += `Total Income,${reportData.totalIncome}\n`;
    csvContent += `Total Expenses,${reportData.totalExpenses}\n`;
    csvContent += `Debt Payments,${reportData.debtPayments}\n`;
    csvContent += `Net Savings,${reportData.netSavings}\n`;
    csvContent += `Investment Value,${reportData.investmentValue}\n\n`;

    csvContent += `EXPENSES BY CATEGORY\n`;
    Object.entries(reportData.expensesByCategory).forEach(([cat, amount]) => {
      csvContent += `${cat},${amount}\n`;
    });

    csvContent += `\nGOAL PROGRESS\n`;
    reportData.goalProgress.forEach(g => {
      csvContent += `${g.title},${g.current},${g.target},${g.percentage}%\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const savingsRate = monthlyIncome > 0 
    ? Math.round(((reportData?.netSavings || 0) / monthlyIncome) * 100) 
    : 0;

  return (
    <>
      <Helmet>
        <title>Financial Report | Finance Tracker</title>
      </Helmet>

      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Financial Report
            </h1>
            <p className="text-muted-foreground text-sm">Monthly summary of your finances</p>
          </div>

          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportReport} disabled={!reportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading report...</div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Income</span>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(reportData.totalIncome)}</p>
                </CardContent>
              </Card>

              <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-medium">Expenses</span>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(reportData.totalExpenses)}</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <PiggyBank className="h-4 w-4" />
                    <span className="text-xs font-medium">Net Savings</span>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(reportData.netSavings)}</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs font-medium">Savings Rate</span>
                  </div>
                  <p className="text-xl font-bold">{savingsRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(reportData.expensesByCategory).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No expenses recorded this month</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(reportData.expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => {
                        const percentage = Math.round((amount / reportData.totalExpenses) * 100);
                        return (
                          <div key={category}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize">{category}</span>
                              <span className="font-medium">{formatCurrency(amount)} ({percentage}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goals Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.goalProgress.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No goals set</p>
                ) : (
                  <div className="space-y-4">
                    {reportData.goalProgress.map((goal, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{goal.title}</span>
                          <span className="font-medium">{goal.percentage}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Debt Payments</p>
                      <p className="text-2xl font-bold">{formatCurrency(reportData.debtPayments)}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Investment Portfolio</p>
                      <p className="text-2xl font-bold">{formatCurrency(reportData.investmentValue)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
