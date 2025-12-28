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
import { BillRemindersCard } from "@/components/dashboard/BillRemindersCard";
import { CalendarDays, Filter, TrendingUp } from "lucide-react";
import { endOfMonth, startOfMonth, subMonths, format as formatDate, addDays } from "date-fns";
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
  const [recurringTransactions, setRecurringTransactions] = useState([]);
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
      loadRecurringTransactions();
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

  const loadRecurringTransactions = async () => {
    try {
      const thirtyDaysFromNow = addDays(new Date(), 30).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .lte('next_occurrence', thirtyDaysFromNow)
        .order('next_occurrence', { ascending: true });

      if (error) throw error;
      setRecurringTransactions(data || []);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
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

  // Generate bill reminders from recurring transactions and debts
  const billReminders = [
    ...recurringTransactions
      .filter((rt: any) => rt.transaction_type === 'expense')
      .map((rt: any) => ({
        id: rt.id,
        title: rt.description || rt.category,
        amount: Number(rt.amount),
        dueDate: new Date(rt.next_occurrence),
        type: 'recurring' as const,
        category: rt.category
      })),
    ...debts
      .filter((d: any) => d.due_date)
      .map((d: any) => ({
        id: d.id,
        title: d.creditor_name,
        amount: Number(d.monthly_payment) || Number(d.minimum_payment) || 0,
        dueDate: new Date(d.due_date),
        type: 'debt' as const,
        category: d.debt_type
      }))
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard – Money Matter</title>
        <meta name="description" content="Your financial overview for the month" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/dashboard" />
      </Helmet>
      
      <div className="mobile-container py-4 md:py-8 md:pl-64 md:pr-8">
        {/* Welcome Section - Mobile Optimized */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Welcome back! 👋
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Daily Spendable - Hero Card */}
        <div className="mb-6">
          <div className="gradient-hero rounded-2xl p-5 md:p-8 text-primary-foreground relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <p className="text-sm md:text-base opacity-90 mb-1">Daily Spending Limit</p>
              <div className="text-3xl md:text-4xl font-extrabold mb-2">
                ₹{Math.round(dailySpendable).toLocaleString()}
              </div>
              <p className="text-xs md:text-sm opacity-80">
                Safe to spend after bills & savings
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats - Horizontal Scroll on Mobile */}
        <div className="mb-6 -mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 md:gap-4">
            {/* Income */}
            <div className="flex-shrink-0 w-[140px] md:w-auto mobile-card bg-success/10 border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Income</p>
              <p className="text-lg font-bold text-foreground">₹{(monthlyIncome / 1000).toFixed(0)}k</p>
            </div>

            {/* Expenses */}
            <div className="flex-shrink-0 w-[140px] md:w-auto mobile-card bg-warning/10 border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">💸</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Expenses</p>
              <p className="text-lg font-bold text-foreground">₹{(totalExpenses / 1000).toFixed(0)}k</p>
            </div>

            {/* Savings */}
            <div className="flex-shrink-0 w-[140px] md:w-auto mobile-card bg-info/10 border-info/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Saved</p>
              <p className="text-lg font-bold text-foreground">₹{((totalSavings + totalInvestments) / 1000).toFixed(0)}k</p>
            </div>

            {/* Net Worth */}
            <div className="flex-shrink-0 w-[140px] md:w-auto mobile-card bg-primary/10 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm">💎</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Net Worth</p>
              <p className="text-lg font-bold text-foreground">₹{(netWorth / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>

        {/* Quick Log Expense */}
        <Card className="mb-6 border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="font-semibold text-sm">Quick Log</span>
              </div>
              <span className="text-2xl font-bold text-warning">{streakDays}🔥</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="₹ Amount" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>🍔 Food</option>
                <option>🛒 Grocery</option>
                <option>🚗 Transport</option>
                <option>⚡ Bills</option>
                <option>🛍️ Shopping</option>
              </select>
              <Button 
                onClick={logExpense}
                size="icon"
                className="h-10 w-10 rounded-xl gradient-primary"
              >
                <span className="text-lg">+</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <div className="mb-6">
          <BudgetProgressCard
            categories={budgetCategories}
            format={format}
            onViewDetails={(category) => navigate('/budgets', { state: { category } })}
          />
        </div>

        {/* Bill Reminders */}
        <div className="mb-6">
          <BillRemindersCard reminders={billReminders} formatCurrency={format} />
        </div>

        {/* Active Goals - Cards */}
        <Card className="mb-6 border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Active Goals</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/goals')}
                className="text-xs text-primary h-8"
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {goals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">No goals yet! Start your journey.</p>
                <Button onClick={() => navigate('/goals')} size="sm" className="gradient-primary">
                  Create Goal
                </Button>
              </div>
            ) : (
              goals.map((goal: any) => {
                const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                
                return (
                  <div key={goal.id} className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{goal.title}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-1">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(goal.current_amount)}</span>
                      <span>{format(goal.target_amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
