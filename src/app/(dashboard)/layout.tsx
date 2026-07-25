"use client";

import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { setSidebarOpen, setTheme } from "@/store/slices/uiSlice";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBranches } from "@/features/branches/hooks/useBranches";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dispatch = useAppDispatch();
  const isMobileOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const theme = useAppSelector((state) => state.ui.theme);
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Initialize branch context — fetches user's branches and populates Redux
  useBranches();

  // Sync theme with DOM
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      dispatch(setTheme("dark"));
    }
  }, [dispatch]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
        {/* Desktop Sidebar (visible on md+) */}
        <div className="hidden md:block h-full shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Drawer Overlay Sidebar */}
        {isMobile && isMobileOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => dispatch(setSidebarOpen(false))}
            />

            {/* Drawer Menu */}
            <div className="relative flex flex-col w-64 max-w-xs bg-sidebar border-r border-sidebar-border shadow-xl z-50">
              {/* Sidebar content */}
              <div className="h-full overflow-y-auto">
                <Sidebar onClose={() => dispatch(setSidebarOpen(false))} />
              </div>
            </div>
          </div>
        )}

        {/* Main Panel Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header */}
          <Header />

          {/* Dynamic Route Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/20 dark:bg-slate-900/10">
            <div className="max-w-7xl mx-auto flex flex-col h-full">
              <Breadcrumbs />
              <div className="flex-1">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
