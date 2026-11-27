"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Layers,
  CircleDollarSign,
  Receipt,
  Wallet,
  Store,
  Users,
  Truck,
  TrendingUp,
  ArrowLeftRight,
  FileSpreadsheet,
  History,
} from "lucide-react";

export type FinanceTabKey =
  | "overview"
  | "revenue"
  | "expenses"
  | "petty-cash"
  | "daily-closing"
  | "payroll"
  | "suppliers"
  | "profitability"
  | "transactions"
  | "reports"
  | "audit";

interface NavItem {
  key: FinanceTabKey;
  label: string;
  icon: React.ElementType;
  isPermitted: boolean;
  badge?: string | number;
}

interface FinanceNavigationProps {
  activeTab: FinanceTabKey;
  onSelectTab: (tab: FinanceTabKey) => void;
  pendingApprovalsCount?: number;
  unreconciledClosuresCount?: number;
}

export default function FinanceNavigation({
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  unreconciledClosuresCount = 0,
}: FinanceNavigationProps) {
  const { user } = useAuth();

  const canViewFinance = hasPermission(user, "finance.view");
  const canViewExpenses = hasPermission(user, "expenses.view");
  const canViewTransactions =
    hasPermission(user, "finance.transactions.view") || canViewFinance;
  const canViewAudit =
    hasPermission(user, "finance.audit.view") ||
    hasPermission(user, "logs.view") ||
    canViewFinance;
  const canExportReports =
    hasPermission(user, "finance.reports.export") || canViewFinance;
  const canCreateOrApproveClosure =
    hasPermission(user, "finance.create") ||
    hasPermission(user, "finance.edit");

  // Determine user role profile for focused navigation
  const isCashier = user?.role === "cashier" || user?.role === "receptionist";

  const allNavItems: NavItem[] = [
    {
      key: "overview",
      label: "Financial Overview",
      icon: Layers,
      isPermitted: canViewFinance && !isCashier,
    },
    {
      key: "revenue",
      label: "Revenue & Collections",
      icon: CircleDollarSign,
      isPermitted: canViewFinance || isCashier,
    },
    {
      key: "expenses",
      label: "Operating Expenses",
      icon: Receipt,
      isPermitted: canViewExpenses && !isCashier,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      key: "petty-cash",
      label: "Petty Cash Drawer",
      icon: Wallet,
      isPermitted: canViewExpenses && !isCashier,
    },
    {
      key: "daily-closing",
      label: "Daily Register Closing",
      icon: Store,
      isPermitted: canCreateOrApproveClosure || canViewFinance || isCashier,
      badge:
        unreconciledClosuresCount > 0
          ? `${unreconciledClosuresCount} Unreconciled`
          : undefined,
    },
    {
      key: "payroll",
      label: "Payroll Costs",
      icon: Users,
      isPermitted: canViewFinance && !isCashier,
    },
    {
      key: "suppliers",
      label: "Supplier Obligations",
      icon: Truck,
      isPermitted: canViewFinance && !isCashier,
    },
    {
      key: "profitability",
      label: "Profitability & Branches",
      icon: TrendingUp,
      isPermitted: canViewFinance && !isCashier,
    },
    {
      key: "transactions",
      label: "Financial Transactions",
      icon: ArrowLeftRight,
      isPermitted: canViewTransactions && !isCashier,
    },
    {
      key: "reports",
      label: "Financial Reports",
      icon: FileSpreadsheet,
      isPermitted: canExportReports && !isCashier,
    },
    {
      key: "audit",
      label: "Audit History",
      icon: History,
      isPermitted: canViewAudit && !isCashier,
    },
  ];

  const permittedItems = allNavItems.filter((item) => item.isPermitted);

  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const hoverScrollRafRef = useRef<number | null>(null);
  const hoverScrollVelocityRef = useRef<number>(0);

  const stopHoverScroll = useCallback(() => {
    hoverScrollVelocityRef.current = 0;
    if (hoverScrollRafRef.current !== null) {
      cancelAnimationFrame(hoverScrollRafRef.current);
      hoverScrollRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
      if (hoverScrollRafRef.current !== null) {
        cancelAnimationFrame(hoverScrollRafRef.current);
      }
    };
  }, []);

  const stepHoverScroll = useCallback(() => {
    const tick = () => {
      const el = navScrollRef.current;
      const velocity = hoverScrollVelocityRef.current;
      if (!el || velocity === 0) {
        hoverScrollRafRef.current = null;
        return;
      }
      el.scrollLeft += velocity;
      hoverScrollRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const handleNavMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = navScrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) {
        stopHoverScroll();
        return;
      }
      const rect = el.getBoundingClientRect();
      const edgeZone = 56;
      const maxSpeed = 8;
      const distLeft = e.clientX - rect.left;
      const distRight = rect.right - e.clientX;

      if (distLeft < edgeZone) {
        hoverScrollVelocityRef.current =
          -maxSpeed * ((edgeZone - distLeft) / edgeZone);
      } else if (distRight < edgeZone) {
        hoverScrollVelocityRef.current =
          maxSpeed * ((edgeZone - distRight) / edgeZone);
      } else {
        stopHoverScroll();
        return;
      }

      if (hoverScrollRafRef.current === null) {
        hoverScrollRafRef.current = requestAnimationFrame(stepHoverScroll);
      }
    },
    [stepHoverScroll, stopHoverScroll],
  );

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-xs rounded-2xl p-1.5 shadow-xs">
      <div
        ref={navScrollRef}
        onMouseMove={handleNavMouseMove}
        onMouseLeave={stopHoverScroll}
        className="flex space-x-1 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {permittedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={(e) => {
                onSelectTab(item.key);
                e.currentTarget.scrollIntoView?.({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
