"use client";

import React, { useState } from "react";
import { format, subDays } from "date-fns";
import { BarChart3, DollarSign, Users, UserCheck, Scissors, Package } from "lucide-react";
import PermissionGate from "@/components/layout/PermissionGate";
import { ReportsFilterParams } from "@/features/reports/types/reports.types";
import {
  useReportsOverview,
  useRevenueReport,
  useStaffPerformanceReport,
  useCustomerRetentionReport,
  useServiceAnalyticsReport,
  useInventoryReport,
} from "@/features/reports/hooks/useReports";
import { reportsApi } from "@/features/reports/api/reports.api";
import { ReportsFilterBar } from "@/features/reports/components/ReportsFilterBar";
import { OverviewReportView } from "@/features/reports/components/OverviewReportView";
import { RevenueReportView } from "@/features/reports/components/RevenueReportView";
import { StaffPerformanceReportView } from "@/features/reports/components/StaffPerformanceReportView";
import { CustomerRetentionReportView } from "@/features/reports/components/CustomerRetentionReportView";
import { ServiceAnalyticsReportView } from "@/features/reports/components/ServiceAnalyticsReportView";
import { InventoryReportView } from "@/features/reports/components/InventoryReportView";

type ReportTab = "overview" | "revenue" | "staff" | "retention" | "services" | "inventory";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<ReportsFilterParams>({
    startDate: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    compareWith: "previous_period",
  });

  // Queries (only active tab query executes)
  const overviewQuery = useReportsOverview(filters, activeTab === "overview");
  const revenueQuery = useRevenueReport(filters, activeTab === "revenue");
  const staffQuery = useStaffPerformanceReport(filters, activeTab === "staff");
  const retentionQuery = useCustomerRetentionReport(filters, activeTab === "retention");
  const servicesQuery = useServiceAnalyticsReport(filters, activeTab === "services");
  const inventoryQuery = useInventoryReport(filters, activeTab === "inventory");

  const handleRefresh = () => {
    if (activeTab === "overview") overviewQuery.refetch();
    else if (activeTab === "revenue") revenueQuery.refetch();
    else if (activeTab === "staff") staffQuery.refetch();
    else if (activeTab === "retention") retentionQuery.refetch();
    else if (activeTab === "services") servicesQuery.refetch();
    else if (activeTab === "inventory") inventoryQuery.refetch();
  };

  const handleExportCsv = async () => {
    if (activeTab !== "revenue" && activeTab !== "inventory") return;
    try {
      setIsExporting(true);
      const csvString = await reportsApi.exportReportCsv(activeTab, filters);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${activeTab}-report-${filters.startDate}-to-${filters.endDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export CSV failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reports & Salon Intelligence
          </h1>
          <p className="text-xs text-muted-foreground">
            Authoritative business performance, revenue integrity, staff productivity, and retention analytics.
          </p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <ReportsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
        exportable={activeTab === "revenue" || activeTab === "inventory"}
        isExporting={isExporting}
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Overview
        </button>

        <PermissionGate permission="reports.revenue.view">
          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeTab === "revenue"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Revenue & Collections
          </button>
        </PermissionGate>

        <PermissionGate permission="reports.performance.view">
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeTab === "staff"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Staff Performance
          </button>
        </PermissionGate>

        <PermissionGate permission="reports.retention.view">
          <button
            type="button"
            onClick={() => setActiveTab("retention")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeTab === "retention"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Customer Retention
          </button>
        </PermissionGate>

        <PermissionGate permission="reports.services.view">
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeTab === "services"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Scissors className="h-3.5 w-3.5" />
            Service Analytics
          </button>
        </PermissionGate>

        <PermissionGate permission="reports.inventory.view">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Inventory & Stock
          </button>
        </PermissionGate>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "overview" && (
          <OverviewReportView
            data={overviewQuery.data}
            isLoading={overviewQuery.isLoading}
            onNavigateTab={(tab) => setActiveTab(tab as ReportTab)}
          />
        )}

        {activeTab === "revenue" && (
          <PermissionGate permission="reports.revenue.view">
            <RevenueReportView
              data={revenueQuery.data}
              isLoading={revenueQuery.isLoading}
            />
          </PermissionGate>
        )}

        {activeTab === "staff" && (
          <PermissionGate permission="reports.performance.view">
            <StaffPerformanceReportView
              data={staffQuery.data}
              isLoading={staffQuery.isLoading}
            />
          </PermissionGate>
        )}

        {activeTab === "retention" && (
          <PermissionGate permission="reports.retention.view">
            <CustomerRetentionReportView
              data={retentionQuery.data}
              isLoading={retentionQuery.isLoading}
            />
          </PermissionGate>
        )}

        {activeTab === "services" && (
          <PermissionGate permission="reports.services.view">
            <ServiceAnalyticsReportView
              data={servicesQuery.data}
              isLoading={servicesQuery.isLoading}
            />
          </PermissionGate>
        )}

        {activeTab === "inventory" && (
          <PermissionGate permission="reports.inventory.view">
            <InventoryReportView
              data={inventoryQuery.data}
              isLoading={inventoryQuery.isLoading}
            />
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
