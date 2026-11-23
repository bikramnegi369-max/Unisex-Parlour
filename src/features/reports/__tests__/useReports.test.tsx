import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  getOverview: vi.fn(),
  getRevenueReport: vi.fn(),
  getStaffPerformanceReport: vi.fn(),
  getCustomerRetentionReport: vi.fn(),
  getServiceAnalyticsReport: vi.fn(),
  getInventoryReport: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: mocks.useBranchContext,
}));

vi.mock("../api/reports.api", () => ({
  reportsApi: {
    getOverview: mocks.getOverview,
    getRevenueReport: mocks.getRevenueReport,
    getStaffPerformanceReport: mocks.getStaffPerformanceReport,
    getCustomerRetentionReport: mocks.getCustomerRetentionReport,
    getServiceAnalyticsReport: mocks.getServiceAnalyticsReport,
    getInventoryReport: mocks.getInventoryReport,
  },
}));

import {
  useReportsOverview,
  useRevenueReport,
  useStaffPerformanceReport,
  useCustomerRetentionReport,
  useServiceAnalyticsReport,
  useInventoryReport,
} from "../hooks/useReports";
import { ReportsFilterParams } from "../types/reports.types";

const queryClients: QueryClient[] = [];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClients.push(queryClient);
  return function ReportsQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  cleanup();
  queryClients.forEach((client) => client.clear());
  queryClients.length = 0;
  vi.resetAllMocks();
});

beforeEach(() => {
  mocks.useBranchContext.mockReturnValue({
    branchKey: "branch-001",
    currentBranchId: "branch-001",
  });
  mocks.getOverview.mockResolvedValue({ meta: {}, summary: {} });
  mocks.getRevenueReport.mockResolvedValue({ meta: {}, streams: {} });
  mocks.getStaffPerformanceReport.mockResolvedValue({ meta: {}, rankings: [] });
  mocks.getCustomerRetentionReport.mockResolvedValue({ meta: {}, clientDirectory: [] });
  mocks.getServiceAnalyticsReport.mockResolvedValue({ meta: {}, topServices: [] });
  mocks.getInventoryReport.mockResolvedValue({ meta: {}, lowStockAlerts: [] });
});

describe("Reports & Analytics useReports Hooks Suite", () => {
  const sampleParams: ReportsFilterParams = {
    startDate: "2026-11-01",
    endDate: "2026-11-20",
    compareWith: "previous_period",
  };

  it("only executes query when enabled=true and remains idle when enabled=false", async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () => ({
        activeQuery: useRevenueReport(sampleParams, true),
        disabledQuery: useStaffPerformanceReport(sampleParams, false),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.activeQuery.isSuccess).toBe(true);
      expect(result.current.disabledQuery.fetchStatus).toBe("idle");
    });

    expect(mocks.getRevenueReport).toHaveBeenCalledWith(sampleParams);
    expect(mocks.getStaffPerformanceReport).not.toHaveBeenCalled();
  });

  it("passes date range and compareWith parameters accurately to API", async () => {
    const wrapper = createWrapper();
    const customParams: ReportsFilterParams = {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      compareWith: "none",
    };

    renderHook(() => useServiceAnalyticsReport(customParams, true), { wrapper });

    await waitFor(() => {
      expect(mocks.getServiceAnalyticsReport).toHaveBeenCalledWith(customParams);
    });
  });

  it("includes branchKey in queryKey and reacts to branch switching", async () => {
    const wrapper = createWrapper();

    const { rerender } = renderHook(
      () => useInventoryReport(sampleParams, true),
      { wrapper }
    );

    await waitFor(() => {
      expect(mocks.getInventoryReport).toHaveBeenCalledTimes(1);
    });

    // Simulate branch switch in branch context
    mocks.useBranchContext.mockReturnValue({
      branchKey: "branch-002",
      currentBranchId: "branch-002",
    });

    rerender();

    await waitFor(() => {
      expect(mocks.getInventoryReport).toHaveBeenCalledTimes(2);
    });
  });

  it("disables execution if dates are empty", async () => {
    const wrapper = createWrapper();
    const emptyParams: ReportsFilterParams = {
      startDate: "",
      endDate: "",
    };

    const { result } = renderHook(
      () => useCustomerRetentionReport(emptyParams, true),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });
    expect(mocks.getCustomerRetentionReport).not.toHaveBeenCalled();
  });
});
