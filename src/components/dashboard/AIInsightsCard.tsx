import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { computeFinancialScore } from "@/utils/financial";

interface AIInsight {
  type: "recommendation" | "warning" | "achievement" | "opportunity";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  rationale?: string;
  impact?: string;
}

interface AIInsightsCardProps {
  userData: any;
  totalDebt: number;
  monthlyDebtPayment: number;
  format: (amount: number) => string;
  onOptimizeBudget: () => void;
}

export function AIInsightsCard({ 
  userData, 
  totalDebt, 
  monthlyDebtPayment, 
  format, 
  onOptimizeBudget 
}: AIInsightsCardProps) {
  const [showRationale, setShowRationale] = useState<string | null>(null);
  
  const financialScore = computeFinancialScore(userData, totalDebt, monthlyDebtPayment);
  
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];
    const monthlyIncome = Number(userData?.income?.monthlyIncome || 0);
    const expenses = userData?.expenses || {};
    const totalExpenses = Object.values(expenses).reduce((sum: number, expense: any) => {
      const expenseNum = Number(expense || 0);
      return sum + expenseNum;
    }, 0);
    const availableForGoals = Number(monthlyIncome) - Number(totalExpenses);
    const savingsRate = monthlyIncome > 0 ? ((Number(monthlyIncome) - Number(totalExpenses)) / Number(monthlyIncome)) * 100 : 0;
    
    // Financial Score Insight
    if (financialScore >= 80) {
      insights.push({
        type: "achievement",
        title: "Excellent Financial Health!",
        description: `Your financial score is ${financialScore}/100. You're doing great with savings and debt management.`,
        rationale: "High savings rate, low debt-to-income ratio, and good emergency fund coverage.",
        impact: "Continue current habits to maintain financial stability"
      });
    } else if (financialScore >= 60) {
      insights.push({
        type: "recommendation", 
        title: "Good Progress, Room for Improvement",
        description: `Your financial score is ${financialScore}/100. Focus on increasing savings or reducing debt.`,
        action: {
          label: "Optimize Budget",
          onClick: onOptimizeBudget
        },
        rationale: "Moderate financial health with opportunity for improvement in key areas.",
        impact: "Could improve score by 10-20 points with focused changes"
      });
    } else {
      insights.push({
        type: "warning",
        title: "Financial Health Needs Attention", 
        description: `Your financial score is ${financialScore}/100. Consider reviewing your budget and debt strategy.`,
        action: {
          label: "Get Help",
          onClick: onOptimizeBudget
        },
        rationale: "Low savings rate, high debt burden, or insufficient emergency savings.",
        impact: "Immediate action needed to improve financial stability"
      });
    }
    
    // Savings Rate Insight
    if (savingsRate < 10) {
      insights.push({
        type: "warning",
        title: "Low Savings Rate",
        description: `You're saving ${savingsRate.toFixed(1)}% of income. Aim for at least 20%.`,
        action: {
          label: "Review Expenses",
          onClick: onOptimizeBudget
        },
        rationale: "Financial experts recommend saving 20% of income for long-term financial health.",
        impact: `Increasing to 20% would add ${format(Math.max(0, monthlyIncome * 0.2 - availableForGoals))} monthly savings`
      });
    }
    
    // Available Goals Insight
    if (availableForGoals > 0) {
      insights.push({
        type: "opportunity",
        title: "Surplus Available for Goals",
        description: `You have ${format(availableForGoals)} available for goals this month.`,
        rationale: "After all expenses, you have positive cash flow that can be allocated strategically.",
        impact: "Could accelerate goal achievement or boost emergency savings"
      });
    }

    return insights.slice(0, 3); // Limit to 3 insights
  };

  const insights = generateInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "recommendation":
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "achievement":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "opportunity":
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "recommendation":
        return "border-l-amber-400 bg-amber-50";
      case "warning":
        return "border-l-red-400 bg-red-50";
      case "achievement":
        return "border-l-green-400 bg-green-50";
      case "opportunity":
        return "border-l-blue-400 bg-blue-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span>✨</span>
          <span>AI Financial Insights</span>
          <Badge variant="secondary" className="text-xs">
            Score: {financialScore}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className={`border-l-4 p-4 rounded-r-lg ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start space-x-3">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  {insight.rationale && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRationale(
                        showRationale === `${index}` ? null : `${index}`
                      )}
                    >
                      <HelpCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                
                {showRationale === `${index}` && insight.rationale && (
                  <div className="mb-3 p-3 bg-white rounded border text-xs">
                    <p className="font-medium mb-1">Why this matters:</p>
                    <p className="text-gray-600 mb-2">{insight.rationale}</p>
                    {insight.impact && (
                      <>
                        <p className="font-medium mb-1">Potential impact:</p>
                        <p className="text-gray-600">{insight.impact}</p>
                      </>
                    )}
                  </div>
                )}
                
                {insight.action && (
                  <Button 
                    size="sm" 
                    onClick={insight.action.onClick}
                    className="text-xs"
                  >
                    {insight.action.label} →
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}