import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetPlan } from "@/utils/budget";

export default function Dashboard() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { format } = useCurrency();
  const plan: BudgetPlan = (loc.state?.plan as BudgetPlan) || {
    monthlyIncome: 60000,
    monthlyFixed: 20000,
    monthlyEmi: 5000,
    monthlyGoals: 6000,
    emergency: 3000,
    lifestyle: 26000,
    leftover: 26000,
  };

  const data = [
    { name: "Fixed", value: plan.monthlyFixed },
    { name: "EMIs", value: plan.monthlyEmi },
    { name: "Goals", value: plan.monthlyGoals },
    { name: "Emergency", value: plan.emergency },
    { name: "Lifestyle", value: plan.lifestyle },
  ];

  const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#e9d5ff", "#7c3aed"];

  const tip = plan.leftover < 2000
    ? "Budget is tight. Consider reducing lifestyle spending by 5% and prioritizing emergency fund."
    : `You have ${format(plan.leftover)} discretionary. Suggest saving a bit more toward your top goal.`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Welcome back! – Money Matter</title>
        <meta name="description" content="Here's your financial overview for August 2025" />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/dashboard" />
      </Helmet>
      
      <div className="md:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back! 👋</h1>
            <p className="text-gray-600">Here's your financial overview for August 2025</p>
          </div>

          {/* Daily Spendable Guide */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-8">
            <h2 className="text-xl font-semibold mb-2">Your Daily Spendable Guide</h2>
            <p className="text-blue-100 mb-4">A safe-to-spend amount for your daily wants, after all savings and needs.</p>
            <div className="text-right">
              <div className="text-3xl font-bold">{format(1750)}</div>
              <div className="text-blue-100">per day</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-600 text-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100">Monthly Income</span>
                <span className="text-green-200 text-sm">+12%</span>
              </div>
              <div className="text-2xl font-bold">{format(150000)}</div>
            </div>
            <div className="bg-red-600 text-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-100">Fixed Expenses</span>
                <span className="text-red-200 text-sm">⏰</span>
              </div>
              <div className="text-2xl font-bold">{format(51000)}</div>
            </div>
            <div className="bg-blue-600 text-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Total Savings</span>
                <span className="text-blue-200 text-sm">📈</span>
              </div>
              <div className="text-2xl font-bold">{format(250000)}</div>
            </div>
            <div className="bg-purple-600 text-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100">Available for Goals</span>
                <span className="text-purple-200 text-sm">🎯</span>
              </div>
              <div className="text-2xl font-bold">{format(81500)}</div>
            </div>
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
              <div className="text-orange-600 text-2xl font-bold">0</div>
            </div>
            <p className="text-gray-600 mb-4">Log any expense to maintain your streak!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount</label>
                <input 
                  type="number" 
                  placeholder="₹ 0.00" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>🍔 Food & Dining</option>
                  <option>🛒 Groceries</option>
                  <option>🚗 Transport</option>
                  <option>⚡ Utilities</option>
                  <option>🛍️ Shopping</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 rounded-md hover:from-orange-600 hover:to-red-600 transition-colors">
                  + Log Expense
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Budget Progress */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📊</span>
              </div>
              <h3 className="text-lg font-semibold">Monthly Budget Progress</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transport</span>
                  <span className="text-red-500 text-sm font-medium">120%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">₹1,200</span>
                  <span className="text-gray-500">₹1,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
                <div className="text-red-500 text-xs">₹0 remaining</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Food & Dining</span>
                  <span className="text-green-500 text-sm font-medium">2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900">₹300</span>
                  <span className="text-gray-500">₹15,750</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "2%" }}></div>
                </div>
                <div className="text-green-500 text-xs">₹15,450 remaining</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Groceries</span>
                  <span className="text-green-500 text-sm font-medium">0%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900">₹0</span>
                  <span className="text-gray-500">₹6,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                </div>
                <div className="text-green-500 text-xs">₹6,000 remaining</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Financial Insights */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">✨</span>
                </div>
                <h3 className="text-lg font-semibold">AI Financial Insights</h3>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-yellow-600">💡</span>
                  <span className="font-medium">Smart Recommendation</span>
                </div>
                <p className="text-gray-700 text-sm mb-3">
                  Great! You have ₹81,500 available for your goals this month. Consider allocating 60% to high-priority goals and 40% to emergency savings.
                </p>
                <button className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-600 transition-colors">
                  Optimize Budget →
                </button>
              </div>
            </div>

            {/* Active Goals */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Active Goals</h3>
                <button className="text-blue-600 text-sm hover:underline">View All</button>
              </div>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Emergency Fund</span>
                    <span className="text-blue-600 text-sm">high</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">₹45,000 / ₹150,000</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "30%" }}></div>
                  </div>
                  <div className="text-sm text-gray-500">30% complete</div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Goa Trip with Friends</span>
                    <span className="text-orange-600 text-sm">medium</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">₹2,000 / ₹10,000</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: "20%" }}></div>
                  </div>
                  <div className="text-sm text-gray-500">20% complete</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
