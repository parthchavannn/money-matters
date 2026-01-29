import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/navigation/BottomNav";
import MobileHeader from "@/components/navigation/MobileHeader";
import MobileDrawer from "@/components/navigation/MobileDrawer";
import Sidebar from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

// Pages that should show back button instead of menu
const pagesWithBackButton = [
  "/goals",
  "/savings-projections",
  "/budget-planner",
  "/recurring",
  "/debts",
  "/net-worth",
  "/investments",
  "/debt-calculator",
  "/analytics",
  "/spending-trends",
  "/financial-report",
  "/financial-calendar",
  "/settings",
];

export default function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const showBackButton = pagesWithBackButton.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader 
          onMenuOpen={() => setDrawerOpen(true)} 
          showBack={showBackButton}
        />
      )}

      {/* Mobile Drawer */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Page content */}
      <main className={isMobile ? "pt-14 pb-24" : "md:pl-64"}>
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </div>
  );
}
