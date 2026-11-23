import React from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";

import { RevenueReportView } from "../components/RevenueReportView";
import { StaffPerformanceReportView } from "../components/StaffPerformanceReportView";
import { CustomerRetentionReportView } from "../components/CustomerRetentionReportView";
import { ServiceAnalyticsReportView } from "../components/ServiceAnalyticsReportView";
import { InventoryReportView } from "../components/InventoryReportView";
import ReportsPage from "@/app/(dashboard)/reports/page";

import {
  RevenueReportResponse,
  StaffPerformanceReportResponse,
  CustomerRetentionReportResponse,
  ServiceAnalyticsReportResponse,
  InventoryReportResponse,
} from "../types/reports.types";

// Mock auth hook to control user permissions
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock branch context hook
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    branchKey: "branch-001",
    currentBranchId: "branch-001",
    availableBranches: [{ id: "branch-001", name: "Downtown Salon" }],
  }),
}));

// Mock reports hooks for page level test
vi.mock("../hooks/useReports", () => ({
  useReportsOverview: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
  useRevenueReport: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
  useStaffPerformanceReport: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
  useCustomerRetentionReport: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
  useServiceAnalyticsReport: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
  useInventoryReport: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
}));

describe("Reports & Analytics Views Component Test Suite", () => {
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
    };

    render(<RevenueReportView data={mockRevenueData} isLoading={false} />);

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
        comparisonStartDate: "",
        comparisonEndDate: "",
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
          totalRevenueCredit: 46000,
          averageTicket: 844,
        },
      ],
    };

    render(<StaffPerformanceReportView data={mockStaffData} isLoading={false} />);

    expect(screen.getByText("Ananya Sharma")).toBeInTheDocument();
    expect(screen.getByText("STY-01")).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument(); // services count
    expect(screen.getByText(/₹46,000/)).toBeInTheDocument(); // total revenue credit
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
        comparisonStartDate: "",
        comparisonEndDate: "",
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
    };

    render(<CustomerRetentionReportView data={mockRetentionData} isLoading={false} />);

    // Phone masking preserved
    expect(screen.getByText("+91 ••••• •••89")).toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();

    // Completeness banner rendered
    expect(screen.getByText(/truncated/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Client history truncated to recent migration horizon/i)
    ).toBeInTheDocument();
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
        comparisonStartDate: "",
        comparisonEndDate: "",
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
    };

    render(<ServiceAnalyticsReportView data={mockServicesData} isLoading={false} />);

    expect(screen.getAllByText("Keratin Treatment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hair Care").length).toBeGreaterThan(0);
    expect(screen.getByText(/₹1,04,000/)).toBeInTheDocument();
    expect(screen.getByText("52")).toBeInTheDocument();
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
        comparisonStartDate: "",
        comparisonEndDate: "",
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
          productId: "prod-1",
          name: "L'Oreal Bleach Powder",
          sku: "BLCH-500",
          category: "Hair Chemicals",
          usageType: "consumables",
          onHandConsumables: 2,
          onHandRetail: 0,
          totalOnHand: 2,
          reorderLevel: 5,
          urgency: "critical",
        },
        {
          productId: "prod-2",
          name: "Moroccanoil Treatment 100ml",
          sku: "MOR-OIL",
          category: "Retail Haircare",
          usageType: "retail",
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
          stockDomain: "consumables",
          actorName: "Master Stylist",
          notes: "Balayage service",
        },
      ],
    };

    render(<InventoryReportView data={mockInventoryData} isLoading={false} />);

    // Separate consumables and retail low stock entries
    expect(screen.getAllByText("L'Oreal Bleach Powder").length).toBeGreaterThan(0);
    expect(screen.getByText("Moroccanoil Treatment 100ml")).toBeInTheDocument();
    expect(screen.getAllByText("consumables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("retail").length).toBeGreaterThan(0);

    // Movement log
    expect(screen.getByText(/service consumption/i)).toBeInTheDocument();
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
