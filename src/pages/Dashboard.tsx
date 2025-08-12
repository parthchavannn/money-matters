import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetPlan } from "@/utils/budget";

export default function Dashboard() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { format } = useCurrency();
  const plan: BudgetPlan = (loc.state?.plan as BudgetPlan) || {
    monthlyIncome: 60000,
    monthlyFixed: 20000,
    monthlyEmi: 5000,
    monthlyGoals: 6000,
    emergency: 3000,
    lifestyle: 26000,
    leftover: 26000,
  };

  const data = [
    { name: "Fixed", value: plan.monthlyFixed },
    { name: "EMIs", value: plan.monthlyEmi },
    { name: "Goals", value: plan.monthlyGoals },
    { name: "Emergency", value: plan.emergency },
    { name: "Lifestyle", value: plan.lifestyle },
  ];

  const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#e9d5ff", "#7c3aed"];

  const tip = plan.leftover < 2000
    ? "Budget is tight. Consider reducing lifestyle spending by 5% and prioritizing emergency fund."
    : `You have ${format(plan.leftover)} discretionary. Suggest saving a bit more toward your top goal.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard – Money Matter</title>
        <meta name="description" content="See your monthly AI-generated budget and tips." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/dashboard" />
      </Helmet>
      <main className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Monthly Plan</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/onboarding")}>Edit inputs</Button>
            <Button variant="secondary" onClick={() => navigate("/tracker")}>Daily Tracker</Button>
            <Button onClick={() => navigate("/")}>Home</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Breakdown</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: number, n: string) => [format(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Tip</CardTitle>
              <CardDescription>Personalized nudge</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm md:text-base">{tip}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Income</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{format(plan.monthlyIncome)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Essentials</CardTitle>
              <CardDescription>Fixed + EMIs + Emergency</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{format(plan.monthlyFixed + plan.monthlyEmi + plan.emergency)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Goals / month</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{format(plan.monthlyGoals)}</CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
