import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { BarChart3, ClipboardCheck, Home, ListChecks, Plus, Settings, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reviewDue } from "@/domain/calc";
import { monthLabel } from "@/domain/dates";
import { useFinance } from "@/store/FinanceContext";
import { TransactionDialogProvider, useTransactionDialog } from "@/components/TransactionDialog";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/activity", label: "Activity", icon: ListChecks },
  { to: "/plan", label: "Plan", icon: Target },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">M</span>
      <span className="text-base font-semibold tracking-tight">Money Matter</span>
    </Link>
  );
}

function Sidebar() {
  const { data } = useFinance();
  const { openAdd } = useTransactionDialog();
  const due = reviewDue(data);
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <div className="px-2">
        <Logo />
      </div>
      <Button className="mt-6 justify-start gap-2" onClick={() => openAdd()}>
        <Plus className="h-4 w-4" /> Add transaction
        <kbd className="ml-auto rounded bg-primary-foreground/20 px-1.5 text-[10px] font-medium">N</kbd>
      </Button>
      <nav className="mt-5 flex flex-1 flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" /> {label}
          </NavLink>
        ))}
      </nav>
      {due && (
        <Link
          to={`/review?month=${due}`}
          className="mb-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-accent p-3 text-xs text-accent-foreground hover:border-primary"
        >
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="block font-semibold">{monthLabel(due)} review</span>
            Confirm balances &amp; close the month
          </span>
        </Link>
      )}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          )
        }
      >
        <Settings className="h-[18px] w-[18px]" /> Settings
      </NavLink>
    </aside>
  );
}

function MobileChrome() {
  const { openAdd } = useTransactionDialog();
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <Button asChild variant="ghost" size="icon" aria-label="Settings">
          <Link to="/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <button
        onClick={() => openAdd()}
        aria-label="Add transaction"
        className="fixed bottom-[4.75rem] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <TransactionDialogProvider>
      <div className="min-h-screen">
        <Sidebar />
        <MobileChrome />
        <main key={pathname} className="mx-auto max-w-5xl px-4 pb-32 pt-5 md:ml-60 md:max-w-none md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </TransactionDialogProvider>
  );
}
