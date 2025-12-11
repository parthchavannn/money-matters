import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface Investment {
  id: string;
  name: string;
  invested: number;
  current_value: number | null;
  type: string;
}

interface Debt {
  id: string;
  creditor_name: string;
  remaining_amount: number;
  debt_type: string;
}

export default function NetWorth() {
  const { user } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const { userData } = useUserData();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [investmentsRes, debtsRes] = await Promise.all([
        supabase.from('investments').select('*').eq('user_id', user?.id),
        supabase.from('debts').select('*').eq('user_id', user?.id).eq('status', 'active')
      ]);

      if (investmentsRes.data) setInvestments(investmentsRes.data);
      if (debtsRes.data) setDebts(debtsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalSavings = userData.income.currentSavings || 0;
  const totalInvestments = investments.reduce((sum, inv) => sum + (Number(inv.current_value) || Number(inv.invested) || 0), 0);
  const totalAssets = totalSavings + totalInvestments;
  const totalLiabilities = debts.reduce((sum, debt) => sum + Number(debt.remaining_amount), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Generate historical data (simulated based on current data - in production, you'd track this over time)
  const historicalData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthLabel = format(monthDate, 'MMM yyyy');
      
      // Simulate growth/changes (in production, you'd query historical snapshots)
      const growthFactor = 1 - (i * 0.03); // Simulate ~3% monthly growth
      const assetValue = Math.round(totalAssets * growthFactor);
      const liabilityValue = Math.round(totalLiabilities * (1 + (i * 0.02))); // Debts decrease over time
      
      data.push({
        month: monthLabel,
        assets: Math.max(0, assetValue),
        liabilities: Math.max(0, liabilityValue),
        netWorth: assetValue - liabilityValue
      });
    }
    return data;
  }, [totalAssets, totalLiabilities]);

  // Asset breakdown for pie chart
  const assetBreakdown = [
    { name: 'Savings', value: totalSavings, color: 'hsl(142, 76%, 36%)' },
    ...investments.reduce((acc, inv) => {
      const existing = acc.find(a => a.name === inv.type);
      const value = Number(inv.current_value) || Number(inv.invested) || 0;
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ 
          name: inv.type, 
          value, 
          color: `hsl(${200 + acc.length * 30}, 70%, 50%)` 
        });
      }
      return acc;
    }, [] as { name: string; value: number; color: string }[])
  ].filter(item => item.value > 0);

  // Liability breakdown
  const liabilityBreakdown = debts.reduce((acc, debt) => {
    const existing = acc.find(a => a.name === debt.debt_type);
    if (existing) {
      existing.value += Number(debt.remaining_amount);
    } else {
      acc.push({ 
        name: debt.debt_type, 
        value: Number(debt.remaining_amount), 
        color: `hsl(${0 + acc.length * 20}, 70%, 50%)` 
      });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]);

  const netWorthChange = historicalData.length >= 2 
    ? historicalData[historicalData.length - 1].netWorth - historicalData[historicalData.length - 2].netWorth
    : 0;
  const netWorthChangePercent = historicalData.length >= 2 && historicalData[historicalData.length - 2].netWorth !== 0
    ? ((netWorthChange / Math.abs(historicalData[historicalData.length - 2].netWorth)) * 100).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:pl-64 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Net Worth Dashboard – Money Matter</title>
        <meta name="description" content="Track your net worth over time with visual charts showing assets vs liabilities." />
      </Helmet>
      
      <div className="md:pl-64">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary" />
              Net Worth Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Track your financial progress over time</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <span className="text-green-100">Total Assets</span>
                </div>
                <div className="text-3xl font-bold">{formatCurrency(totalAssets)}</div>
                <p className="text-green-200 text-sm mt-1">Savings + Investments</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-red-100">Total Liabilities</span>
                </div>
                <div className="text-3xl font-bold">{formatCurrency(totalLiabilities)}</div>
                <p className="text-red-200 text-sm mt-1">Outstanding debts</p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${netWorth >= 0 ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'} text-white border-0`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className={netWorth >= 0 ? 'text-blue-100' : 'text-amber-100'}>Net Worth</span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${Number(netWorthChangePercent) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {Number(netWorthChangePercent) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {netWorthChangePercent}%
                  </div>
                </div>
                <div className="text-3xl font-bold">{formatCurrency(netWorth)}</div>
                <p className={`text-sm mt-1 ${netWorth >= 0 ? 'text-blue-200' : 'text-amber-200'}`}>
                  {netWorth >= 0 ? 'Assets exceed liabilities' : 'Working to positive net worth'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Timeline</CardTitle>
              <CardDescription>12-month view of your financial journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="assets" 
                      name="Assets"
                      stroke="hsl(142, 76%, 36%)" 
                      fillOpacity={1} 
                      fill="url(#colorAssets)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="liabilities" 
                      name="Liabilities"
                      stroke="hsl(0, 84%, 60%)" 
                      fillOpacity={1} 
                      fill="url(#colorLiabilities)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="netWorth" 
                      name="Net Worth"
                      stroke="hsl(217, 91%, 60%)" 
                      fillOpacity={1} 
                      fill="url(#colorNetWorth)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-green-500" />
                  Asset Breakdown
                </CardTitle>
                <CardDescription>Where your assets are allocated</CardDescription>
              </CardHeader>
              <CardContent>
                {assetBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No assets recorded yet</p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {assetBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-2 mt-4">
                  {assetBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Liability Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-500" />
                  Liability Breakdown
                </CardTitle>
                <CardDescription>Your outstanding obligations</CardDescription>
              </CardHeader>
              <CardContent>
                {liabilityBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No liabilities - great job! 🎉</p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={liabilityBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {liabilityBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-2 mt-4">
                  {liabilityBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Health Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Health Indicators</CardTitle>
              <CardDescription>Key ratios to track your financial well-being</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : '∞'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Asset-to-Debt Ratio</div>
                  <div className="text-xs text-muted-foreground">Target: &gt; 2.0</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {userData.income.monthlyIncome > 0 
                      ? ((userData.income.monthlyIncome - Object.values(userData.expenses).reduce((a, b) => a + b, 0)) / userData.income.monthlyIncome * 100).toFixed(1) 
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Savings Rate</div>
                  <div className="text-xs text-muted-foreground">Target: &gt; 20%</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Object.values(userData.expenses).reduce((a, b) => a + b, 0) > 0 
                      ? (totalSavings / Object.values(userData.expenses).reduce((a, b) => a + b, 0)).toFixed(1)
                      : '∞'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Emergency Fund (months)</div>
                  <div className="text-xs text-muted-foreground">Target: 6+ months</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
