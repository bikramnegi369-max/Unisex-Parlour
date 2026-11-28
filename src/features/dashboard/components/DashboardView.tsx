"use client";

import React, { useState, useTransition } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import { ComparisonPeriod, DateFilterPreset } from "../types/dashboard.types";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { useDashboardOperations } from "../hooks/useDashboardOperations";
import { useDashboardAlerts } from "../hooks/useDashboardAlerts";

import { DashboardHeader } from "./header/DashboardHeader";
import { DashboardKpisGrid } from "./kpis/DashboardKpisGrid";
import { RevenueTrendChart } from "./charts/RevenueTrendChart";
import { TodayOperationsView } from "./operations/TodayOperationsView";
import { DashboardAlertsCenter } from "./alerts/DashboardAlertsCenter";

import { ServiceProductAnalyticsCard } from "./sections/ServiceProductAnalyticsCard";
import { CustomerIntelligenceCard } from "./sections/CustomerIntelligenceCard";
import { FinanceIntelligenceCard } from "./sections/FinanceIntelligenceCard";
import { InventoryProcurementCard } from "./sections/InventoryProcurementCard";
import { StaffIntelligenceCard } from "./sections/StaffIntelligenceCard";
import { LoyaltyMembershipsCard } from "./sections/LoyaltyMembershipsCard";
import { BranchComparisonCard } from "./sections/BranchComparisonCard";

export function DashboardView() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Date filters state: default to "today"
  const today = new Date();
  const formattedToday = format(today, "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>(formattedToday);
  const [endDate, setEndDate] = useState<string>(formattedToday);
  const [activePreset, setActivePreset] =
    useState<DateFilterPreset>("today");
  const [compareWith, setCompareWith] =
    useState<ComparisonPeriod>("previous_period");

  // Multi-tier API hooks
  const overviewQuery = useDashboardOverview({
    startDate,
    endDate,
    compareWith,
  });

  const operationsQuery = useDashboardOperations();
  const alertsQuery = useDashboardAlerts();

  const handleDateChange = (
    start: string,
    end: string,
    preset: DateFilterPreset,
  ) => {
    startTransition(() => {
      setStartDate(start);
      setEndDate(end);
      setActivePreset(preset);
    });
  };

  const handleCompareChange = (compare: ComparisonPeriod) => {
    startTransition(() => {
      setCompareWith(compare);
    });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });
  };

  const isRefreshing =
    overviewQuery.isRefetching ||
    operationsQuery.isRefetching ||
    alertsQuery.isRefetching ||
    isPending;

  // Global error state if the primary overview endpoint fails
  if (overviewQuery.isError && !overviewQuery.data) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          startDate={startDate}
          endDate={endDate}
          compareWith={compareWith}
          activePreset={activePreset}
          onDateChange={handleDateChange}
          onCompareChange={handleCompareChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-card border border-rose-500/30 text-center space-y-4">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
            <AlertCircle size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Failed to load Dashboard Intelligence
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              {overviewQuery.error?.message ||
                "An unexpected network or server error occurred while computing business metrics."}
            </p>
          </div>
          <button
            onClick={() => overviewQuery.refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header with Filters & Controls */}
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        compareWith={compareWith}
        activePreset={activePreset}
        onDateChange={handleDateChange}
        onCompareChange={handleCompareChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        generatedAt={overview?.meta?.generatedAt}
      />

      {/* 2. Action Center (Real-time exceptions) */}
      <DashboardAlertsCenter
        data={alertsQuery.data}
        isLoading={alertsQuery.isLoading}
      />

      {/* 3. Today's Operational Command Centre (Timeline & Floor Roster) */}
      <TodayOperationsView
        data={operationsQuery.data}
        isLoading={operationsQuery.isLoading}
        isError={operationsQuery.isError}
        onRetry={() => operationsQuery.refetch()}
      />

      {/* 4. Executive KPI Grid (10 Core Metrics) */}
      <DashboardKpisGrid
        data={overview?.kpis}
        isLoading={overviewQuery.isLoading}
      />

      {/* 5. Revenue Trend Visualizer (Sales vs Net Collections vs Refunds) */}
      <RevenueTrendChart
        data={overview?.revenueTrend || []}
        isLoading={overviewQuery.isLoading}
      />

      {/* 6. Multi-Branch Performance Comparison (Rendered on Org-wide Consolidated View) */}
      {overview?.branchComparison && overview.branchComparison.length > 1 && (
        <BranchComparisonCard branches={overview.branchComparison} />
      )}

      {/* 7. Module Domain Intelligence Cards */}
      {overviewQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 rounded-2xl bg-card border border-border/60 p-5 space-y-4"
            >
              <div className="h-5 w-48 bg-muted rounded-md" />
              <div className="h-24 bg-muted/40 rounded-xl" />
              <div className="h-20 bg-muted/30 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services & Retail Product Merchandising */}
          {overview?.services && (
            <ServiceProductAnalyticsCard
              topServices={overview.services.topServices || []}
              retailProducts={
                overview.services.retailProducts || {
                  totalQuantitySold: 0,
                  totalRevenue: 0,
                }
              }
            />
          )}

          {/* Customer Acquisition & Retention Health */}
          {overview?.customers && (
            <CustomerIntelligenceCard customers={overview.customers} />
          )}

          {/* Finance & Operating Cash Margin */}
          <FinanceIntelligenceCard finance={overview?.finance} />

          {/* Inventory Stock Health & Procurement Payables */}
          <InventoryProcurementCard
            inventory={overview?.inventory}
            procurement={overview?.procurement}
          />

          {/* Staff Stylist Performance & Payroll */}
          <StaffIntelligenceCard
            incentives={overview?.incentives}
            payroll={overview?.payroll}
          />

          {/* VIP Memberships, Packages, Coupons & Loyalty */}
          <LoyaltyMembershipsCard
            memberships={overview?.memberships}
            subscriptions={overview?.subscriptions}
            coupons={overview?.coupons}
            loyalty={overview?.loyalty}
          />
        </div>
      )}
    </div>
  );
}
