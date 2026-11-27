"use client";

import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { useHorizontalHoverScroll } from "@/hooks/useHorizontalHoverScroll";

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
import { useBranchContext } from "@/hooks/useBranchContext";

type ReportTab = "overview" | "revenue" | "staff" | "retention" | "services" | "inventory";

const initialPagination = {
  revenuePage: 1,
  revenueLimit: 10,
  staffPage: 1,
  staffLimit: 10,
  retentionPage: 1,
  retentionLimit: 10,
  servicesPage: 1,
  servicesLimit: 10,
  categoryPage: 1,
  categoryLimit: 10,
  lowStockPage: 1,
  lowStockLimit: 10,
  movementPage: 1,
  movementLimit: 10,
};

type PaginationState = typeof initialPagination & { branchKey: string };

const resetReportPagination = (current: PaginationState): PaginationState => ({
  ...current,
  revenuePage: 1,
  staffPage: 1,
  retentionPage: 1,
  servicesPage: 1,
  categoryPage: 1,
  lowStockPage: 1,
  movementPage: 1,
});

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const { containerProps: tabScrollProps } = useHorizontalHoverScroll<HTMLDivElement>();
  const [isExporting, setIsExporting] = useState(false);
  const { branchKey } = useBranchContext();
  const [pagination, setPagination] = useState<PaginationState>({
    ...initialPagination,
    branchKey,
  });
  const activePagination =
    pagination.branchKey === branchKey
      ? pagination
      : { ...initialPagination, branchKey };

  const [filters, setFilters] = useState<ReportsFilterParams>({
    startDate: format(subDays(new Date(), 29), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    compareWith: "previous_period",
  });

  const handleFilterChange = (nextFilters: ReportsFilterParams) => {
    setFilters(nextFilters);
    setPagination(resetReportPagination(activePagination));
  };

  const updatePage = (key: keyof typeof initialPagination, page: number) => {
    setPagination({ ...activePagination, [key]: page });
  };

  const updatePageSize = (
    pageKey: keyof typeof initialPagination,
    limitKey: keyof typeof initialPagination,
    limit: number,
  ) => {
    setPagination({ ...activePagination, [pageKey]: 1, [limitKey]: limit });
  };

  const revenueParams = {
    ...filters,
    page: activePagination.revenuePage,
    limit: activePagination.revenueLimit,
  };
  const staffParams = {
    ...filters,
    page: activePagination.staffPage,
    limit: activePagination.staffLimit,
  };
  const retentionParams = {
    ...filters,
    page: activePagination.retentionPage,
    limit: activePagination.retentionLimit,
  };
  const servicesParams = {
    ...filters,
    page: activePagination.servicesPage,
    limit: activePagination.servicesLimit,
    categoryPage: activePagination.categoryPage,
    categoryLimit: activePagination.categoryLimit,
  };
  const inventoryParams = {
    ...filters,
    lowStockPage: activePagination.lowStockPage,
    lowStockLimit: activePagination.lowStockLimit,
    movementPage: activePagination.movementPage,
    movementLimit: activePagination.movementLimit,
  };

  // Queries (only active tab query executes)
  const overviewQuery = useReportsOverview(filters, activeTab === "overview");
  const revenueQuery = useRevenueReport(revenueParams, activeTab === "revenue");
  const staffQuery = useStaffPerformanceReport(staffParams, activeTab === "staff");
  const retentionQuery = useCustomerRetentionReport(retentionParams, activeTab === "retention");
  const servicesQuery = useServiceAnalyticsReport(servicesParams, activeTab === "services");
  const inventoryQuery = useInventoryReport(inventoryParams, activeTab === "inventory");

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
      <PageHeaderBanner
        title="Reports & Salon Intelligence"
        description="Authoritative business performance, revenue integrity, staff productivity, and retention analytics."
        icon={BarChart3}
      />

      {/* Global Filter Bar */}
      <ReportsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        onExportCsv={handleExportCsv}
        exportable={activeTab === "revenue" || activeTab === "inventory"}
        isExporting={isExporting}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/60 backdrop-blur-xs rounded-2xl p-1.5 shadow-xs">
        <div
          {...tabScrollProps}
          className="flex space-x-1 overflow-x-auto no-scrollbar scroll-smooth"
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <PermissionGate permission="reports.revenue.view">
            <button
              type="button"
              onClick={() => setActiveTab("revenue")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === "revenue"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Revenue & Collections</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="reports.performance.view">
            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === "staff"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Staff Performance</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="reports.retention.view">
            <button
              type="button"
              onClick={() => setActiveTab("retention")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === "retention"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Customer Retention</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="reports.services.view">
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === "services"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Scissors className="h-4 w-4" />
              <span>Service Analytics</span>
            </button>
          </PermissionGate>

          <PermissionGate permission="reports.inventory.view">
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === "inventory"
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventory & Stock</span>
            </button>
          </PermissionGate>
        </div>
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
              onPageChange={(page) => updatePage("revenuePage", page)}
              onPageSizeChange={(limit) =>
                updatePageSize("revenuePage", "revenueLimit", limit)
              }
            />
          </PermissionGate>
        )}

        {activeTab === "staff" && (
          <PermissionGate permission="reports.performance.view">
            <StaffPerformanceReportView
              data={staffQuery.data}
              isLoading={staffQuery.isLoading}
              onPageChange={(page) => updatePage("staffPage", page)}
              onPageSizeChange={(limit) => updatePageSize("staffPage", "staffLimit", limit)}
            />
          </PermissionGate>
        )}

        {activeTab === "retention" && (
          <PermissionGate permission="reports.retention.view">
            <CustomerRetentionReportView
              data={retentionQuery.data}
              isLoading={retentionQuery.isLoading}
              onPageChange={(page) => updatePage("retentionPage", page)}
              onPageSizeChange={(limit) =>
                updatePageSize("retentionPage", "retentionLimit", limit)
              }
            />
          </PermissionGate>
        )}

        {activeTab === "services" && (
          <PermissionGate permission="reports.services.view">
            <ServiceAnalyticsReportView
              data={servicesQuery.data}
              isLoading={servicesQuery.isLoading}
              onServicesPageChange={(page) => updatePage("servicesPage", page)}
              onServicesPageSizeChange={(limit) =>
                updatePageSize("servicesPage", "servicesLimit", limit)
              }
              onCategoriesPageChange={(page) => updatePage("categoryPage", page)}
              onCategoriesPageSizeChange={(limit) =>
                updatePageSize("categoryPage", "categoryLimit", limit)
              }
            />
          </PermissionGate>
        )}

        {activeTab === "inventory" && (
          <PermissionGate permission="reports.inventory.view">
            <InventoryReportView
              data={inventoryQuery.data}
              isLoading={inventoryQuery.isLoading}
              onLowStockPageChange={(page) => updatePage("lowStockPage", page)}
              onLowStockPageSizeChange={(limit) =>
                updatePageSize("lowStockPage", "lowStockLimit", limit)
              }
              onMovementPageChange={(page) => updatePage("movementPage", page)}
              onMovementPageSizeChange={(limit) =>
                updatePageSize("movementPage", "movementLimit", limit)
              }
            />
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
