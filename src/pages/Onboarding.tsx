import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { generateBudget, type BudgetInput } from "@/utils/budget";
import { useCurrency } from "@/context/CurrencyContext";

const currencyOptions = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "AED", symbol: "د.إ" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setCurrency, format } = useCurrency();
  const [data, setData] = useState<BudgetInput>({
    cityTier: "Tier 1",
    incomes: [{ label: "Your income", amount: 60000 }],
    fixedExpenses: [
      { label: "Rent", amount: 15000 },
      { label: "Groceries", amount: 6000 },
      { label: "Bills", amount: 4000 },
    ],
    emis: [],
    savings: 0,
    goals: [
      { title: "iPhone", deadlineMonths: 12, preference: "Direct", priority: "Medium", targetAmount: 80000 },
    ],
  });

  const plan = generateBudget(data);

  const totalFixedPreview = plan.monthlyFixed + plan.monthlyEmi + plan.emergency + plan.monthlyGoals;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onboarding – Money Matter</title>
        <meta name="description" content="Enter income, expenses, EMIs, and goals to build your plan." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/onboarding" />
      </Helmet>

      <main className="container py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Let’s tailor your plan</h1>
        <p className="text-muted-foreground mb-8">Answer a few quick questions. You can edit everything later.</p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>City tier and currency preferences</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>City/Tier</Label>
                <Select
                  value={data.cityTier}
                  onValueChange={(v) => setData((d) => ({ ...d, cityTier: v as BudgetInput["cityTier"] }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tier 1">Tier 1 (Metro)</SelectItem>
                    <SelectItem value="Tier 2">Tier 2</SelectItem>
                    <SelectItem value="Tier 3">Tier 3</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  onValueChange={(code) => {
                    const item = currencyOptions.find((c) => c.code === code)!;
                    setCurrency(item);
                  }}
                  defaultValue="INR"
                >
                  <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick preview</CardTitle>
              <CardDescription>Based on current inputs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Income</span><span>{format(plan.monthlyIncome)}</span></div>
                <div className="flex justify-between"><span>Fixed + EMIs + Emergency + Goals</span><span>{format(totalFixedPreview)}</span></div>
                <Separator />
                <div className="flex justify-between font-medium"><span>Left for lifestyle</span><span>{format(plan.lifestyle)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Income</CardTitle>
              <CardDescription>Add contributors if needed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.incomes.map((inc, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-3">
                  <Input
                    value={inc.label}
                    onChange={(e) => {
                      const v = e.target.value; const arr = [...data.incomes]; arr[idx] = { ...inc, label: v }; setData({ ...data, incomes: arr });
                    }}
                    placeholder="Label"
                  />
                  <Input
                    type="number"
                    value={inc.amount}
                    onChange={(e) => {
                      const v = Number(e.target.value); const arr = [...data.incomes]; arr[idx] = { ...inc, amount: v }; setData({ ...data, incomes: arr });
                    }}
                    placeholder="Amount/month"
                  />
                  <Button variant="secondary" onClick={() => setData((d) => ({ ...d, incomes: d.incomes.filter((_, i) => i !== idx) }))}>Remove</Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setData((d) => ({ ...d, incomes: [...d.incomes, { label: "Other", amount: 0 }] }))}>Add income</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fixed expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.fixedExpenses.map((it, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3">
                  <Input value={it.label} onChange={(e) => { const arr = [...data.fixedExpenses]; arr[idx] = { ...it, label: e.target.value }; setData({ ...data, fixedExpenses: arr }); }} />
                  <Input type="number" value={it.amount} onChange={(e) => { const arr = [...data.fixedExpenses]; arr[idx] = { ...it, amount: Number(e.target.value) }; setData({ ...data, fixedExpenses: arr }); }} />
                </div>
              ))}
              <Button variant="outline" onClick={() => setData((d) => ({ ...d, fixedExpenses: [...d.fixedExpenses, { label: "Other", amount: 0 }] }))}>Add expense</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>EMIs / Debts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.emis.map((e, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3">
                  <Input value={e.label} onChange={(ev) => { const arr = [...data.emis]; arr[idx] = { ...e, label: ev.target.value }; setData({ ...data, emis: arr }); }} />
                  <Input type="number" value={e.amount} onChange={(ev) => { const arr = [...data.emis]; arr[idx] = { ...e, amount: Number(ev.target.value) }; setData({ ...data, emis: arr }); }} />
                </div>
              ))}
              <Button variant="outline" onClick={() => setData((d) => ({ ...d, emis: [...d.emis, { label: "Loan", amount: 0 }] }))}>Add EMI</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>Tell us what you’re aiming for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.goals.map((g, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-3">
                  <Input value={g.title} onChange={(e) => { const arr = [...data.goals]; arr[idx] = { ...g, title: e.target.value }; setData({ ...data, goals: arr }); }} placeholder="Goal title" />
                  <Input type="number" value={g.targetAmount} onChange={(e) => { const arr = [...data.goals]; arr[idx] = { ...g, targetAmount: Number(e.target.value) }; setData({ ...data, goals: arr }); }} placeholder="Target amt (INR)" />
                  <Input type="number" value={g.deadlineMonths} onChange={(e) => { const arr = [...data.goals]; arr[idx] = { ...g, deadlineMonths: Number(e.target.value) }; setData({ ...data, goals: arr }); }} placeholder="Months" />
                  <Select value={g.preference} onValueChange={(v) => { const arr = [...data.goals]; arr[idx] = { ...g, preference: v as any }; setData({ ...data, goals: arr }); }}>
                    <SelectTrigger><SelectValue placeholder="Preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direct">Direct</SelectItem>
                      <SelectItem value="EMI">EMI</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={g.priority} onValueChange={(v) => { const arr = [...data.goals]; arr[idx] = { ...g, priority: v as any }; setData({ ...data, goals: arr }); }}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <Button variant="outline" onClick={() => setData((d) => ({ ...d, goals: [...d.goals, { title: "New goal", deadlineMonths: 12, preference: "Direct", priority: "Low", targetAmount: 0 }] }))}>Add goal</Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mt-10">
          <Button variant="secondary" onClick={() => navigate("/")}>Back</Button>
          <Button size="lg" onClick={() => navigate("/dashboard", { state: { data, plan } })}>Generate my plan</Button>
        </div>
      </main>
    </div>
  );
}
