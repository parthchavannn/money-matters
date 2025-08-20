import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function Analytics() {
  const { format } = useCurrency();

  const incomeExpenseData = [
    { month: "Aug", income: 158000, expenses: 78500 }
  ];

  const spendingData = [
    { name: "Other", value: 35, color: "#8BC34A" },
    { name: "Debt/EMIs", value: 22, color: "#4CAF50" },
    { name: "Food", value: 20, color: "#2196F3" },
    { name: "Groceries", value: 8, color: "#FF9800" },
    { name: "Utilities", value: 8, color: "#FFC107" },
    { name: "Transport", value: 7, color: "#F44336" }
  ];

  const netWorthData = [
    { month: "Jan", value: 195000 },
    { month: "Feb", value: 205000 },
    { month: "Mar", value: 215000 },
    { month: "Apr", value: 225000 },
    { month: "May", value: 235000 },
    { month: "Jun", value: 245000 },
    { month: "Jul", value: 250000 },
    { month: "Aug", value: 260000 }
  ];

  const transactions = [
    { date: "Aug 15, 2025", category: "Food", description: "Zomato", amount: 200 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Financial Analytics – Money Matter</title>
        <meta name="description" content="Your financial journey, visualized" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/analytics" />
      </Helmet>

      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
            <p className="text-gray-600">Your financial journey, visualized.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-sm">Current Net Worth</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-{format(225000)}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle className="text-sm">Avg Monthly Savings</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(29000)}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5" />
                  <CardTitle className="text-sm">Avg Monthly Spending</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(78500)}</div>
              </CardContent>
            </Card>

            <Card className="bg-red-600 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-sm">Total Debt</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{format(475000)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>Net Worth Progression</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={netWorthData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [format(Number(value)), "Net Worth"]} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} dot={{ fill: "#10B981", r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  <span>Income vs. Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={incomeExpenseData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [format(Number(value)), ""]} />
                    <Bar dataKey="income" fill="#10B981" name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-pink-600" />
                  <span>Spending Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {spendingData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart className="w-5 h-5 text-gray-600" />
                <span>Recent Transactions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{format(transaction.amount)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}