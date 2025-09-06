import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Calendar } from "lucide-react";

interface ChangeItem {
  type: "expense" | "income" | "alert" | "reminder";
  title: string;
  description: string;
  amount?: number;
  impact: "positive" | "negative" | "neutral";
}

interface WhatsChangedCardProps {
  changes: ChangeItem[];
  format: (amount: number) => string;
}

export function WhatsChangedCard({ changes, format }: WhatsChangedCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "expense":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case "income":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "alert":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "reminder":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "text-green-600 bg-green-50";
      case "negative":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span>📊</span>
          <span>What's Changed</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {changes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No significant changes this period</p>
        ) : (
          changes.map((change, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
              {getIcon(change.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium truncate">{change.title}</h4>
                  {change.amount && (
                    <Badge variant="outline" className={getImpactColor(change.impact)}>
                      {format(change.amount)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{change.description}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}