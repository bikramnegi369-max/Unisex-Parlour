import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RevenueReportView } from "../components/RevenueReportView";
import { StaffPerformanceReportView } from "../components/StaffPerformanceReportView";
import { CustomerRetentionReportView } from "../components/CustomerRetentionReportView";
import { ServiceAnalyticsReportView } from "../components/ServiceAnalyticsReportView";
import { InventoryReportView } from "../components/InventoryReportView";
import { OverviewReportView } from "../components/OverviewReportView";
import ReportsPage from "@/app/(dashboard)/reports/page";

import {
  RevenueReportResponse,
  StaffPerformanceReportResponse,
  CustomerRetentionReportResponse,
  ServiceAnalyticsReportResponse,
  InventoryReportResponse,
  ReportsOverviewResponse,
  PaginatedReportParams,
} from "../types/reports.types";

// Mock auth hook to control user permissions
const mockUseAuth = vi.fn();
const reportHookMocks = vi.hoisted(() => ({
  useReportsOverview: vi.fn(),
  useRevenueReport: vi.fn(),
  useStaffPerformanceReport: vi.fn(),
  useCustomerRetentionReport: vi.fn(),
  useServiceAnalyticsReport: vi.fn(),
  useInventoryReport: vi.fn(),
  useBranchContext: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock branch context hook
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: reportHookMocks.useBranchContext,
}));

// Mock reports hooks for page level test
vi.mock("../hooks/useReports", () => ({
  useReportsOverview: reportHookMocks.useReportsOverview,
  useRevenueReport: reportHookMocks.useRevenueReport,
  useStaffPerformanceReport: reportHookMocks.useStaffPerformanceReport,
  useCustomerRetentionReport: reportHookMocks.useCustomerRetentionReport,
  useServiceAnalyticsReport: reportHookMocks.useServiceAnalyticsReport,
  useInventoryReport: reportHookMocks.useInventoryReport,
}));

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: {
      id: "report-user",
      permissions: [
        "reports.revenue.view",
        "reports.performance.view",
        "reports.retention.view",
        "reports.services.view",
        "reports.inventory.view",
      ],
    },
  });
  reportHookMocks.useBranchContext.mockReturnValue({
    branchKey: "branch-001",
    currentBranchId: "branch-001",
    availableBranches: [{ id: "branch-001", name: "Downtown Salon" }],
  });
  [
    reportHookMocks.useReportsOverview,
    reportHookMocks.useRevenueReport,
    reportHookMocks.useStaffPerformanceReport,
    reportHookMocks.useCustomerRetentionReport,
    reportHookMocks.useServiceAnalyticsReport,
    reportHookMocks.useInventoryReport,
  ].forEach((hook) => {
    hook.mockReturnValue({ data: null, isLoading: false, refetch: vi.fn() });
  });
});

afterEach(() => {
  cleanup();
});

