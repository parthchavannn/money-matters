import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, RefreshCw, Save, AlertTriangle, Target, Lightbulb } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserData } from "@/context/UserDataContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function BudgetPlanner() {
  const { format } = useCurrency();
  const { userData } = useUserData();
  const { user } = useAuth();
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [extraIncomeAmount, setExtraIncomeAmount] = useState('');
  const [extraIncomeSource, setExtraIncomeSource] = useState('');
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);

  const monthlyIncome = userData?.income?.monthlyIncome || 0;
  const totalExpenses = Object.values(userData?.expenses || {}).reduce((sum, val) => sum + (val || 0), 0);
  const currentSavings = userData?.income?.currentSavings || 0;
  const currentInvestments = userData?.income?.currentInvestments || 0;
  
  // Calculate suggested monthly allocations based on 50/30/20 rule
  const suggestedSavings = Math.round(monthlyIncome * 0.2);
  const suggestedEmergencyFund = Math.round(monthlyIncome * 0.1);
  const suggestedInvestment = Math.round(monthlyIncome * 0.1);

  const totalAllocated = totalExpenses + suggestedSavings + suggestedEmergencyFund + suggestedInvestment;
  const remaining = monthlyIncome - totalAllocated;
  const budgetUtilization = monthlyIncome > 0 ? Math.round((totalAllocated / monthlyIncome) * 100) : 0;

  const budgetCategories = [
    { 
      name: "Fixed Expenses", 
      amount: totalExpenses, 
      percentage: monthlyIncome > 0 ? Math.round((totalExpenses / monthlyIncome) * 100) : 0, 
      color: "bg-red-500" 
    },
    { 
      name: "Suggested Savings", 
      amount: suggestedSavings, 
      percentage: monthlyIncome > 0 ? Math.round((suggestedSavings / monthlyIncome) * 100) : 0, 
      color: "bg-blue-500" 
    },
    { 
      name: "Emergency Fund", 
      amount: suggestedEmergencyFund, 
      percentage: monthlyIncome > 0 ? Math.round((suggestedEmergencyFund / monthlyIncome) * 100) : 0, 
      color: "bg-green-500" 
    },
    { 
      name: "Investment", 
      amount: suggestedInvestment, 
      percentage: monthlyIncome > 0 ? Math.round((suggestedInvestment / monthlyIncome) * 100) : 0, 
      color: "bg-purple-500" 
    },
  ];

  const handleLogExtraIncome = async () => {
    if (!extraIncomeAmount || !extraIncomeSource || !user) return;
    
    try {
      // Add to transactions for current month only
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(extraIncomeAmount),
          category: 'Extra Income',
          transaction_type: 'income',
          transaction_date: new Date().toISOString().split('T')[0],
          description: `${extraIncomeSource} - Extra income for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        });

      if (transactionError) throw transactionError;
      
      setExtraIncomeAmount('');
      setExtraIncomeSource('');
      setShowIncomeDialog(false);
      toast.success('Extra income logged for current month!');
    } catch (error) {
      console.error('Error logging extra income:', error);
      toast.error('Failed to log extra income');
    }
  };

  const handleResetToAI = () => {
    setMonthlySavings(suggestedSavings);
    setEmergencyFund(suggestedEmergencyFund);
    setInvestmentAmount(suggestedInvestment);
    toast.success('Reset to AI suggestions');
  };

  const handleSaveBudget = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          monthly_savings: monthlySavings || suggestedSavings,
          emergency_fund: emergencyFund || suggestedEmergencyFund,
          investment_amount: investmentAmount || suggestedInvestment,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Budget plan saved successfully!');
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget plan');
    }
  };

  const handleStartEmergencyFund = () => {
    setEmergencyFund(suggestedEmergencyFund);
    toast.success('Emergency fund target set!');
  };

  const handleIncreaseSavings = () => {
    const newSavings = Math.round(remaining * 0.7);
    setMonthlySavings(suggestedSavings + newSavings);
    toast.success('Savings target increased!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Budget Planner – Money Matter</title>
        <meta name="description" content="AI-powered monthly budget optimization" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/budget-planner" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
              <p className="text-gray-600">AI-powered monthly budget optimization</p>
            </div>
            <div className="flex space-x-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Log Extra Income
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Extra Income</DialogTitle>
                  </DialogHeader>
                   <div className="space-y-4">
                      <div>
                        <Label htmlFor="extraSource">Source of Extra Income</Label>
                        <Input 
                          id="extraSource"
                          placeholder="0"
                          value={extraIncomeSource}
                          onChange={(e) => setExtraIncomeSource(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="extraAmount">Amount</Label>
                        <Input 
                          id="extraAmount"
                          type="number"
                          placeholder="0"
                          value={extraIncomeAmount}
                          onChange={(e) => setExtraIncomeAmount(e.target.value)}
                        />
                      </div>
                     <Button onClick={handleLogExtraIncome} className="w-full" disabled={!extraIncomeAmount || !extraIncomeSource}>
                       Log Income
                     </Button>
                   </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleResetToAI}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to AI Suggested
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveBudget}>
                <Save className="w-4 h-4 mr-2" />
                Save Budget Plan
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Customize Budget</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="monthlySavings">Target Monthly Savings</Label>
                    <Input 
                      id="monthlySavings" 
                      type="number" 
                      value={monthlySavings || suggestedSavings}
                      onChange={(e) => setMonthlySavings(Number(e.target.value))}
                      placeholder="0"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">AI suggests: {format(suggestedSavings)} (20% of income)</p>
                  </div>

                  <div>
                    <Label htmlFor="emergencyFund">Emergency Fund Goal</Label>
                    <Input 
                      id="emergencyFund" 
                      type="number" 
                      value={emergencyFund || suggestedEmergencyFund}
                      onChange={(e) => setEmergencyFund(Number(e.target.value))}
                      placeholder="0"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">AI suggests: {format(suggestedEmergencyFund)} (10% of income)</p>
                  </div>

                  <div>
                    <Label htmlFor="investmentAmount">Investment Amount</Label>
                    <Input 
                      id="investmentAmount" 
                      type="number" 
                      value={investmentAmount || suggestedInvestment}
                      onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                      placeholder="0"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">AI suggests: {format(suggestedInvestment)} (10% of income)</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Fixed Expenses</h3>
                    <p className="text-sm text-gray-600 mb-3">From your onboarding data:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Monthly Expenses</span>
                        <span>{format(totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Income</span>
                        <span>{format(monthlyIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Savings</span>
                        <span>{format(currentSavings)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Investments</span>
                        <span>{format(currentInvestments)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-green-600 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Monthly Budget Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm opacity-90">Total Income</div>
                      <div className="text-2xl font-bold">{format(monthlyIncome)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm opacity-90">Total Allocated</div>
                      <div className="text-2xl font-bold">{format(totalAllocated)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm opacity-90">Remaining</div>
                      <div className="text-2xl font-bold">{format(remaining)}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Utilization</span>
                      <span>{budgetUtilization}%</span>
                    </div>
                    <Progress value={budgetUtilization} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {budgetCategories.map((category, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                        <div className="text-sm text-gray-600">{category.percentage}%</div>
                      </div>
                      <div className="font-medium text-gray-900 mb-1">{category.name}</div>
                      <div className="text-xl font-bold">{format(category.amount)}</div>
                      <Progress value={category.percentage} className="h-1 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-orange-500" />
                <span>AI Budget Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Build Emergency Fund</span>
                  <Badge variant="destructive">important</Badge>
                </div>
                <p className="text-gray-600 mb-3">
                  Aim to save at least {format(suggestedEmergencyFund)} monthly for emergencies. Current savings: {format(currentSavings)}
                </p>
                <Button variant="outline" size="sm" onClick={handleStartEmergencyFund}>Start Emergency Fund</Button>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Boost Goal Savings</span>
                  <Badge variant="secondary">opportunity</Badge>
                </div>
                <p className="text-gray-600 mb-3">
                  You have {format(remaining)} remaining. Consider allocating 70% to high-priority goals.
                </p>
                <Button variant="outline" size="sm" onClick={handleIncreaseSavings}>Increase Savings</Button>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Pro Tips</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings</li>
                  <li>• Review and adjust your budget monthly</li>
                  <li>• Automate savings to make it effortless</li>
                  <li>• Track expenses to identify spending patterns</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}