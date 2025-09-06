import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserData } from "@/context/UserDataContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/dashboard/KPICard";
import { WhatsChangedCard } from "@/components/dashboard/WhatsChangedCard";
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { CalendarDays, Filter } from "lucide-react";
import { endOfMonth, startOfMonth, subMonths, format as formatDate } from "date-fns";
import type { BudgetPlan } from "@/utils/budget";

export default function Dashboard() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const { userData } = useUserData();
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [streakDays, setStreakDays] = useState(0);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('🍔 Food & Dining');
  const [note, setNote] = useState('');
  const [dateFilter, setDateFilter] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (user) {
      loadUserGoals();
      loadRecentTransactions();
      loadDebts();
      loadInvestments();
      calculateStreak();
    }
  }, [user]);

  const loadUserGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .limit(3);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100); // Load more for analysis

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('Error loading debts:', error);
    }
  };

  const loadInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error loading investments:', error);
    }
  };

  const calculateStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      let streak = 0;
      const today = new Date();
      const dates = data?.map(t => new Date(t.transaction_date)) || [];
      
      // Check for consecutive days with transactions
      for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const hasTransaction = dates.some(date => 
          date.toDateString() === checkDate.toDateString()
        );
        
        if (hasTransaction) {
          streak++;
        } else {
          break;
        }
      }
      
      setStreakDays(streak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  const logExpense = async () => {
    if (!amount || !user) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          category: category.split(' ').slice(1).join(' '),
          description: note || 'Budget tracker expense',
          transaction_type: 'expense',
          transaction_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      
      setAmount('');
      setNote('');
      loadRecentTransactions();
      calculateStreak();
    } catch (error) {
      console.error('Error logging expense:', error);
    }
  };

  // Calculate comprehensive financial metrics
  const monthlyIncome = userData.income.monthlyIncome;
  const totalExpenses = Object.values(userData.expenses).reduce((sum, expense) => sum + expense, 0);
  const availableForGoals = monthlyIncome - totalExpenses;
  const dailySpendable = availableForGoals / 30;
  
  // Calculate net worth
  const totalSavings = userData.income.currentSavings;
  const totalInvestments = investments.reduce((sum, inv) => sum + (Number(inv.current_value) || Number(inv.invested) || 0), 0);
  const totalDebt = debts.reduce((sum, debt) => sum + (Number(debt.remaining_amount) || 0), 0);
  const netWorth = totalSavings + totalInvestments - totalDebt;
  
  // Calculate monthly debt payments
  const monthlyDebtPayment = debts.reduce((sum, debt) => sum + (Number(debt.monthly_payment) || 0), 0);
  
  // Calculate current month data for trends
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const currentMonthIncome = currentMonthTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const currentMonthExpenses = currentMonthTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - totalExpenses) / monthlyIncome) * 100 : 0;

  // Generate KPI data with sparklines (last 7 data points)
  const generateSparklineData = (baseValue: number, variance: number = 0.1) => {
    return Array.from({ length: 7 }, (_, i) => ({
      value: baseValue * (1 + (Math.random() - 0.5) * variance)
    }));
  };

  const kpiData = [
    {
      title: "Net Worth",
      value: format(netWorth),
      delta: { value: 12, label: "vs last month", comparison: "vs same month last year" },
      sparklineData: generateSparklineData(netWorth, 0.05),
      color: "success" as const,
      icon: "💎",
      trend: "up" as const
    },
    {
      title: "Monthly Cash Flow", 
      value: format(monthlyIncome - totalExpenses),
      delta: { value: -3, label: "vs last month", comparison: "includes extra income" },
      sparklineData: generateSparklineData(monthlyIncome - totalExpenses, 0.15),
      color: availableForGoals > 0 ? "success" as const : "warning" as const,
      icon: "💰",
      trend: availableForGoals > 0 ? "up" as const : "down" as const
    },
    {
      title: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      delta: { value: 5, label: "vs last month", comparison: "target: 20%" },
      sparklineData: generateSparklineData(savingsRate, 0.1),
      color: savingsRate >= 20 ? "success" as const : savingsRate >= 10 ? "warning" as const : "danger" as const,
      icon: "📈",
      trend: savingsRate >= 15 ? "up" as const : "down" as const
    },
    {
      title: "Safe to Spend",
      value: format(Math.max(0, dailySpendable)),
      delta: { value: 8, label: "vs last month", comparison: "daily discretionary amount" },
      sparklineData: generateSparklineData(Math.max(0, dailySpendable), 0.2),
      color: "info" as const,
      icon: "🎯",
      trend: "up" as const
    }
  ];

  // Generate "What's Changed" data
  const whatsChangedData = [
    {
      type: "expense" as const,
      title: "Large dining expense",
      description: "₹2,300 more on dining this month",
      amount: 2300,
      impact: "negative" as const
    },
    {
      type: "income" as const,
      title: "Salary credit",
      description: "Monthly salary deposited",
      amount: monthlyIncome,
      impact: "positive" as const
    },
    {
      type: "alert" as const,
      title: "Budget alert",
      description: "Groceries budget 85% used",
      impact: "neutral" as const
    }
  ];

  // Generate budget progress data
  const budgetCategories = [
    { name: "Rent", value: userData.expenses.rent, color: "#8b5cf6" },
    { name: "Groceries", value: userData.expenses.groceries, color: "#a78bfa" },
    { name: "Transport", value: userData.expenses.transport, color: "#c4b5fd" },
    { name: "Utilities", value: userData.expenses.utilities, color: "#e9d5ff" },
    { name: "Other", value: userData.expenses.other, color: "#7c3aed" },
  ].filter(category => category.value > 0).map(category => {
    const spent = currentMonthTransactions
      .filter(t => t.transaction_type === 'expense' && 
                   t.category.toLowerCase() === category.name.toLowerCase())
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const projected = spent * (30 / new Date().getDate()); // Project for full month
    
    return {
      name: category.name,
      budgeted: category.value,
      spent,
      projected,
      color: category.color
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Welcome back! – Money Matter</title>
        <meta name="description" content="Here's your financial overview for August 2025" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/dashboard" />
      </Helmet>
      
      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back, {userData.profile.fullName || 'there'}! 👋</h1>
              <p className="text-muted-foreground">Here's your personalized financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('month')}
                className={dateFilter === 'month' ? 'bg-primary text-primary-foreground' : ''}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('quarter')}
                className={dateFilter === 'quarter' ? 'bg-primary text-primary-foreground' : ''}
              >
                Quarter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter('year')}
                className={dateFilter === 'year' ? 'bg-primary text-primary-foreground' : ''}
              >
                Year
              </Button>
            </div>
          </div>

          {/* Top KPIs with Sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpiData.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>

          {/* What's Changed Snapshot & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <WhatsChangedCard 
              changes={whatsChangedData}
              format={format}
            />
            <AIInsightsCard
              userData={userData}
              totalDebt={totalDebt}
              monthlyDebtPayment={monthlyDebtPayment}
              format={format}
              onOptimizeBudget={() => navigate('/budget-planner')}
            />
          </div>

          {/* Budget Tracker & Streak */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🔥</span>
                </div>
                <h3 className="text-lg font-semibold">Budget Tracker & Streak</h3>
              </div>
              <div className="text-orange-600 text-2xl font-bold">{streakDays}</div>
            </div>
            <p className="text-gray-600 mb-4">Log any expense to maintain your streak!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input 
                  type="number" 
                  placeholder="₹ 0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option>🍔 Food & Dining</option>
                  <option>🛒 Groceries</option>
                  <option>🚗 Transport</option>
                  <option>⚡ Utilities</option>
                  <option>🛍️ Shopping</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={logExpense}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 rounded-md hover:from-orange-600 hover:to-red-600 transition-colors"
                >
                  + Log Expense
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Budget Progress with drill-down */}
          <div className="mb-8">
            <BudgetProgressCard
              categories={budgetCategories}
              format={format}
              onViewDetails={(category) => navigate('/budgets', { state: { category } })}
            />
          </div>

          {/* Bottom Row - Goals and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Goals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>🎯</span>
                    <span>Active Goals</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/goals')}
                    className="text-xs"
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No goals yet! Start by creating your first financial goal.</p>
                    <Button onClick={() => navigate('/goals')}>
                      Create Goal
                    </Button>
                  </div>
                ) : (
                  goals.map((goal: any) => {
                    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                    const priorityColor = goal.priority === 'high' ? 'text-destructive' : 
                                        goal.priority === 'medium' ? 'text-amber-600' : 'text-green-600';
                    
                    return (
                      <Card key={goal.id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{goal.title}</span>
                          <span className={`text-sm ${priorityColor}`}>{goal.priority}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {format(goal.current_amount)} / {format(goal.target_amount)}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mb-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-muted-foreground">{Math.round(progress)}% complete</div>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Budget Tracker & Streak */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>🔥</span>
                    <span>Budget Tracker & Streak</span>
                  </span>
                  <span className="text-2xl font-bold text-orange-600">{streakDays}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Log any expense to maintain your streak!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Amount</label>
                    <input 
                      type="number" 
                      placeholder="₹ 0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>🍔 Food & Dining</option>
                      <option>🛒 Groceries</option>
                      <option>🚗 Transport</option>
                      <option>⚡ Utilities</option>
                      <option>🛍️ Shopping</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={logExpense}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      + Log Expense
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
