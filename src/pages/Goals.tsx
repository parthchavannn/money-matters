import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, Edit, Check, Trash2, Plus } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function Goals() {
  const { format } = useCurrency();

  const goals = [
    {
      id: 1,
      title: "Goa Trip with Friends",
      category: "travel",
      priority: "medium",
      progress: 20,
      saved: 2000,
      target: 10000,
      monthlySave: 2000,
      targetDate: "Dec 10, 2025",
      remainingMonths: 4,
      icon: "✈️"
    },
    {
      id: 2,
      title: "Emergency Fund",
      category: "emergency",
      priority: "high",
      progress: 30,
      saved: 45000,
      target: 150000,
      monthlySave: 12000,
      targetDate: "Dec 31, 2025",
      remainingMonths: 5,
      icon: "🆘"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Financial Goals – Money Matter</title>
        <meta name="description" content="Track your progress toward your dreams" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/goals" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
              <p className="text-gray-600">Track your progress toward your dreams</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-green-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <CardTitle className="text-lg">Active Goals</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Target</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(160000)}</div>
              </CardContent>
            </Card>

            <Card className="bg-purple-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <CardTitle className="text-lg">Monthly Saving</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(14000)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Goals</h2>
            <div className="space-y-6">
              {goals.map((goal) => (
                <Card key={goal.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{goal.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={goal.priority === "high" ? "destructive" : "secondary"}>
                            {goal.priority} priority
                          </Badge>
                          <Badge variant="outline">{goal.category}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-900 h-2 rounded-full" 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Saved</div>
                      <div className="font-semibold">{format(goal.saved)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Target</div>
                      <div className="font-semibold">{format(goal.target)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Monthly Save</div>
                      <div className="font-semibold text-green-600">{format(goal.monthlySave)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Target Date</div>
                      <div className="font-semibold">{goal.targetDate}</div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-blue-600">
                    {goal.remainingMonths} months remaining to achieve this goal
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}