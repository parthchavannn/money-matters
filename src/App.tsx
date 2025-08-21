import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CurrencyProvider } from "./context/CurrencyContext";
import { UserDataProvider } from "./context/UserDataContext";
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
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <UserDataProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </UserDataProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;