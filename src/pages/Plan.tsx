import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import BudgetTab from "@/components/plan/BudgetTab";
import BillsTab from "@/components/plan/BillsTab";
import GoalsTab from "@/components/plan/GoalsTab";

const TABS = ["budget", "bills", "goals"] as const;

export default function Plan() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as string) : "budget";

  return (
    <div>
      <PageHeader title="Plan" subtitle="Budgets, recurring bills & income, and the things you're saving for." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="mb-4 grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="bills">Bills &amp; income</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="budget">
          <BudgetTab />
        </TabsContent>
        <TabsContent value="bills">
          <BillsTab />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
