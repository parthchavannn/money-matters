import { useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  delta: {
    value: number;
    label: string;
    comparison: string;
  };
  sparklineData: Array<{ value: number }>;
  color: "success" | "warning" | "danger" | "info";
  icon?: string;
  trend: "up" | "down" | "neutral";
}

const colorSchemes = {
  success: {
    bg: "bg-emerald-500",
    text: "text-emerald-100",
    valueText: "text-white",
    sparkline: "#10b981"
  },
  warning: {
    bg: "bg-amber-500", 
    text: "text-amber-100",
    valueText: "text-white",
    sparkline: "#f59e0b"
  },
  danger: {
    bg: "bg-red-500",
    text: "text-red-100", 
    valueText: "text-white",
    sparkline: "#ef4444"
  },
  info: {
    bg: "bg-blue-500",
    text: "text-blue-100",
    valueText: "text-white", 
    sparkline: "#3b82f6"
  }
};

export function KPICard({ 
  title, 
  value, 
  delta, 
  sparklineData, 
  color, 
  icon,
  trend 
}: KPICardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const scheme = colorSchemes[color];
  
  const trendIcon = trend === "up" ? "↗" : trend === "down" ? "↘" : "→";
  const deltaColor = delta.value > 0 ? "text-green-200" : delta.value < 0 ? "text-red-200" : "text-gray-200";

  return (
    <Card className={cn("relative overflow-hidden border-0", scheme.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            {icon && <span className="text-lg">{icon}</span>}
            <h3 className={cn("text-sm font-medium", scheme.text)}>{title}</h3>
          </div>
          <div className="flex items-center space-x-1">
            <span className={cn("text-xs font-medium", deltaColor)}>
              {trendIcon} {Math.abs(delta.value)}%
            </span>
            <Info 
              className={cn("w-3 h-3 cursor-help", scheme.text)}
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <div className={cn("text-2xl font-bold mb-1", scheme.valueText)}>
            {value}
          </div>
          <div className={cn("text-xs", scheme.text)}>
            {delta.label} • {delta.comparison}
          </div>
        </div>

        {/* Sparkline */}
        <div className="h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={scheme.sparkline}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Info tooltip */}
        {showInfo && (
          <div className="absolute top-2 right-8 bg-black text-white text-xs rounded px-2 py-1 z-10">
            {delta.comparison}
          </div>
        )}
      </CardContent>
    </Card>
  );
}