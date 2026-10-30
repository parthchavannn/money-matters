import { Suspense, lazy } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FinanceProvider, useFinance } from "@/store/FinanceContext";
import { dataKeyFor } from "@/store/storage";
import { AuthProvider, useAuth } from "@/cloud/AuthContext";
import { CloudBoundary } from "@/cloud/CloudBoundary";
import { createSupabaseStore } from "@/cloud/supabaseStore";
import { supabase } from "@/lib/supabase";
import AuthScreen, { SetNewPassword } from "@/pages/AuthScreen";
import Home from "@/pages/Home";
import Activity from "@/pages/Activity";
import Plan from "@/pages/Plan";
import Review from "@/pages/Review";
import Settings from "@/pages/Settings";
import Welcome from "@/pages/Welcome";

// Chart pages pull in Recharts; load them only when opened.
const Wealth = lazy(() => import("@/pages/Wealth"));
const Insights = lazy(() => import("@/pages/Insights"));

function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="mb-2 text-5xl">🧭</div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">That page doesn't exist — head back home.</p>
    </div>
  );
}

const Lazy = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>}>{children}</Suspense>
);

function Routed() {
  const { data } = useFinance();

  if (!data.settings.onboarded) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<Welcome />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="activity" element={<Activity />} />
          <Route path="plan" element={<Plan />} />
          <Route path="wealth" element={<Lazy><Wealth /></Lazy>} />
          <Route path="insights" element={<Lazy><Insights /></Lazy>} />
          <Route path="review" element={<Review />} />
          <Route path="settings" element={<Settings />} />

          {/* Links from the previous version of the app keep working. */}
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="tracker" element={<Navigate to="/activity" replace />} />
          <Route path="budget-planner" element={<Navigate to="/plan?tab=budget" replace />} />
          <Route path="recurring" element={<Navigate to="/plan?tab=bills" replace />} />
          <Route path="goals" element={<Navigate to="/plan?tab=goals" replace />} />
          <Route path="accounts" element={<Navigate to="/wealth" replace />} />
          <Route path="net-worth" element={<Navigate to="/wealth" replace />} />
          <Route path="debts" element={<Navigate to="/wealth" replace />} />
          <Route path="loans" element={<Navigate to="/wealth" replace />} />
          <Route path="investments" element={<Navigate to="/wealth" replace />} />
          <Route path="analytics" element={<Navigate to="/insights" replace />} />
          <Route path="spending-trends" element={<Navigate to="/insights" replace />} />
          <Route path="financial-report" element={<Navigate to="/insights" replace />} />
          <Route path="monthly-checkin" element={<Navigate to="/review" replace />} />
          <Route path="onboarding" element={<Navigate to="/" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

function Toasts() {
  const { data } = useFinance();
  return <Toaster theme={data.settings.theme} position="top-center" richColors closeButton offset={12} />;
}

/** Everything that needs the user's data: toasts, routing, tooltips. */
function AppBody() {
  return (
    <TooltipProvider>
      <Toasts />
      <Routed />
    </TooltipProvider>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
      Loading…
    </div>
  );
}

/**
 * No backend configured → local-only, no login (great for trying it out).
 * Backend configured    → must sign in; each user gets their own cache + server document.
 */
function Gate() {
  const { enabled, loading, user, recovering } = useAuth();

  if (!enabled) {
    return (
      <FinanceProvider>
        <AppBody />
      </FinanceProvider>
    );
  }
  if (loading) return <Splash />;
  if (recovering) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <SetNewPassword />
      </>
    );
  }
  if (!user) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <AuthScreen />
      </>
    );
  }
  // key = user id: switching accounts remounts everything, so data can never bleed across users.
  return (
    <FinanceProvider key={user.id} storageKey={dataKeyFor(user.id)}>
      <CloudBoundary key={user.id} userId={user.id} store={createSupabaseStore(supabase!, user.id)}>
        <AppBody />
      </CloudBoundary>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
