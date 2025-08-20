import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, RefreshCw, Save, AlertTriangle, Target, Lightbulb } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function BudgetPlanner() {
  const { format } = useCurrency();

  const budgetCategories = [
    { name: "Fixed Expenses", amount: 51000, percentage: 32, color: "bg-red-500" },
    { name: "Debt Payments", amount: 17500, percentage: 11, color: "bg-orange-500" },
    { name: "Goal Savings", amount: 14000, percentage: 9, color: "bg-blue-500" },
    { name: "Emergency Fund", amount: 15000, percentage: 9, color: "bg-green-500" },
    { name: "Discretionary", amount: 10000, percentage: 6, color: "bg-purple-500" },
  ];

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
              <Button variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                Log Extra Income
              </Button>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to AI Suggested
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
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
                    <Label htmlFor="goalSavings">Goal Savings</Label>
                    <Input 
                      id="goalSavings" 
                      type="number" 
                      defaultValue="14000" 
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">AI suggests: ₹14,000</p>
                  </div>

                  <div>
                    <Label htmlFor="emergencyFund">Emergency Fund</Label>
                    <Input 
                      id="emergencyFund" 
                      type="number" 
                      defaultValue="15000" 
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">AI suggests: ₹15,000</p>
                  </div>

                  <div>
                    <Label htmlFor="lifestyle">Lifestyle & Entertainment</Label>
                    <Input 
                      id="lifestyle" 
                      type="number" 
                      defaultValue="10000" 
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">For dining out, entertainment, shopping, etc.</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Fixed Expenses</h3>
                    <p className="text-sm text-gray-600 mb-3">These cannot be changed here:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Monthly Expenses</span>
                        <span>₹51,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Debt/EMI Payments</span>
                        <span>₹17,500</span>
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
                      <div className="text-2xl font-bold">{format(158000)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm opacity-90">Total Allocated</div>
                      <div className="text-2xl font-bold">{format(107500)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm opacity-90">Remaining</div>
                      <div className="text-2xl font-bold">{format(50500)}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Budget Utilization</span>
                      <span>68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
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
                  Aim to save at least ₹15,800 monthly for emergencies. Start with ₹500 if budget is tight.
                </p>
                <Button variant="outline" size="sm">Start Emergency Fund</Button>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Boost Goal Savings</span>
                  <Badge variant="secondary">opportunity</Badge>
                </div>
                <p className="text-gray-600 mb-3">
                  You have ₹50,500 extra. Consider allocating 70% to high-priority goals.
                </p>
                <Button variant="outline" size="sm">Increase Savings</Button>
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