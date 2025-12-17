import React from "react";
import { Link } from "react-router-dom";
import { CreditCard, TrendingUp, Wallet, Calculator, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/navigation/BottomNav";

const wealthFeatures = [
  {
    title: "Debts & EMIs",
    description: "Track and manage your debts, loans, and monthly payments",
    href: "/debts",
    icon: CreditCard,
    gradient: "from-red-500 to-rose-600",
    iconBg: "bg-red-500",
  },
  {
    title: "Investments",
    description: "Monitor your investment portfolio and returns",
    href: "/investments",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-green-600",
    iconBg: "bg-emerald-500",
  },
  {
    title: "Net Worth",
    description: "Track your total assets minus liabilities over time",
    href: "/net-worth",
    icon: Wallet,
    gradient: "from-blue-500 to-cyan-600",
    iconBg: "bg-blue-500",
  },
  {
    title: "Debt Payoff Calculator",
    description: "Calculate optimal debt repayment strategies",
    href: "/debt-calculator",
    icon: Calculator,
    gradient: "from-amber-500 to-yellow-600",
    iconBg: "bg-amber-500",
  },
];

export default function WealthHub() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 md:pb-8 md:ml-64">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Wealth</h1>
            <p className="text-muted-foreground">Manage your assets and liabilities</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {wealthFeatures.map((feature, index) => (
              <Link key={feature.href} to={feature.href}>
                <Card 
                  className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group border-0 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`h-2 bg-gradient-to-r ${feature.gradient}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${feature.iconBg} shadow-lg`}>
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center justify-between">
                          {feature.title}
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
