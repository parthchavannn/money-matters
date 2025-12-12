import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserData } from "@/context/UserDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Target, Calendar, TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  priority: string;
  status: string;
}

interface ProjectedGoal extends Goal {
  remainingAmount: number;
  monthsToComplete: number;
  projectedDate: Date;
  isOnTrack: boolean;
  monthlyRequired: number;
}

const SavingsProjections = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { format: formatAmount } = useCurrency();
  const { userData } = useUserData();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const monthlySavings = userData.income?.currentSavings || 0;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) {
      loadGoals();
    }
  }, [user, authLoading, navigate]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const projectedGoals = useMemo((): ProjectedGoal[] => {
    if (goals.length === 0 || monthlySavings <= 0) {
      return goals.map(goal => ({
        ...goal,
        remainingAmount: goal.target_amount - (goal.current_amount || 0),
        monthsToComplete: Infinity,
        projectedDate: new Date(2099, 11, 31),
        isOnTrack: false,
        monthlyRequired: 0
      }));
    }

    // Distribute savings across goals based on priority
    const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const totalWeight = goals.reduce((sum, g) => sum + (priorityWeights[g.priority || 'medium'] || 2), 0);

    return goals.map(goal => {
      const remainingAmount = goal.target_amount - (goal.current_amount || 0);
      const weight = priorityWeights[goal.priority || 'medium'] || 2;
      const allocatedMonthly = (weight / totalWeight) * monthlySavings;
      
      const monthsToComplete = allocatedMonthly > 0 
        ? Math.ceil(remainingAmount / allocatedMonthly) 
        : Infinity;
      
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + monthsToComplete);

      let isOnTrack = true;
      let monthlyRequired = allocatedMonthly;

      if (goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const monthsUntilTarget = Math.max(1, Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
        monthlyRequired = remainingAmount / monthsUntilTarget;
        isOnTrack = projectedDate <= targetDate;
      }

      return {
        ...goal,
        remainingAmount,
        monthsToComplete,
        projectedDate,
        isOnTrack,
        monthlyRequired
      };
    }).sort((a, b) => a.monthsToComplete - b.monthsToComplete);
  }, [goals, monthlySavings]);

  const timelineData = useMemo(() => {
    const now = new Date();
    const months: { month: string; [key: string]: number | string }[] = [];
    
    // Generate next 24 months
    for (let i = 0; i <= 24; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i);
      const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      
      const dataPoint: { month: string; [key: string]: number | string } = { month: monthKey };
      
      projectedGoals.forEach(goal => {
        const remaining = goal.remainingAmount - (monthlySavings * (projectedGoals.find(g => g.id === goal.id)?.monthlyRequired || 0) / monthlySavings * i);
        dataPoint[goal.title] = Math.max(0, remaining);
      });
      
      months.push(dataPoint);
    }
    
    return months;
  }, [projectedGoals, monthlySavings]);

  const totalRemaining = projectedGoals.reduce((sum, g) => sum + g.remainingAmount, 0);
  const goalsOnTrack = projectedGoals.filter(g => g.isOnTrack).length;

  const colors = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)", "hsl(200 80% 50%)"];

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
        <title>Savings Projections | FinanceFlow</title>
        <meta name="description" content="Visualize when your savings goals will be achieved" />
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
                <h1 className="text-2xl font-bold text-foreground">Savings Projections</h1>
                <p className="text-muted-foreground">Timeline to achieve your financial goals</p>
              </div>
            </div>

            {monthlySavings <= 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Monthly Savings Set</h3>
                  <p className="text-muted-foreground mb-4">Set your monthly savings in onboarding or settings to see projections</p>
                  <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
                </CardContent>
              </Card>
            ) : goals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Goals</h3>
                  <p className="text-muted-foreground mb-4">Create goals to see your savings projections</p>
                  <Button onClick={() => navigate("/goals")}>Go to Goals</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Monthly Savings</span>
                      </div>
                      <p className="text-xl font-bold">{formatAmount(monthlySavings)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Total Remaining</span>
                      </div>
                      <p className="text-xl font-bold">{formatAmount(totalRemaining)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">On Track</span>
                      </div>
                      <p className="text-xl font-bold">{goalsOnTrack}/{goals.length}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Active Goals</span>
                      </div>
                      <p className="text-xl font-bold">{goals.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Goal Achievement Timeline</CardTitle>
                    <CardDescription>Projected completion dates based on current savings rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {projectedGoals.map((goal, index) => {
                        const progress = ((goal.current_amount || 0) / goal.target_amount) * 100;
                        const monthsText = goal.monthsToComplete === Infinity 
                          ? "N/A" 
                          : goal.monthsToComplete <= 12 
                            ? `${goal.monthsToComplete} months`
                            : `${Math.floor(goal.monthsToComplete / 12)}y ${goal.monthsToComplete % 12}m`;

                        return (
                          <div key={goal.id} className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: colors[index % colors.length] }}
                                />
                                <div>
                                  <span className="font-medium">{goal.title}</span>
                                  <Badge 
                                    variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'low' ? 'secondary' : 'default'}
                                    className="ml-2 text-xs"
                                  >
                                    {goal.priority}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  {goal.isOnTrack ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  )}
                                  <span className="text-sm font-medium">{monthsText}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {goal.projectedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="ml-6">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{formatAmount(goal.current_amount || 0)} saved</span>
                                <span>{formatAmount(goal.target_amount)} target</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-muted-foreground">
                                  {formatAmount(goal.remainingAmount)} remaining
                                </span>
                                <span className="text-muted-foreground">
                                  {formatAmount(goal.monthlyRequired)}/mo needed
                                </span>
                              </div>
                            </div>

                            {/* Timeline connector */}
                            {index < projectedGoals.length - 1 && (
                              <div className="absolute left-1.5 top-8 w-0.5 h-16 bg-border" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Milestone Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Months to Achieve Goals</CardTitle>
                    <CardDescription>Comparison of time required for each goal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={projectedGoals.filter(g => g.monthsToComplete < 120).map(g => ({
                            name: g.title.length > 15 ? g.title.substring(0, 15) + '...' : g.title,
                            months: g.monthsToComplete,
                            isOnTrack: g.isOnTrack
                          }))}
                          layout="vertical"
                          margin={{ left: 20, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 12 }} 
                            width={100}
                            className="fill-muted-foreground"
                          />
                          <Tooltip 
                            formatter={(value: number) => [`${value} months`, 'Time to achieve']}
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <ReferenceLine x={12} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: '1 year', position: 'top', fontSize: 10 }} />
                          <Bar dataKey="months" radius={[0, 4, 4, 0]}>
                            {projectedGoals.filter(g => g.monthsToComplete < 120).map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isOnTrack ? "hsl(142 76% 36%)" : "hsl(38 92% 50%)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tips to Reach Goals Faster
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Increase monthly savings by reducing non-essential expenses</li>
                      <li>• Prioritize high-interest debt payoff to free up more savings</li>
                      <li>• Consider adding extra income from side projects</li>
                      <li>• Automate your savings to ensure consistency</li>
                    </ul>
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

export default SavingsProjections;
