import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/navigation/BottomNav";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page content with bottom padding so it doesn't hide behind nav */}
      <div className="pb-28 md:pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
