import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuOpen: () => void;
  showBack?: boolean;
  title?: string;
}

const routeTitles: Record<string, string> = {
  "/": "Money Matter",
  "/dashboard": "Dashboard",
  "/tracker": "Add Transaction",
  "/planning": "Planning",
  "/wealth": "Wealth",
  "/reports": "Reports",
  "/goals": "Goals",
  "/savings-projections": "Savings Projections",
  "/budget-planner": "Budget Planner",
  "/recurring": "Recurring",
  "/debts": "Debts & EMIs",
  "/debt-calculator": "Debt Calculator",
  "/loans": "Loans",
  "/investments": "Investments",
  "/net-worth": "Net Worth",
  "/analytics": "Analytics",
  "/spending-trends": "Spending Trends",
  "/financial-report": "Financial Report",
  "/financial-calendar": "Financial Calendar",
  "/settings": "Settings",
  "/onboarding": "Setup",
};

export default function MobileHeader({ onMenuOpen, showBack, title }: MobileHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  const pageTitle = title || routeTitles[pathname] || "Money Matter";
  const isHome = pathname === "/" || pathname === "/dashboard" || pathname === "/planning" || pathname === "/wealth" || pathname === "/reports" || pathname === "/tracker";

  return (
    <header className="mobile-header">
      <div className="flex items-center justify-between h-14 px-4">
        {showBack || !isHome ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <span className="text-lg">💰</span>
            </div>
          </div>
        )}

        <h1 className={cn(
          "font-bold text-foreground",
          isHome ? "text-lg" : "text-base"
        )}>
          {pageTitle}
        </h1>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full relative"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={onMenuOpen}
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  );
}
