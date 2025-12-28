import React from "react";
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
  Calendar,
  Wallet,
  FileText,
  X,
  ReceiptText,
  PiggyBank
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "bg-primary/10 text-primary" },
  { name: "Tracker", href: "/tracker", icon: ReceiptText, color: "bg-info/10 text-info" },
  { name: "Goals", href: "/goals", icon: Target, color: "bg-warning/10 text-warning" },
  { name: "Savings", href: "/savings-projections", icon: PiggyBank, color: "bg-success/10 text-success" },
  { name: "Budget Planner", href: "/budget-planner", icon: Calculator, color: "bg-primary/10 text-primary" },
  { name: "Recurring", href: "/recurring", icon: Calendar, color: "bg-info/10 text-info" },
  { name: "Debts & EMIs", href: "/debts", icon: CreditCard, color: "bg-destructive/10 text-destructive" },
  { name: "Debt Calculator", href: "/debt-calculator", icon: Calculator, color: "bg-destructive/10 text-destructive" },
  { name: "Investments", href: "/investments", icon: TrendingUp, color: "bg-success/10 text-success" },
  { name: "Net Worth", href: "/net-worth", icon: Wallet, color: "bg-warning/10 text-warning" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, color: "bg-info/10 text-info" },
  { name: "Spending Trends", href: "/spending-trends", icon: TrendingUp, color: "bg-primary/10 text-primary" },
  { name: "Financial Report", href: "/financial-report", icon: FileText, color: "bg-muted text-muted-foreground" },
  { name: "Financial Calendar", href: "/financial-calendar", icon: Calendar, color: "bg-warning/10 text-warning" },
  { name: "Settings", href: "/settings", icon: Settings, color: "bg-muted text-muted-foreground" },
];

export default function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  const { pathname } = useLocation();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[85vw] max-w-sm ml-auto rounded-l-3xl rounded-r-none">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <DrawerTitle className="text-lg font-bold">Money Matter</DrawerTitle>
                <p className="text-xs text-muted-foreground">Smart Finance</p>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted active:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    isActive ? "bg-primary-foreground/20" : item.color
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5",
                      isActive && "text-primary-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "font-medium",
                    isActive ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/50 safe-bottom">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground">U</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Welcome back!</p>
              <p className="text-xs text-muted-foreground">Your finances are on track</p>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
