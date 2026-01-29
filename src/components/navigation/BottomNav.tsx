import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, ReceiptText, CreditCard, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
  { to: "/tracker", label: "Tracker", Icon: ReceiptText, match: (p: string) => p.startsWith("/tracker") },
  { to: "/loans", label: "Loans", Icon: CreditCard, match: (p: string) => p.startsWith("/loans") },
  { to: "/onboarding", label: "Setup", Icon: UserPlus, match: (p: string) => p.startsWith("/onboarding") },
] as const;

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={to} className="contents">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
