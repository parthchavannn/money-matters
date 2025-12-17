import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Target, 
  Wallet,
  BarChart3, 
  Settings,
  Zap,
  ReceiptText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserData } from "@/context/UserDataContext";
import { supabase } from "@/integrations/supabase/client";
import { computeFinancialScore } from "@/utils/financial";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tracker", href: "/tracker", icon: ReceiptText },
  { name: "Planning", href: "/planning", icon: Target },
  { name: "Wealth", href: "/wealth", icon: Wallet },
  { name: "Reports", href: "/reports", icon: BarChart3 },
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

  const isActiveRoute = (href: string) => {
    if (href === "/planning") {
      return ["/planning", "/goals", "/budget-planner", "/recurring", "/savings-projections"].some(p => pathname.startsWith(p));
    }
    if (href === "/wealth") {
      return ["/wealth", "/debts", "/investments", "/net-worth", "/debt-calculator", "/loans"].some(p => pathname.startsWith(p));
    }
    if (href === "/reports") {
      return ["/reports", "/analytics", "/spending-trends", "/financial-report", "/financial-calendar"].some(p => pathname.startsWith(p));
    }
    return pathname === href;
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-background border-r border-border pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Money Matter</h1>
              <p className="text-sm text-muted-foreground">Smart Finance Assistant</p>
            </div>
          </div>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          <div className="mb-6">
            <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              MAIN MENU
            </h3>
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              QUICK INSIGHTS
            </h3>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Financial Score</span>
                <span className="text-sm font-medium text-primary">{score}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${score}%` }}></div>
              </div>
            </div>
            
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Active Goals</span>
                <span className="text-sm font-medium text-foreground">{activeGoals}</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-accent-foreground">U</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">Welcome back!</p>
              <p className="text-xs text-muted-foreground">Your finances are improving</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}