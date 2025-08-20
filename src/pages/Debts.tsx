import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, TrendingDown, Plus, Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function Debts() {
  const { format } = useCurrency();

  const debts = [
    {
      id: 1,
      name: "Credit Card Outstanding",
      type: "credit card",
      bank: "SBI Credit Card",
      totalDebt: 25000,
      monthlyEMI: 5000,
      interestRate: "36% p.a.",
      remainingMonths: 5,
      dueDate: "15th of every month",
      payoffDate: "Jan 2026",
      icon: "💳"
    },
    {
      id: 2,
      name: "Car Loan EMI",
      type: "car loan",
      bank: "HDFC Bank",
      totalDebt: 450000,
      monthlyEMI: 12500,
      interestRate: "8.5% p.a.",
      remainingMonths: 36,
      dueDate: "5th of every month",
      payoffDate: "Aug 2028",
      icon: "🚗"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Debts & EMIs – Money Matter</title>
        <meta name="description" content="Manage and track your debt payments" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/debts" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Debts & EMIs</h1>
              <p className="text-gray-600">Manage and track your debt payments</p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Debt/EMI
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Debt</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(475000)}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <CardTitle className="text-lg">Monthly Payments</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(17500)}</div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5" />
                  <CardTitle className="text-lg">Total Interest</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{format(0)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Debts</h2>
            <div className="space-y-6">
              {debts.map((debt) => (
                <Card key={debt.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{debt.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{debt.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{debt.type}</Badge>
                          <span className="text-sm text-gray-500">{debt.bank}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-gray-600">Total Debt</div>
                      <div className="font-semibold">{format(debt.totalDebt)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Monthly EMI</div>
                      <div className="font-semibold text-red-600">{format(debt.monthlyEMI)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Interest Rate</div>
                      <div className="font-semibold">{debt.interestRate}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Remaining Months</div>
                      <div className="font-semibold">{debt.remainingMonths}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Due Date</div>
                      <div className="font-semibold">{debt.dueDate}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Payoff Date</div>
                      <div className="font-semibold">{debt.payoffDate}</div>
                    </div>
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