import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, TrendingUp, FileText, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/navigation/BottomNav";

const reportFeatures = [
  {
    title: "Analytics",
    description: "Overview of your financial health with key metrics",
    href: "/analytics",
    icon: BarChart3,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Spending Trends",
    description: "Visualize spending patterns over time by category",
    href: "/spending-trends",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Financial Report",
    description: "Monthly summary with exportable CSV reports",
    href: "/financial-report",
    icon: FileText,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Financial Calendar",
    description: "View upcoming bills, debts, and goal milestones",
    href: "/financial-calendar",
    icon: Calendar,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
];

export default function ReportsHub() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pb-24 md:pb-8 md:ml-64">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Insights and analysis of your finances</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {reportFeatures.map((feature) => (
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
