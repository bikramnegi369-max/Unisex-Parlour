"use client";

import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { setSidebarOpen } from "@/store/slices/uiSlice";
import { X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const isMobileOpen = useAppSelector((state) => state.ui.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Desktop Sidebar (visible on md+) */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer (visible on mobile/tablet when open) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => dispatch(setSidebarOpen(false))}
          />

          {/* Drawer Menu */}
          <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 text-slate-300 shadow-xl z-50">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => dispatch(setSidebarOpen(false))}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidebar content */}
            <div className="h-full overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto flex flex-col h-full">
            <Breadcrumbs />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
