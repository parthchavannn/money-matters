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
import Sidebar from "./components/layout/Sidebar";
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
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/budget-planner" element={<BudgetPlanner />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/recurring" element={<RecurringTransactions />} />
            <Route path="/net-worth" element={<NetWorth />} />
            <Route path="/debt-calculator" element={<DebtPayoffCalculator />} />
            <Route path="/savings-projections" element={<SavingsProjections />} />
            <Route path="/financial-report" element={<FinancialReport />} />
            <Route path="/financial-calendar" element={<FinancialCalendar />} />
            <Route path="/spending-trends" element={<SpendingTrends />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
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