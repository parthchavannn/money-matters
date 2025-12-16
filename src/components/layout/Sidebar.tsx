import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Target, 
  Calculator, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  Settings,
  Zap,
  Users,
  Calendar,
  Wallet,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { computeFinancialScore } from "@/utils/financial";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Savings Projections", href: "/savings-projections", icon: TrendingUp },
  { name: "Budget Planner", href: "/budget-planner", icon: Calculator },
  { name: "Recurring", href: "/recurring", icon: Calendar },
  { name: "Debts & EMIs", href: "/debts", icon: CreditCard },
  { name: "Debt Calculator", href: "/debt-calculator", icon: Calculator },
  { name: "Investments", href: "/investments", icon: TrendingUp },
  { name: "Net Worth", href: "/net-worth", icon: Wallet },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Spending Trends", href: "/spending-trends", icon: TrendingUp },
  { name: "Financial Report", href: "/financial-report", icon: FileText },
  { name: "Financial Calendar", href: "/financial-calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { userData } = useUserData();
  const [activeGoals, setActiveGoals] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const { data: debts } = await supabase
          .from('debts')
          .select('remaining_amount, monthly_payment')
          .eq('user_id', user.id)
          .eq('status', 'active');

        const totalDebt = (debts || []).reduce((s: number, d: any) => s + Number(d.remaining_amount || 0), 0);
        const monthlyDebt = (debts || []).reduce((s: number, d: any) => s + Number(d.monthly_payment || 0), 0);

        setActiveGoals(goals?.length || 0);
        setScore(computeFinancialScore(userData as any, totalDebt, monthlyDebt));
      } catch (e) {
        console.error('Sidebar insights error:', e);
      }
    })();
  }, [user, userData]);

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Money Matter</h1>
              <p className="text-sm text-gray-500">Smart Finance Assistant</p>
            </div>
          </div>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              FINANCIAL HUB
            </h3>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out transform hover:scale-105",
                    isActive
                      ? "bg-green-100 text-green-900 border-r-2 border-green-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out group-hover:scale-110",
                      isActive ? "text-green-600" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              QUICK INSIGHTS
            </h3>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Financial Score</span>
                <span className="text-sm font-medium text-green-600">{score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${score}%` }}></div>
              </div>
            </div>
            
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Active Goals</span>
                <span className="text-sm font-medium">{activeGoals}</span>
              </div>
            </div>

            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium text-blue-600">On Track</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">U</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Welcome back!</p>
              <p className="text-xs text-gray-500">Your finances are improving</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}