describe("Reports & Analytics Views Component Test Suite", () => {
  it("uses server pagination and resets report pages when filters or branch scope change", async () => {
    const metric = { current: 0, previous: null, trend: "neutral" as const };
    reportHookMocks.useRevenueReport.mockImplementation((params: PaginatedReportParams) => ({
      isLoading: false,
      refetch: vi.fn(),
      data: {
        meta: {
          organizationId: "org-1",
          branchId: "branch-1",
          branchName: "Downtown",
          currency: "INR",
          startDate: params.startDate,
          endDate: params.endDate,
          comparisonStartDate: null,
          comparisonEndDate: null,
          timezone: "Asia/Kolkata",
          generatedAt: "",
        },
        summary: {
          grossBilled: metric,
          totalDiscounts: metric,
          subscriptionCoveredValue: metric,
          netBilled: metric,
          grossCollected: metric,
          refundsIssued: metric,
          netCollected: metric,
          outstandingReceivables: metric,
        },
        streams: {
          servicesBilled: 0,
          retailBilled: 0,
          membershipsBilled: 0,
          subscriptionsBilled: 0,
        },
        tenderBreakdown: [],
        timeSeries: [],
        recentTransactions: [],
        pagination: {
          recentTransactions: {
            page: params.page,
            limit: params.limit,
            total: 25,
            totalPages: Math.ceil(25 / params.limit),
          },
        },
      },
    }));

    const { container, rerender } = render(<ReportsPage />);
    fireEvent.click(screen.getByRole("button", { name: /revenue & collections/i }));

    await waitFor(() => {
      expect(reportHookMocks.useRevenueReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        true,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => {
      expect(reportHookMocks.useRevenueReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
        true,
      );
    });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2026-03-01" } });
    await waitFor(() => {
      expect(reportHookMocks.useRevenueReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, startDate: "2026-03-01" }),
        true,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    fireEvent.change(screen.getByLabelText("Items per page"), {
      target: { value: "25" },
    });
    await waitFor(() => {
      expect(reportHookMocks.useRevenueReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 25 }),
        true,
      );
    });

    fireEvent.change(screen.getByLabelText("Items per page"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
    reportHookMocks.useBranchContext.mockReturnValue({
      branchKey: "branch-002",
      currentBranchId: "branch-002",
      availableBranches: [{ id: "branch-002", name: "Uptown Salon" }],
    });
    rerender(<ReportsPage />);

    await waitFor(() => {
      expect(reportHookMocks.useRevenueReport).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        true,
      );
    });
  });

  it("renders unavailable overview metrics from permission-filtered API responses", () => {
    const mockOverviewData: ReportsOverviewResponse = {
      meta: {
        organizationId: "org-1",
        branchId: null,
        branchName: "All Branches",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: null,
        comparisonEndDate: null,
        timezone: "Asia/Kolkata",
        generatedAt: "",
      },
      summary: {
        netSalesBilled: null,
        moneyCollected: null,
        completedServices: null,
        totalVisitingClients: null,
        repeatVisitRate: null,
        lowStockItemCount: null,
      },
      operationalSignals: [],
      quickInsights: [],
    };

    render(
      <OverviewReportView
        data={mockOverviewData}
        isLoading={false}
        onNavigateTab={vi.fn()}
      />,
    );

    expect(screen.getAllByText("—")).toHaveLength(6);
  });

  it("renders RevenueReportView with accurate revenue streams and tender breakdown", () => {
    const mockRevenueData: RevenueReportResponse = {
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Downtown",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: "2026-10-12",
        comparisonEndDate: "2026-10-31",
        timezone: "Asia/Kolkata",
        generatedAt: "2026-11-23T10:00:00.000Z",
      },
      summary: {
        grossBilled: { current: 150000, previous: 120000, trend: "up" },
        totalDiscounts: { current: 10000, previous: 5000, trend: "up" },
        subscriptionCoveredValue: { current: 15000, previous: 10000, trend: "up" },
        netBilled: { current: 125000, previous: 105000, trend: "up" },
        grossCollected: { current: 130000, previous: 100000, trend: "up" },
        refundsIssued: { current: 2000, previous: 0, trend: "up" },
        netCollected: { current: 128000, previous: 100000, trend: "up" },
        outstandingReceivables: { current: 5000, previous: 5000, trend: "neutral" },
      },
      streams: {
        servicesBilled: 95000,
        retailBilled: 20000,
        membershipsBilled: 10000,
        subscriptionsBilled: 25000,
      },
      tenderBreakdown: [
        { method: "Cash", amount: 60000, transactionCount: 40, percentageOfTotal: 46.15 },
        { method: "UPI", amount: 68000, transactionCount: 50, percentageOfTotal: 52.31 },
      ],
      timeSeries: [],
      recentTransactions: [],
      pagination: {
        recentTransactions: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
    };

    render(
      <RevenueReportView
        data={mockRevenueData}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    // Check revenue stream numbers format
    expect(screen.getByText(/₹95,000/)).toBeInTheDocument();
    expect(screen.getByText(/₹20,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹10,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/₹25,000/)).toBeInTheDocument();

    // Check tender breakdown
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
  });

  it("renders StaffPerformanceReportView with delivery metrics and staff rankings", () => {
    const mockStaffData: StaffPerformanceReportResponse = {
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Downtown",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: null,
        comparisonEndDate: null,
        timezone: "Asia/Kolkata",
        generatedAt: "",
      },
      summary: {
        totalServicesDelivered: { current: 142, previous: 120, trend: "up" },
        totalChairTimeHours: { current: 95, previous: 80, trend: "up" },
        serviceRevenueGenerated: { current: 85000, previous: 70000, trend: "up" },
        retailSalesGenerated: { current: 15000, previous: 10000, trend: "up" },
        topPerformingStaffName: "Ananya Sharma",
      },
      rankings: [
        {
          staffId: "st-1",
          name: "Ananya Sharma",
          staffCode: "STY-01",
          servicesCompletedCount: 45,
          serviceHours: 32,
          serviceRevenueCredit: 38000,
          retailSalesCredit: 8000,
          packageSalesCredit: 0,
          totalRevenueContribution: 46000,
          totalRevenueCredit: 46000,
        },
      ],
      pagination: {
        rankings: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    };

    render(
      <StaffPerformanceReportView
        data={mockStaffData}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Ananya Sharma")).toBeInTheDocument();
    expect(screen.getByText("STY-01")).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument(); // services count
    expect(screen.getByText(/₹46,000/)).toBeInTheDocument(); // total revenue credit
    expect(screen.getByRole("navigation", { name: "Pagination Navigation" })).toBeInTheDocument();
  });

  it("renders CustomerRetentionReportView respecting phone masking and history completeness badge", () => {
    const mockRetentionData: CustomerRetentionReportResponse = {
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Downtown",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: null,
        comparisonEndDate: null,
        timezone: "Asia/Kolkata",
        generatedAt: "",
      },
      summary: {
        totalVisitingClients: { current: 80, previous: 60, trend: "up" },
        newClientsAcquired: { current: 30, previous: 20, trend: "up" },
        returningClients: { current: 50, previous: 40, trend: "up" },
        repeatVisitRate: { current: 62.5, previous: 66.6, trend: "down" },
        atRiskClientsCount: 8,
        historyCompleteness: "truncated",
        historyCompletenessNote: "Client history truncated to recent migration horizon.",
      },
      recencyBuckets: {
        active: 45,
        dueForService: 20,
        atRisk: 8,
        lapsed: 7,
      },
      visitFrequencyDistribution: [],
      clientDirectory: [
        {
          customerId: "cust-1",
          name: "Rahul Verma",
          phone: "+91 ••••• •••89", // Masked phone from backend
          lastVisitDate: "2026-11-18",
          totalLifetimeVisits: 4,
          daysSinceLastVisit: 5,
          statusTier: "active",
        },
      ],
      pagination: {
        clientDirectory: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    };

    render(
      <CustomerRetentionReportView
        data={mockRetentionData}
        isLoading={false}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    // Phone masking preserved
    expect(screen.getByText("+91 ••••• •••89")).toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();

    // Completeness banner rendered
    expect(screen.getByText(/truncated/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Client history truncated to recent migration horizon/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pagination Navigation" })).toBeInTheDocument();
  });

  it("renders ServiceAnalyticsReportView with popular services leaderboard", () => {
    const mockServicesData: ServiceAnalyticsReportResponse = {
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Downtown",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: null,
        comparisonEndDate: null,
        timezone: "Asia/Kolkata",
        generatedAt: "",
      },
      summary: {
        totalServicesCompleted: { current: 210, previous: 180, trend: "up" },
        averageServiceTicket: { current: 750, previous: 700, trend: "up" },
        mostRequestedServiceName: "Keratin Treatment",
        topRevenueCategoryName: "Hair Care",
      },
      topServices: [
        {
          serviceId: "srv-1",
          name: "Keratin Treatment",
          category: "Hair Care",
          executionCount: 52,
          totalGrossRevenue: 104000,
          averageDurationMinutes: 90,
          percentageContribution: 38.5,
        },
      ],
      categoryShare: [
        {
          category: "Hair Care",
          executionCount: 120,
          revenue: 150000,
          percentageShare: 70,
        },
      ],
      pagination: {
        topServices: { page: 1, limit: 10, total: 1, totalPages: 1 },
        categoryShare: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    };

    render(
      <ServiceAnalyticsReportView
        data={mockServicesData}
        isLoading={false}
        onServicesPageChange={vi.fn()}
        onServicesPageSizeChange={vi.fn()}
        onCategoriesPageChange={vi.fn()}
        onCategoriesPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Keratin Treatment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hair Care").length).toBeGreaterThan(0);
    expect(screen.getByText(/₹1,04,000/)).toBeInTheDocument();
    expect(screen.getByText("52")).toBeInTheDocument();
    expect(
      screen.getAllByRole("navigation", { name: "Pagination Navigation" }),
    ).toHaveLength(2);
  });

  it("renders InventoryReportView with strict distinction between Consumables and Retail stock", () => {
    const mockInventoryData: InventoryReportResponse = {
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Downtown",
        currency: "INR",
        startDate: "2026-11-01",
        endDate: "2026-11-20",
        comparisonStartDate: null,
        comparisonEndDate: null,
        timezone: "Asia/Kolkata",
        generatedAt: "",
      },
      summary: {
        totalTrackedSkuCount: 45,
        lowStockConsumablesCount: 2,
        lowStockRetailCount: 1,
        consumablesUsedInPeriod: { current: 350, previous: 300, trend: "up" },
        retailUnitsSoldInPeriod: { current: 48, previous: 40, trend: "up" },
        auditNetDiscrepancyDelta: 0,
      },
      lowStockAlerts: [
        {
          stockBalanceId: "balance-1",
          productId: "prod-1",
          name: "L'Oreal Bleach Powder",
          sku: "BLCH-500",
          category: "Hair Chemicals",
          usageType: "salon_consumption",
          onHandConsumables: 2,
          onHandRetail: 0,
          totalOnHand: 2,
          reorderLevel: 5,
          urgency: "critical",
        },
        {
          stockBalanceId: "balance-2",
          productId: "prod-2",
          name: "Moroccanoil Treatment 100ml",
          sku: "MOR-OIL",
          category: "Retail Haircare",
          usageType: "retail_sale",
          onHandConsumables: 0,
          onHandRetail: 1,
          totalOnHand: 1,
          reorderLevel: 4,
          urgency: "warning",
        },
      ],
      movementLogs: [
        {
          movementId: "mov-1",
          timestamp: "2026-11-20T14:30:00Z",
          productName: "L'Oreal Bleach Powder",
          sku: "BLCH-500",
          movementType: "service_consumption",
          quantityDelta: -1,
          stockDomain: "salon_consumables",
          actorName: "Master Stylist",
          notes: "Balayage service",
        },
      ],
      pagination: {
        lowStockAlerts: { page: 1, limit: 10, total: 2, totalPages: 1 },
        movementLogs: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    };

    render(
      <InventoryReportView
        data={mockInventoryData}
        isLoading={false}
        onLowStockPageChange={vi.fn()}
        onLowStockPageSizeChange={vi.fn()}
        onMovementPageChange={vi.fn()}
        onMovementPageSizeChange={vi.fn()}
      />,
    );

    // Separate consumables and retail low stock entries
    expect(screen.getAllByText("L'Oreal Bleach Powder").length).toBeGreaterThan(0);
    expect(screen.getByText("Moroccanoil Treatment 100ml")).toBeInTheDocument();
    expect(screen.getAllByText("salon_consumption").length).toBeGreaterThan(0);
    expect(screen.getAllByText("retail_sale").length).toBeGreaterThan(0);

    // Movement log
    expect(screen.getByText(/service consumption/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("navigation", { name: "Pagination Navigation" }),
    ).toHaveLength(2);
  });

  it("hides unauthorized report tabs based on user permissions", () => {
    // User only has inventory view permission
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-inventory",
        permissions: ["reports.inventory.view"],
      },
    });

    render(<ReportsPage />);

    // Overview is always accessible
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();

    // Inventory tab is visible
    expect(screen.getByRole("button", { name: /inventory & stock/i })).toBeInTheDocument();

    // Revenue, Staff, Retention, and Services tabs must be hidden
    expect(screen.queryByRole("button", { name: /revenue & collections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /staff performance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /customer retention/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /service analytics/i })).not.toBeInTheDocument();
  });
});
