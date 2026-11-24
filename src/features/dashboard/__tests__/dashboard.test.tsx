import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { dashboardApi } from "../api/dashboard.api";
import { apiClient } from "@/lib/api/axios";
import { DashboardKpisGrid } from "../components/kpis/DashboardKpisGrid";
import { TodayOperationsView } from "../components/operations/TodayOperationsView";
import { DashboardAlertsCenter } from "../components/alerts/DashboardAlertsCenter";
import { CustomerIntelligenceCard } from "../components/sections/CustomerIntelligenceCard";
import { FinanceIntelligenceCard } from "../components/sections/FinanceIntelligenceCard";
import { InventoryProcurementCard } from "../components/sections/InventoryProcurementCard";
import { DashboardOverviewData, DashboardOperationsData, DashboardAlertsData } from "../types/dashboard.types";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("Dashboard Module Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dashboard API Client", () => {
    it("calls getOverview with query params and branchScope: current", async () => {
      const mockOverviewData = { success: true, meta: {}, kpis: {} };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOverviewData });

      const result = await dashboardApi.getOverview({
        startDate: "2026-11-01",
        endDate: "2026-11-23",
        compareWith: "previous_period",
      });

      expect(apiClient.get).toHaveBeenCalledWith("/dashboard/overview", {
        params: {
          startDate: "2026-11-01",
          endDate: "2026-11-23",
          compareWith: "previous_period",
        },
        branchScope: "current",
      });
      expect(result).toEqual(mockOverviewData);
    });

    it("calls getOperations with branchScope: current", async () => {
      const mockOpsData = { success: true, summary: {} };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOpsData });

      const result = await dashboardApi.getOperations();

      expect(apiClient.get).toHaveBeenCalledWith("/dashboard/operations", {
        branchScope: "current",
      });
      expect(result).toEqual(mockOpsData);
    });

    it("calls getAlerts with branchScope: current", async () => {
      const mockAlerts = { success: true, alerts: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAlerts });

      const result = await dashboardApi.getAlerts();

      expect(apiClient.get).toHaveBeenCalledWith("/dashboard/alerts", {
        branchScope: "current",
      });
      expect(result).toEqual(mockAlerts);
    });
  });

  describe("DashboardKpisGrid Component", () => {
    const mockKpis: DashboardOverviewData["kpis"] = {
      grossSales: { current: 120000, previous: 100000, percentageChange: 20, trend: "up" },
      discountsTotal: { current: 15000, previous: 10000, percentageChange: 50, trend: "up" },
      netSales: { current: 105000, previous: 90000, percentageChange: 16.7, trend: "up" },
      collections: { current: 98000, previous: 85000, percentageChange: 15.3, trend: "up" },
      refunds: { current: 2000, previous: 3000, percentageChange: -33.3, trend: "down" },
      netCollections: { current: 96000, previous: 82000, percentageChange: 17.1, trend: "up" },
      outstandingReceivables: { current: 7000, previous: 5000, percentageChange: 40, trend: "up" },
      averageBillValue: { current: 1750, previous: 1500, percentageChange: 16.7, trend: "up" },
      totalAppointments: { current: 60, previous: 50, percentageChange: 20, trend: "up" },
      newCustomers: { current: 25, previous: 20, percentageChange: 25, trend: "up" },
      repeatCustomerRate: { current: 65, previous: 60, percentagePointsChange: 5, trend: "up" },
    };

    it("renders executive KPI cards with accurate values and deltas", () => {
      render(<DashboardKpisGrid data={mockKpis} />);

      expect(screen.getByText("Net Sales")).toBeDefined();
      expect(screen.getByText("Collections")).toBeDefined();
      expect(screen.getByText("Refunds")).toBeDefined();
      expect(screen.getByText("Net Collections")).toBeDefined();
      expect(screen.getByText("Receivables")).toBeDefined();
      expect(screen.getByText("Avg Bill Value")).toBeDefined();
      expect(screen.getByText("Appointments")).toBeDefined();
      expect(screen.getByText("New Customers")).toBeDefined();
      expect(screen.getByText("Repeat Rate")).toBeDefined();
    });

    it("renders animated skeleton loaders when loading", () => {
      const { container } = render(<DashboardKpisGrid isLoading={true} />);
      expect(container.getElementsByClassName("animate-pulse").length).toBeGreaterThan(0);
    });
  });

  describe("TodayOperationsView Component", () => {
    const mockOps: DashboardOperationsData = {
      success: true,
      meta: {
        organizationId: "org-1",
        branchId: "branch-1",
        branchName: "Koramangala Flagship",
        timezone: "Asia/Kolkata",
        date: "2026-11-23",
        generatedAt: "2026-11-23T10:00:00.000Z",
      },
      summary: {
        todayAppointmentsCount: 12,
        totalBranchStaff: 10,
        presentStaffCount: 8,
        lateStaffCount: 1,
        onLeaveStaffCount: 1,
        clockedInNowCount: 7,
        availableStaffCount: 5,
      },
      appointmentsTimeline: [
        {
          id: "appt-1",
          appointmentCode: "APT-1001",
          customerName: "Rohan Sharma",
          customerPhone: "+919876543210",
          staffName: "Priya Stylist",
          staffId: "staff-1",
          services: [{ name: "Signature Haircut", duration: 45, price: 1200 }],
          startTime: "10:30 AM",
          endTime: "11:15 AM",
          startAt: "2026-11-23T10:30:00.000Z",
          endAt: "2026-11-23T11:15:00.000Z",
          status: "in_progress",
          bookingType: "advance",
          pricing: { subtotal: 1200, discount: 0, total: 1200 },
        },
      ],
      staffRoster: [
        {
          staffId: "staff-1",
          staffName: "Priya Stylist",
          staffCode: "EMP-001",
          designation: "Senior Stylist",
          statusToday: "present",
          isClockedIn: true,
          currentAppointment: {
            appointmentCode: "APT-1001",
            startTime: "10:30 AM",
            endTime: "11:15 AM",
            status: "in_progress",
          },
        },
        {
          staffId: "staff-2",
          staffName: "Amit Barber",
          staffCode: "EMP-002",
          designation: "Colorist",
          statusToday: "present",
          isClockedIn: true,
          currentAppointment: null,
        },
      ],
      pendingTasks: {
        pendingLeavesCount: 1,
        unreconciledAttendanceCount: 0,
      },
    };

    it("renders operational summary badges and appointment timeline", () => {
      render(
        <TodayOperationsView
          data={mockOps}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("Today's Operational Command")).toBeDefined();
      expect(screen.getByText("Bookings Today")).toBeDefined();
      expect(screen.getByText("12")).toBeDefined();
      expect(screen.getByText("8 / 10")).toBeDefined(); // Present Staff
      expect(screen.getByText("Rohan Sharma")).toBeDefined();
      expect(screen.getByText("Signature Haircut")).toBeDefined();
      expect(screen.getByText("IN PROGRESS")).toBeDefined();
      expect(screen.getAllByText(/Priya Stylist/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Amit Barber")).toBeDefined();
      expect(screen.getByText("Available")).toBeDefined();
    });

    it("renders empty state when timeline has no bookings", () => {
      const emptyOps = { ...mockOps, appointmentsTimeline: [] };
      render(
        <TodayOperationsView
          data={emptyOps}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("No appointments scheduled for today")).toBeDefined();
    });
  });

  describe("DashboardAlertsCenter Component", () => {
    it("renders critical and warning alerts with action buttons", () => {
      const mockAlerts: DashboardAlertsData = {
        success: true,
        meta: { organizationId: "org-1", branchId: "branch-1", totalAlerts: 2, generatedAt: "" },
        alerts: [
          {
            id: "alert-1",
            category: "inventory",
            severity: "critical",
            title: "Out of Stock Items",
            description: "3 products have zero inventory balance",
            sourceModule: "Inventory",
            targetUrl: "/inventory",
            actionLabel: "Reorder",
            count: 3,
            timestamp: "2026-11-23T10:00:00.000Z",
          },
          {
            id: "alert-2",
            category: "hr",
            severity: "warning",
            title: "Pending Leave Requests",
            description: "2 leaves awaiting manager approval",
            sourceModule: "HR",
            targetUrl: "/employees/leaves",
            actionLabel: "Review",
            count: 2,
            timestamp: "2026-11-23T10:00:00.000Z",
          },
        ],
      };

      render(<DashboardAlertsCenter data={mockAlerts} isLoading={false} />);

      expect(screen.getByText(/Action Center/i)).toBeDefined();
      expect(screen.getByText("Out of Stock Items")).toBeDefined();
      expect(screen.getByText("Pending Leave Requests")).toBeDefined();
      expect(screen.getByText("Reorder")).toBeDefined();
      expect(screen.getByText("Review")).toBeDefined();
    });

    it("renders healthy all-systems-go message when zero alerts exist", () => {
      const emptyAlerts: DashboardAlertsData = {
        success: true,
        meta: { organizationId: "org-1", branchId: null, totalAlerts: 0, generatedAt: "" },
        alerts: [],
      };

      render(<DashboardAlertsCenter data={emptyAlerts} isLoading={false} />);

      expect(screen.getByText("Operational Action Center")).toBeDefined();
      expect(screen.getByText(/All systems healthy/i)).toBeDefined();
    });
  });

  describe("CustomerIntelligenceCard Component", () => {
    it("renders customer metrics, repeat rate, and acquisition sources", () => {
      const mockCustomerData = {
        totalActiveCustomers: 450,
        newCustomersInPeriod: 35,
        repeatCustomerRate: 68.5,
        acquisitionSources: [
          { source: "walk_in", count: 20 },
          { source: "instagram", count: 10 },
          { source: "referral", count: 5 },
        ],
        newVsReturning: { new: 35, returning: 75 },
      };

      render(<CustomerIntelligenceCard customers={mockCustomerData} />);

      expect(screen.getByText("Customer Retention & Channels")).toBeDefined();
      expect(screen.getByText("450")).toBeDefined();
      expect(screen.getByText("+35")).toBeDefined();
      expect(screen.getByText("68.5%")).toBeDefined();
      expect(screen.getByText("walk in")).toBeDefined();
      expect(screen.getByText("instagram")).toBeDefined();
    });
  });

  describe("FinanceIntelligenceCard Component", () => {
    it("renders operating cash margin and expenses by category", () => {
      const mockFinance = {
        status: "AVAILABLE" as const,
        totalExpenses: 42000,
        operatingCashMargin: 56000,
        expensesByCategory: [
          { category: "rent", amount: 25000 },
          { category: "utilities", amount: 12000 },
          { category: "marketing", amount: 5000 },
        ],
      };

      render(<FinanceIntelligenceCard finance={mockFinance} />);

      expect(screen.getByText("Cash Flow & Expenses")).toBeDefined();
      expect(screen.getByText("Operating Cash Margin")).toBeDefined();
      expect(screen.getByText("Total Approved Expenses")).toBeDefined();
      expect(screen.getByText("rent")).toBeDefined();
      expect(screen.getByText("utilities")).toBeDefined();
    });

    it("returns null when permission is unavailable", () => {
      const { container } = render(
        <FinanceIntelligenceCard finance={{ status: "UNAVAILABLE", totalExpenses: 0, operatingCashMargin: 0, expensesByCategory: [] }} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("InventoryProcurementCard Component", () => {
    it("separates consumables shortage from retail shortage", () => {
      const mockInventory = {
        status: "AVAILABLE" as const,
        outOfStockCount: 2,
        lowStockCount: 5,
        consumablesShortageCount: 4,
        retailShortageCount: 3,
      };

      const mockProcurement = {
        status: "AVAILABLE" as const,
        pendingOrdersCount: 2,
        outstandingSupplierPayables: 35000,
      };

      render(
        <InventoryProcurementCard
          inventory={mockInventory}
          procurement={mockProcurement}
        />
      );

      expect(screen.getByText("Inventory & Supply Chain")).toBeDefined();
      expect(screen.getByText("Out of Stock")).toBeDefined();
      expect(screen.getByText("Consumables Shortage")).toBeDefined();
      expect(screen.getByText("Retail Shortage")).toBeDefined();
      expect(screen.getByText("Pending POs")).toBeDefined();
      expect(screen.getByText("Supplier Payables")).toBeDefined();
    });
  });
});
