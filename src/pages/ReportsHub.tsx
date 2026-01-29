import React from "react";
import { Link } from "react-router-dom";
import { FileText, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const reportItems = [
  {
    title: "Analytics",
    description: "Overview of your finances",
    href: "/analytics",
    icon: BarChart3,
    color: "bg-info/10 text-info",
  },
  {
    title: "Spending Trends",
    description: "Patterns over time by category",
    href: "/spending-trends",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Financial Report",
    description: "Detailed financial summary",
    href: "/financial-report",
    icon: FileText,
    color: "bg-muted text-muted-foreground",
  },
  {
    title: "Financial Calendar",
    description: "Upcoming bills & due dates",
    href: "/financial-calendar",
    icon: Calendar,
    color: "bg-warning/10 text-warning",
  },
];

export default function ReportsHub() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-info/10 via-background to-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze spending, view reports, and track schedules
        </p>
      </div>

      {/* Cards Grid */}
      <div className="px-4 py-4 space-y-3">
        {reportItems.map((item) => (
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
