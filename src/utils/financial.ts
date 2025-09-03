export function computeFinancialScore(
  userData: {
    income: { monthlyIncome: number; currentSavings: number };
    expenses: Record<string, number>;
  },
  totalDebt: number,
  monthlyDebtPayment: number
): number {
  const income = Math.max(0, Number(userData?.income?.monthlyIncome || 0));
  const savings = Math.max(0, Number(userData?.income?.currentSavings || 0));
  const expenses = Object.values(userData?.expenses || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  // Metrics (0-100 each)
  // 1) Savings rate: higher is better. 20%+ ~ good
  const savingsRate = income > 0 ? Math.min(1, Math.max(0, (income - expenses) / income)) : 0;
  const savingsScore = savingsRate * 100; // 0-100

  // 2) Debt-to-income: lower is better. 0-20% is good, 40%+ is poor
  const dti = income > 0 ? monthlyDebtPayment / income : 1; // 0..1+
  const dtiScore = 100 * (1 - Math.min(1, dti / 0.4)); // 0 at 40%+, 100 at 0%

  // 3) Emergency fund coverage in months: 6+ months ideal
  const monthlyNeeds = Math.max(1, expenses); // avoid div by zero
  const monthsCovered = savings / monthlyNeeds;
  const emergencyScore = Math.min(100, (monthsCovered / 6) * 100); // 100 at 6+ months

  // Weighted total
  const score = 0.4 * savingsScore + 0.3 * dtiScore + 0.3 * emergencyScore;
  return Math.round(Math.max(0, Math.min(100, score)));
}
