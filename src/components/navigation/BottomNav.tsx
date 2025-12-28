import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, PlusCircle, Target, BarChart3, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  isAction?: boolean;
  match: (p: string) => boolean;
}

const items: NavItem[] = [
  { to: "/dashboard", label: "Home", Icon: Home, match: (p: string) => p === "/dashboard" },
  { to: "/goals", label: "Goals", Icon: Target, match: (p: string) => p.startsWith("/goals") },
  { to: "/tracker", label: "Add", Icon: PlusCircle, isAction: true, match: (p: string) => p.startsWith("/tracker") },
  { to: "/analytics", label: "Stats", Icon: BarChart3, match: (p: string) => p.startsWith("/analytics") || p.startsWith("/spending") },
  { to: "/budget-planner", label: "Budget", Icon: LayoutDashboard, match: (p: string) => p.startsWith("/budget") },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/95 backdrop-blur-xl border-t border-border/50",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 h-16">
        {items.map(({ to, label, Icon, isAction, match }) => {
          const active = match(pathname);
          
          if (isAction) {
            return (
              <li key={to} className="contents">
                <Link
                  to={to}
                  className="flex flex-col items-center justify-center relative -mt-4"
                >
                  <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95">
                    <Icon className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground mt-1">{label}</span>
                </Link>
              </li>
            );
          }
          
          return (
            <li key={to} className="contents">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  active && "bg-primary/10"
                )}>
                  <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  active && "text-primary"
                )}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
