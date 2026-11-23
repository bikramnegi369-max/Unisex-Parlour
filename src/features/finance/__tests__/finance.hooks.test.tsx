import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  getOperatingProfit: vi.fn(),
  getSystemTotals: vi.fn(),
  listDayClosures: vi.fn(),
  submitDayClosure: vi.fn(),
  approveDayClosure: vi.fn(),
  broadcastCrossTabInvalidation: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: mocks.useBranchContext,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: mocks.hasPermission,
}));

vi.mock("../api/finance.api", () => ({
  financeApi: {
    getOperatingProfit: mocks.getOperatingProfit,
    getSystemTotals: mocks.getSystemTotals,
    listDayClosures: mocks.listDayClosures,
    submitDayClosure: mocks.submitDayClosure,
    approveDayClosure: mocks.approveDayClosure,
  },
}));

vi.mock("@/lib/api/crossTabSync", () => ({
  broadcastCrossTabInvalidation: mocks.broadcastCrossTabInvalidation,
}));

import {
  useOperatingProfit,
  useSystemTotals,
  useDayClosures,
  useSubmitDayClosure,
} from "../hooks";
import { dayClosureFormSchema } from "../schemas/finance.schema";

const queryClients: QueryClient[] = [];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClients.push(queryClient);
  return function FinanceQueryClientWrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("Finance Module Architecture & Hooks", () => {
  afterEach(() => {
    cleanup();
    queryClients.forEach((client) => client.clear());
    queryClients.length = 0;
    vi.resetAllMocks();
  });

  beforeEach(() => {
    mocks.useBranchContext.mockReturnValue({
      currentBranchId: "branch-101",
      currentOrganization: { id: "org-1", name: "Salon Test Org" },
      getBranchQueryKey: (entity: string, extra: any[] = []) => [
        entity,
        "branch-101",
        ...extra,
      ],
    });
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "user-1", role: "branch_manager", hasOrgWideAccess: false },
    });
    mocks.hasPermission.mockReturnValue(true);
    mocks.getOperatingProfit.mockResolvedValue({
      totalRevenue: 25000,
      totalExpenses: 7000,
      operatingProfit: 18000,
      marginPercent: 72,
    });
    mocks.getSystemTotals.mockResolvedValue({
      cash: 5000,
      card: 12000,
      upi: 8000,
      other: 0,
      total: 25000,
    });
    mocks.listDayClosures.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  describe("Branch-aware query key isolation", () => {
    it("isolates day closures query cache when switching branches", async () => {
      const { result, rerender } = renderHook(() => useDayClosures({ page: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mocks.listDayClosures).toHaveBeenCalledTimes(1);

      // Simulate branch change
      mocks.useBranchContext.mockReturnValue({
        currentBranchId: "branch-202",
        currentOrganization: { id: "org-1", name: "Salon Test Org" },
        getBranchQueryKey: (entity: string, extra: any[] = []) => [
          entity,
          "branch-202",
          ...extra,
        ],
      });

      rerender();

      await waitFor(() => expect(mocks.listDayClosures).toHaveBeenCalledTimes(2));
    });

    it("isolates system totals query cache per branch and business date", async () => {
      const { result } = renderHook(() => useSystemTotals("2026-11-21"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mocks.getSystemTotals).toHaveBeenCalledWith("2026-11-21");
    });
  });

  describe("Permission gating on queries", () => {
    it("disables useDayClosures query when user lacks finance.view permission", () => {
      mocks.hasPermission.mockReturnValue(false);

      const { result } = renderHook(() => useDayClosures(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.listDayClosures).not.toHaveBeenCalled();
    });

    it("disables useOperatingProfit query when user lacks finance.view permission", () => {
      mocks.hasPermission.mockReturnValue(false);

      const { result } = renderHook(() => useOperatingProfit(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.getOperatingProfit).not.toHaveBeenCalled();
    });
  });

  describe("Mutation invalidation & cross-tab sync", () => {
    it("broadcasts finance cross-tab invalidation upon successful day closure submission", async () => {
      mocks.submitDayClosure.mockResolvedValue({
        id: "closure-1",
        businessDate: "2026-11-21",
        status: "pending_approval",
      });

      const { result } = renderHook(() => useSubmitDayClosure(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        businessDate: "2026-11-21",
        physicalCounts: {
          cash: 5000,
          card: 12000,
          upi: 8000,
          other: 0,
        },
      });

      expect(mocks.submitDayClosure).toHaveBeenCalledWith({
        businessDate: "2026-11-21",
        physicalCounts: {
          cash: 5000,
          card: 12000,
          upi: 8000,
          other: 0,
        },
      });
      expect(mocks.broadcastCrossTabInvalidation).toHaveBeenCalledWith("finance");
    });
  });

  describe("Zod Form Schema Validation", () => {
    it("validates day closure form schema successfully", () => {
      const validClosure = {
        businessDate: "2026-11-21",
        physicalCounts: {
          cash: 5000,
          card: 12000,
          upi: 8000,
          other: 0,
        },
        discrepancyReason: "Minor rounding delta",
      };

      const parsed = dayClosureFormSchema.safeParse(validClosure);
      expect(parsed.success).toBe(true);
    });

    it("rejects negative counts and missing business date", () => {
      const invalidClosure = {
        businessDate: "",
        physicalCounts: {
          cash: -100,
          card: 500,
          upi: 0,
          other: 0,
        },
      };

      const parsed = dayClosureFormSchema.safeParse(invalidClosure);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("businessDate"))).toBe(true);
        expect(issues.some((i) => i.path.includes("cash"))).toBe(true);
      }
    });
  });
});
