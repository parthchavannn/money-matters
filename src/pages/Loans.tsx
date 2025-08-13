import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCurrency } from "@/context/CurrencyContext";
import { addMonths, format, lastDayOfMonth } from "date-fns";

// Types
export type Loan = {
  id: string;
  name: string;
  principalINR: number;
  rateAnnualPct: number; // Annual interest rate in %
  minEmiINR: number; // Monthly EMI in INR
  dueDay: number; // 1-28 recommended
  monthsLeft: number; // remaining months
};

function clampDueDate(date: Date, day: number) {
  const maxDay = lastDayOfMonth(date).getDate();
  const d = new Date(date);
  d.setDate(Math.min(day, maxDay));
  return d;
}

export default function Loans() {
  const { format: formatCurrency } = useCurrency();

  const [loans, setLoans] = useLocalStorage<Loan[]>("loans", []);

  // Form state
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [emi, setEmi] = useState("");
  const [dueDay, setDueDay] = useState("5");
  const [monthsLeft, setMonthsLeft] = useState("");

  const addLoan = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const e = parseFloat(emi);
    const d = parseInt(dueDay);
    const m = parseInt(monthsLeft);
    if (!name || isNaN(p) || isNaN(r) || isNaN(e) || isNaN(d) || isNaN(m)) return;
    const newLoan: Loan = {
      id: crypto.randomUUID(),
      name: name.trim(),
      principalINR: Math.max(0, Math.round(p)),
      rateAnnualPct: Math.max(0, r),
      minEmiINR: Math.max(0, Math.round(e)),
      dueDay: Math.min(28, Math.max(1, d)),
      monthsLeft: Math.max(0, m),
    };
    setLoans([newLoan, ...loans]);
    setName("");
    setPrincipal("");
    setRate("");
    setEmi("");
    setDueDay("5");
    setMonthsLeft("");
  };

  const deleteLoan = (id: string) => {
    setLoans(loans.filter((l) => l.id !== id));
  };

  // Prioritization: Avalanche (highest interest rate first), then by principal desc
  const prioritized = useMemo(() => {
    return [...loans].sort((a, b) => {
      if (b.rateAnnualPct !== a.rateAnnualPct) return b.rateAnnualPct - a.rateAnnualPct;
      return b.principalINR - a.principalINR;
    });
  }, [loans]);

  // EMI Calendar: next 6 months with per-loan entries
  const months = Array.from({ length: 6 }, (_, i) => addMonths(new Date(), i));
  const calendar = useMemo(() => {
    return months.map((monthDate) => {
      const entries = loans
        .filter((l) => l.monthsLeft > 0)
        .map((l) => {
          return {
            loanId: l.id,
            name: l.name,
            date: clampDueDate(monthDate, l.dueDay),
            amountINR: l.minEmiINR,
          };
        });
      const totalINR = entries.reduce((s, e) => s + e.amountINR, 0);
      return { monthDate, entries, totalINR };
    });
  }, [months, loans]);

  return (
    <main className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Loan Prioritizer & EMI Calendar</title>
        <meta name="description" content="Prioritize loans by interest and track upcoming EMIs with a simple calendar." />
        <link rel="canonical" href="/loans" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Loan Prioritizer & EMI Calendar</h1>
        <p className="text-sm text-muted-foreground">Add your loans, see recommended payoff order, and upcoming EMIs.</p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Loan</CardTitle>
            <CardDescription>Amounts are treated as INR and shown in your selected currency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Loan name (e.g., Car Loan)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" inputMode="numeric" placeholder="Principal (₹)" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              <Input type="number" inputMode="decimal" placeholder="Rate % (annual)" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" inputMode="numeric" placeholder="Min EMI (₹)" value={emi} onChange={(e) => setEmi(e.target.value)} />
              <Input type="number" inputMode="numeric" placeholder="Months left" value={monthsLeft} onChange={(e) => setMonthsLeft(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <Input type="number" inputMode="numeric" placeholder="Due day (1-28)" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              <Button onClick={addLoan} className="w-full">Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommended Payoff Order</CardTitle>
            <CardDescription>Sorted by highest interest rate (avalanche method).</CardDescription>
          </CardHeader>
          <CardContent>
            {prioritized.length === 0 ? (
              <p className="text-sm text-muted-foreground">No loans yet. Add one to see recommendations.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Loan</TableHead>
                    <TableHead className="text-right">Rate %</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Min EMI</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prioritized.map((l, idx) => (
                    <TableRow key={l.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-right">{l.rateAnnualPct.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(l.principalINR)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(l.minEmiINR)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteLoan(l.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>EMI Calendar (Next 6 Months)</CardTitle>
            <CardDescription>Shows due dates and totals per month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {calendar.map(({ monthDate, entries, totalINR }) => (
              <div key={monthDate.toISOString()} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">{format(monthDate, "MMMM yyyy")}</h3>
                  <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalINR)}</span>
                </div>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No EMIs due.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Loan</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e.loanId + format(e.date, "yyyy-MM-dd") }>
                          <TableCell>{format(e.date, "do MMM, EEE")}</TableCell>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(e.amountINR)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
