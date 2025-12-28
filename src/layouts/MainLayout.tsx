import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/navigation/BottomNav";
import MobileHeader from "@/components/navigation/MobileHeader";
import MobileDrawer from "@/components/navigation/MobileDrawer";
import Sidebar from "@/components/layout/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />
      )}

      {/* Mobile Drawer */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Page content */}
      <main className={isMobile ? "pb-24" : "md:pl-64"}>
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </div>
  );
}
