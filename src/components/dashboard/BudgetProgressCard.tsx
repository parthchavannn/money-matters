import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye } from "lucide-react";

interface BudgetCategory {
  name: string;
  budgeted: number;
  spent: number;
  projected: number;
  color: string;
}

interface BudgetProgressCardProps {
  categories: BudgetCategory[];
  format: (amount: number) => string;
  onViewDetails: (category: string) => void;
}

export function BudgetProgressCard({ categories, format, onViewDetails }: BudgetProgressCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getThresholdColor = (percentage: number) => {
    if (percentage <= 70) return "text-green-600 bg-green-50";
    if (percentage <= 100) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 70) return "bg-green-500";
    if (percentage <= 100) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>📊</span>
            <span>Budget Progress</span>
          </span>
          <Button variant="ghost" size="sm" className="text-xs">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => {
          const percentage = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
          const projectedPercentage = category.budgeted > 0 ? (category.projected / category.budgeted) * 100 : 0;
          const remaining = category.budgeted - category.spent;
          
          return (
            <div 
              key={index} 
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                selectedCategory === category.name ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{category.name}</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getThresholdColor(percentage)}>
                    {Math.round(percentage)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(category.name);
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(category.spent)} / {format(category.budgeted)}
                  </span>
                  <span className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                    {format(Math.abs(remaining))} {remaining >= 0 ? "left" : "over"}
                  </span>
                </div>
                
                <div className="relative">
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="h-2"
                  />
                  {projectedPercentage > percentage && (
                    <div 
                      className="absolute top-0 h-2 bg-gray-300 opacity-50 rounded-full"
                      style={{ 
                        left: `${Math.min(percentage, 100)}%`, 
                        width: `${Math.min(projectedPercentage - percentage, 100 - percentage)}%` 
                      }}
                    />
                  )}
                </div>
                
                {projectedPercentage > 100 && (
                  <div className="flex items-center space-x-1 text-xs text-red-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>Projected to exceed by {format(category.projected - category.budgeted)}</span>
                  </div>
                )}
              </div>
              
              {selectedCategory === category.name && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Daily Average:</span>
                      <span className="ml-1 font-medium">{format(category.spent / new Date().getDate())}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Projected:</span>
                      <span className="ml-1 font-medium">{format(category.projected)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}