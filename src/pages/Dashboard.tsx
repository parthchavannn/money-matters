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
import { CalendarDays, Filter, TrendingUp } from "lucide-react";
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
  const totalSavings = userData.income.currentSavings || 0;
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

  // Generate budget progress data
  const budgetCategories = [
    { name: "Rent", value: userData.expenses.rent, color: "#8b5cf6" },
    { name: "Groceries", value: userData.expenses.groceries, color: "#a78bfa" },
    { name: "Transport", value: userData.expenses.transport, color: "#c4b5fd" },
    { name: "Utilities", value: userData.expenses.utilities, color: "#e9d5ff" },
    { name: "Other", value: userData.expenses.other, color: "#7c3aed" },
  ].filter(category => category.value > 0).map(category => {
    // Map category names to transaction categories properly
    const categoryMapping = {
      'Groceries': ['groceries', 'food & dining', 'food and dining'],
      'Transport': ['transport', 'fuel', 'car'],
      'Utilities': ['utilities', 'electricity', 'water', 'gas'],
      'Rent': ['rent', 'housing'],
      'Other': ['other', 'shopping', 'entertainment']
    };
    
    const matchingCategories = categoryMapping[category.name] || [category.name.toLowerCase()];
    
    const spent = currentMonthTransactions
      .filter(t => t.transaction_type === 'expense' && 
                   matchingCategories.some(cat => 
                     t.category.toLowerCase().includes(cat.toLowerCase())
                   ))
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
      description: budgetCategories && budgetCategories.length > 0 ? 
        `${budgetCategories[0].name} budget ${Math.round((budgetCategories[0].spent / budgetCategories[0].budgeted) * 100)}% used` :
        "Monitor your spending",
      impact: "neutral" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Welcome back! – Money Matter</title>
        <meta name="description" content="Here's your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/dashboard" />
      </Helmet>
      
      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
              Welcome back! 
              <span className="ml-2">👋</span>
            </h1>
            <p className="text-muted-foreground text-lg">Here's your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Daily Spendable Guide Banner */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Your Daily Spendable Guide</h2>
                    <p className="text-blue-100 text-lg">A safe-to-spend amount for your daily wants, after all savings and needs.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">₹{Math.round(dailySpendable).toLocaleString()}</div>
                    <div className="text-blue-200 text-lg">per day</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-green-100">Monthly Income</span>
                  </div>
                  <span className="text-sm bg-green-500 px-2 py-1 rounded">+12%</span>
                </div>
                <div className="text-3xl font-bold">₹{monthlyIncome.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">⚠️</span>
                  </div>
                  <span className="text-orange-100">Fixed Expenses</span>
                </div>
                <div className="text-3xl font-bold">₹{totalExpenses.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                  <span className="text-blue-100">Total Savings</span>
                </div>
                <div className="text-3xl font-bold">₹{(totalSavings + totalInvestments).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🎯</span>
                    </div>
                    <span className="text-purple-100">Available for Goals</span>
                  </div>
                  <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                    {goals.length}
                  </span>
                </div>
                <div className="text-3xl font-bold">₹{Math.max(0, availableForGoals).toLocaleString()}</div>
              </CardContent>
            </Card>
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
                      placeholder="0" 
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
