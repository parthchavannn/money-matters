import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  transaction_date: string;
  transaction_type: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function SpendingTrends() {
  const { format: formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("6");

  useEffect(() => {
    fetchTransactions();
  }, [timeRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = startOfMonth(subMonths(new Date(), parseInt(timeRange) - 1));

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
      .order("transaction_date", { ascending: true });

    setTransactions(data || []);
    setLoading(false);
  };

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, "yyyy-MM");
      months[key] = 0;
    }

    transactions.forEach(t => {
      const key = format(parseISO(t.transaction_date), "yyyy-MM");
      if (months[key] !== undefined) {
        months[key] += Number(t.amount);
      }
    });

    return Object.entries(months).map(([month, amount]) => ({
      month: format(parseISO(`${month}-01`), "MMM yy"),
      amount
    }));
  }, [transactions, timeRange]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const categoryTrends = useMemo(() => {
    const trends: Record<string, Record<string, number>> = {};
    
    transactions.forEach(t => {
      const month = format(parseISO(t.transaction_date), "MMM yy");
      if (!trends[month]) trends[month] = {};
      trends[month][t.category] = (trends[month][t.category] || 0) + Number(t.amount);
    });

    const categories = [...new Set(transactions.map(t => t.category))];
    return Object.entries(trends).map(([month, data]) => ({
      month,
      ...categories.reduce((acc, cat) => ({ ...acc, [cat]: data[cat] || 0 }), {})
    }));
  }, [transactions]);

  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgMonthly = totalSpent / parseInt(timeRange);
  
  const currentMonth = monthlyData[monthlyData.length - 1]?.amount || 0;
  const prevMonth = monthlyData[monthlyData.length - 2]?.amount || 0;
  const monthChange = prevMonth > 0 ? ((currentMonth - prevMonth) / prevMonth) * 100 : 0;

  const categories = [...new Set(transactions.map(t => t.category))];

  return (
    <>
      <Helmet>
        <title>Spending Trends | Finance Tracker</title>
      </Helmet>

      <div className="space-y-6 pb-20 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Spending Trends
            </h1>
            <p className="text-muted-foreground text-sm">Analyze your spending patterns over time</p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading trends...</div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No spending data available. Start tracking expenses to see trends.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Monthly Average</p>
                  <p className="text-2xl font-bold">{formatCurrency(avgMonthly)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">{formatCurrency(currentMonth)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">vs Last Month</p>
                  <div className="flex items-center gap-1">
                    {monthChange >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-emerald-500" />
                    )}
                    <span className={`text-2xl font-bold ${monthChange >= 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {Math.abs(monthChange).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Spending Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Spent"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryData.slice(0, 6).map((cat, idx) => {
                    const percentage = (cat.value / totalSpent) * 100;
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ background: COLORS[idx % COLORS.length] }}
                            />
                            <span className="capitalize">{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percentage}%`, background: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Category Trends Over Time */}
            {categoryTrends.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        />
                        <Legend />
                        {categories.slice(0, 5).map((cat, idx) => (
                          <Bar 
                            key={cat} 
                            dataKey={cat} 
                            fill={COLORS[idx % COLORS.length]} 
                            stackId="a"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
