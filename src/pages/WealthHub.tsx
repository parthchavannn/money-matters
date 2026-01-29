import React from "react";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, Calculator, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const wealthItems = [
  {
    title: "Net Worth",
    description: "Track assets & liabilities",
    href: "/net-worth",
    icon: Wallet,
    color: "bg-warning/10 text-warning",
  },
  {
    title: "Investments",
    description: "Monitor your portfolio",
    href: "/investments",
    icon: TrendingUp,
    color: "bg-success/10 text-success",
  },
  {
    title: "Debt Calculator",
    description: "Plan debt payoff strategy",
    href: "/debt-calculator",
    icon: Calculator,
    color: "bg-destructive/10 text-destructive",
  },
];

export default function WealthHub() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-success/10 via-background to-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Wealth</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track net worth, investments, and debt payoff
        </p>
      </div>

      {/* Cards Grid */}
      <div className="px-4 py-4 space-y-3">
        {wealthItems.map((item) => (
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
