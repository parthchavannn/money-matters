import React from "react";
import { Link } from "react-router-dom";
import { Target, Calculator, Calendar, CreditCard, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const planningItems = [
  {
    title: "Goals",
    description: "Track savings goals & milestones",
    href: "/goals",
    icon: Target,
    color: "bg-warning/10 text-warning",
  },
  {
    title: "Savings",
    description: "Project future savings growth",
    href: "/savings-projections",
    icon: PiggyBank,
    color: "bg-success/10 text-success",
  },
  {
    title: "Budget Planner",
    description: "Customize spending allocations",
    href: "/budget-planner",
    icon: Calculator,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Recurring",
    description: "Manage recurring transactions",
    href: "/recurring",
    icon: Calendar,
    color: "bg-info/10 text-info",
  },
  {
    title: "Debts & EMIs",
    description: "Track debts and payments",
    href: "/debts",
    icon: CreditCard,
    color: "bg-destructive/10 text-destructive",
  },
];

export default function PlanningHub() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Planning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set goals, budget, and manage recurring transactions
        </p>
      </div>

      {/* Cards Grid */}
      <div className="px-4 py-4 space-y-3">
        {planningItems.map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-all active:scale-[0.98] touch-manipulation">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
