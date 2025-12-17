import React from "react";
import { Link } from "react-router-dom";
import { Target, Calculator, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/navigation/BottomNav";

const planningFeatures = [
  {
    title: "Goals",
    description: "Set and track your financial goals with progress monitoring",
    href: "/goals",
    icon: Target,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Budget Planner",
    description: "Plan your monthly budget with AI-powered suggestions",
    href: "/budget-planner",
    icon: Calculator,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Recurring Transactions",
    description: "Manage recurring income and expenses automatically",
    href: "/recurring",
    icon: Calendar,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Savings Projections",
    description: "Visualize when you'll achieve your savings goals",
    href: "/savings-projections",
    icon: TrendingUp,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
];

export default function PlanningHub() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 md:pb-8 md:ml-64">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Planning</h1>
            <p className="text-muted-foreground">Plan your financial future</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {planningFeatures.map((feature) => (
              <Link key={feature.href} to={feature.href}>
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${feature.bgColor}`}>
                        <feature.icon className={`h-5 w-5 ${feature.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center justify-between">
                          {feature.title}
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
