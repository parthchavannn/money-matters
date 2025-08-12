export type BudgetInput = {
  cityTier: "Tier 1" | "Tier 2" | "Tier 3" | "Rural";
  incomes: { label: string; amount: number }[];
  fixedExpenses: { label: string; amount: number }[];
  emis: { label: string; amount: number; interest?: number; monthsLeft?: number }[];
  savings: number;
  goals: { title: string; deadlineMonths: number; preference: "Direct" | "EMI"; priority: "High" | "Medium" | "Low"; targetAmount: number }[];
};

export type BudgetPlan = {
  monthlyIncome: number;
  monthlyFixed: number;
  monthlyEmi: number;
  monthlyGoals: number;
  lifestyle: number;
  emergency: number;
  leftover: number;
};

const TIER_MULTIPLIER: Record<BudgetInput["cityTier"], number> = {
  "Tier 1": 1.0,
  "Tier 2": 0.9,
  "Tier 3": 0.8,
  "Rural": 0.7,
};

export function generateBudget(input: BudgetInput): BudgetPlan {
  const income = input.incomes.reduce((s, i) => s + (i.amount || 0), 0);
  const fixed = input.fixedExpenses.reduce((s, e) => s + (e.amount || 0), 0) * TIER_MULTIPLIER[input.cityTier];
  const emis = input.emis.reduce((s, e) => s + (e.amount || 0), 0);

  // Goal allocations: distribute by priority weight
  const priorityWeight = { High: 3, Medium: 2, Low: 1 } as const;
  const totalWeight = input.goals.reduce((s, g) => s + priorityWeight[g.priority], 0) || 1;
  let monthlyGoals = 0;
  input.goals.forEach((g) => {
    const base = g.targetAmount / Math.max(1, g.deadlineMonths);
    const weighted = base * (priorityWeight[g.priority] / totalWeight);
    monthlyGoals += weighted;
  });

  // Emergency fund min 5% income or ₹500
  const emergency = Math.max(500, income * 0.05);

  // Lifestyle gets what's left after essentials, emis, goals, emergency
  const essentials = fixed + emis + monthlyGoals + emergency;
  const leftover = Math.max(0, income - essentials);
  const lifestyle = leftover;

  return {
    monthlyIncome: income,
    monthlyFixed: Math.round(fixed),
    monthlyEmi: Math.round(emis),
    monthlyGoals: Math.round(monthlyGoals),
    emergency: Math.round(emergency),
    lifestyle: Math.round(lifestyle),
    leftover: Math.round(leftover),
  };
}
