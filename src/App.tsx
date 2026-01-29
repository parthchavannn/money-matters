import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CurrencyProvider } from "./context/CurrencyContext";
import { UserDataProvider, useUserData } from "./context/UserDataContext";
import { useAuth } from "./hooks/useAuth";
import { AuthForm } from "./components/auth/AuthForm";
import MainLayout from "./layouts/MainLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import BudgetPlanner from "./pages/BudgetPlanner";
import Debts from "./pages/Debts";
import Investments from "./pages/Investments";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Tracker from "./pages/Tracker";
import Loans from "./pages/Loans";
import RecurringTransactions from "./pages/RecurringTransactions";
import NetWorth from "./pages/NetWorth";
import DebtPayoffCalculator from "./pages/DebtPayoffCalculator";
import SavingsProjections from "./pages/SavingsProjections";
import FinancialReport from "./pages/FinancialReport";
import FinancialCalendar from "./pages/FinancialCalendar";
import SpendingTrends from "./pages/SpendingTrends";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import PlanningHub from "./pages/PlanningHub";
import WealthHub from "./pages/WealthHub";
import ReportsHub from "./pages/ReportsHub";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const { userData, loading: userDataLoading } = useUserData();

  if (authLoading || userDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // If user is logged in but hasn't completed onboarding, redirect to onboarding
  if (!userData.isOnboardingCompleted) {
    return (
      <HashRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Onboarding />} />
          </Routes>
        </div>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Hub Pages */}
          <Route path="/planning" element={<PlanningHub />} />
          <Route path="/wealth" element={<WealthHub />} />
          <Route path="/reports" element={<ReportsHub />} />
          {/* Planning Sub-pages */}
          <Route path="/goals" element={<Goals />} />
          <Route path="/budget-planner" element={<BudgetPlanner />} />
          <Route path="/recurring" element={<RecurringTransactions />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/savings-projections" element={<SavingsProjections />} />
          {/* Wealth Sub-pages */}
          <Route path="/net-worth" element={<NetWorth />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/debt-calculator" element={<DebtPayoffCalculator />} />
          {/* Reports Sub-pages */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/spending-trends" element={<SpendingTrends />} />
          <Route path="/financial-report" element={<FinancialReport />} />
          <Route path="/financial-calendar" element={<FinancialCalendar />} />
          {/* Other Pages */}
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <UserDataProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CurrencyProvider>
      </UserDataProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
