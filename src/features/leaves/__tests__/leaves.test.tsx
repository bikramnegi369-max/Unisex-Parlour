import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getLeaves,
  getLeave,
  createLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from "../api/leaves.api";
import {
  useLeaves,
  useLeave,
  useCreateLeave,
  useUpdateLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
} from "../hooks/useLeaves";
import {
  createLeaveSchema,
  rejectLeaveSchema,
  cancelLeaveSchema,
} from "../schemas/leaves.schema";
import { apiClient } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch-101",
    getBranchQueryKey: (key: string, args: unknown[] = []) => [
      key,
      { scope: "branch", branchId: "branch-101" },
      ...args,
    ],
  }),
}));

let mockUserSession: {
  id: string;
  role: string;
  permissions: string[];
  hasOrgWideAccess?: boolean;
} | null = {
  id: "user-1",
  role: "manager",
  permissions: ["employees.leaves.view", "employees.leaves.manage"],
  hasOrgWideAccess: true,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: !!mockUserSession,
    user: mockUserSession,
  }),
}));

describe("Leaves Feature Module", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = {
      id: "user-1",
      role: "manager",
      permissions: ["employees.leaves.view", "employees.leaves.manage"],
      hasOrgWideAccess: true,
    };
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // ---------------------------------------------------------------------------
  // 1. Zod Schema Validation Tests
  // ---------------------------------------------------------------------------
  describe("Zod Schema Validation", () => {
    const getFutureDate = (daysAhead: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString().split("T")[0];
    };

    it("validates correct leave creation payload", () => {
      const validPayload = {
        leaveType: "Casual Leave",
        startDate: getFutureDate(2),
        endDate: getFutureDate(5),
        reason: "Personal work",
      };

      const result = createLeaveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects start date in the past", () => {
      const invalidPayload = {
        leaveType: "Sick Leave",
        startDate: "2020-01-01",
        endDate: getFutureDate(5),
        reason: "Medical condition",
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Start date cannot be in the past");
      }
    });

    it("rejects end date prior to start date", () => {
      const invalidPayload = {
        leaveType: "Sick Leave",
        startDate: getFutureDate(5),
        endDate: getFutureDate(2),
        reason: "Medical condition",
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("End date must be on or after start date");
      }
    });

    it("rejects invalid date format strings", () => {
      const invalidPayload = {
        leaveType: "Casual Leave",
        startDate: "2026/09/01",
        endDate: "2026-09-05",
        reason: "Personal work",
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Start date must be in YYYY-MM-DD format");
      }
    });

    it("rejects leave duration exceeding 365 days", () => {
      const invalidPayload = {
        leaveType: "Extended Sabbatical",
        startDate: getFutureDate(1),
        endDate: getFutureDate(400),
        reason: "Sabbatical leave",
      };

      const result = createLeaveSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Leave duration cannot exceed 365 days");
      }
    });

    it("enforces required review note when rejecting leave", () => {
      const invalidResult = rejectLeaveSchema.safeParse({ reviewNote: "   " });
      expect(invalidResult.success).toBe(false);

      const validResult = rejectLeaveSchema.safeParse({ reviewNote: "Coverage insufficient for requested dates." });
      expect(validResult.success).toBe(true);
    });

    it("enforces required cancellation reason when cancelling leave", () => {
      const invalidResult = cancelLeaveSchema.safeParse({ cancelReason: "" });
      expect(invalidResult.success).toBe(false);

      const validResult = cancelLeaveSchema.safeParse({ cancelReason: "Plans changed." });
      expect(validResult.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. API Layer Tests
  // ---------------------------------------------------------------------------
  describe("Leaves API Layer", () => {
    it("getLeaves fetches paginated list and normalizes flat backend DTO", async () => {
      const mockApiResponse = {
        data: {
          data: [
            {
              id: "leave-101",
              branchId: "branch-101",
              staffId: "staff-202",
              name: "John Doe",
              leaveCode: "LV-0001",
              leaveType: "Casual Leave",
              startDate: "2026-09-01",
              endDate: "2026-09-05",
              reason: "Vacation",
              status: "pending",
              submittedBy: "Manager User",
              submittedFor: "John Doe",
              createdAt: "2026-08-01T10:00:00Z",
              updatedAt: "2026-08-01T10:00:00Z",
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const result = await getLeaves({ status: "pending" });
      expect(apiClient.get).toHaveBeenCalledWith("/leaves", {
        params: { status: "pending" },
        branchScope: "current",
      });
      expect(result.data[0].id).toBe("leave-101");
      expect(result.data[0].name).toBe("John Doe");
      expect(result.data[0].submittedBy).toBe("Manager User");
      expect(result.data[0].submittedFor).toBe("John Doe");
    });

    it("getLeave fetches single leave detail by ID", async () => {
      const mockApiResponse = {
        data: {
          data: {
            id: "leave-101",
            leaveCode: "LV-0001",
            name: "John Doe",
            status: "approved",
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const result = await getLeave("leave-101");
      expect(apiClient.get).toHaveBeenCalledWith("/leaves/leave-101", {
        branchScope: "current",
      });
      expect(result.id).toBe("leave-101");
      expect(result.name).toBe("John Doe");
    });

    it("createLeave handles self-service request without staffId", async () => {
      const payload = {
        leaveType: "Sick Leave",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        reason: "Fever and flu",
      };

      const mockApiResponse = {
        data: {
          data: {
            id: "leave-102",
            ...payload,
            submittedFor: "self",
            status: "pending",
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiResponse);

      const result = await createLeave(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/leaves", payload, {
        branchScope: "current",
      });
      expect(result.id).toBe("leave-102");
      expect(result.submittedFor).toBe("self");
    });

    it("createLeave handles on-behalf request with explicit staffId", async () => {
      const payload = {
        staffId: "staff-555",
        leaveType: "Casual Leave",
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        reason: "Family emergency",
      };

      const mockApiResponse = {
        data: {
          data: {
            id: "leave-103",
            ...payload,
            name: "Jane Smith",
            submittedFor: "Jane Smith",
            status: "pending",
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiResponse);

      const result = await createLeave(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/leaves", payload, {
        branchScope: "current",
      });
      expect(result.id).toBe("leave-103");
      expect(result.staffId).toBe("staff-555");
      expect(result.name).toBe("Jane Smith");
    });

    it("updateLeave puts payload to /leaves/:id with branchScope", async () => {
      const payload = {
        reason: "Updated reason for leave",
      };

      const mockApiResponse = {
        data: {
          data: {
            _id: "leave-102",
            leaveType: "Sick Leave",
            reason: "Updated reason for leave",
            status: "pending",
          },
        },
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce(mockApiResponse);

      const result = await updateLeave("leave-102", payload);
      expect(apiClient.put).toHaveBeenCalledWith("/leaves/leave-102", payload, {
        branchScope: "current",
      });
      expect(result.reason).toBe("Updated reason for leave");
    });

    it("approveLeave posts to /leaves/:id/approve", async () => {
      const mockApiResponse = {
        data: {
          data: { _id: "leave-101", status: "approved" },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiResponse);

      const result = await approveLeave("leave-101", "Approved by manager.");
      expect(apiClient.post).toHaveBeenCalledWith(
        "/leaves/leave-101/approve",
        { reviewNote: "Approved by manager." },
        { branchScope: "current" }
      );
      expect(result.status).toBe("approved");
    });

    it("rejectLeave posts to /leaves/:id/reject", async () => {
      const mockApiResponse = {
        data: {
          data: { _id: "leave-101", status: "rejected" },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiResponse);

      const result = await rejectLeave("leave-101", "Insufficient coverage");
      expect(apiClient.post).toHaveBeenCalledWith(
        "/leaves/leave-101/reject",
        { reviewNote: "Insufficient coverage" },
        { branchScope: "current" }
      );
      expect(result.status).toBe("rejected");
    });

    it("cancelLeave posts to /leaves/:id/cancel", async () => {
      const mockApiResponse = {
        data: {
          data: { _id: "leave-101", status: "cancelled" },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockApiResponse);

      const result = await cancelLeave("leave-101", "Employee request");
      expect(apiClient.post).toHaveBeenCalledWith(
        "/leaves/leave-101/cancel",
        { cancelReason: "Employee request" },
        { branchScope: "current" }
      );
      expect(result.status).toBe("cancelled");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. React Query Hooks & Invalidation Tests
  // ---------------------------------------------------------------------------
  describe("React Query Hooks & Cache Invalidation", () => {
    it("useLeaves disables query fetching when user lacks employees.leaves.view permission", () => {
      mockUserSession = {
        id: "user-99",
        role: "guest",
        permissions: [],
      };

      const { result } = renderHook(() => useLeaves(), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("useCreateLeave invalidates leaves list query on success", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { _id: "leave-99", status: "pending" } },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateLeave(), { wrapper });

      act(() => {
        result.current.mutate({
          leaveType: "Casual Leave",
          startDate: "2026-09-10",
          endDate: "2026-09-12",
          reason: "Family event",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leaves", { scope: "branch", branchId: "branch-101" }],
      });
    });

    it("useLeave fetches single leave detail query", async () => {
      const mockApiResponse = {
        data: {
          data: { _id: "leave-105", leaveCode: "LV-0105", status: "pending" },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

      const { result } = renderHook(() => useLeave("leave-105"), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.leaveCode).toBe("LV-0105");
      expect(apiClient.get).toHaveBeenCalledWith("/leaves/leave-105", {
        branchScope: "current",
      });
    });

    it("useUpdateLeave invalidates leaves list and target leave detail query on success", async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: { data: { _id: "leave-105", status: "pending" } },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateLeave(), { wrapper });

      act(() => {
        result.current.mutate({
          id: "leave-105",
          payload: { reason: "Rescheduled medical appointment" },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leaves", { scope: "branch", branchId: "branch-101" }],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leave", { scope: "branch", branchId: "branch-101" }, "leave-105"],
      });
    });

    it("useApproveLeave invalidates leaves list and target leave detail query on success", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { _id: "leave-101", status: "approved" } },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useApproveLeave(), { wrapper });

      act(() => {
        result.current.mutate({ id: "leave-101", reviewNote: "Approved" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leaves", { scope: "branch", branchId: "branch-101" }],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leave", { scope: "branch", branchId: "branch-101" }, "leave-101"],
      });
    });

    it("useRejectLeave invalidates leaves list and target leave detail query on success", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { _id: "leave-101", status: "rejected" } },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useRejectLeave(), { wrapper });

      act(() => {
        result.current.mutate({ id: "leave-101", reviewNote: "Staffing shortage" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leaves", { scope: "branch", branchId: "branch-101" }],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leave", { scope: "branch", branchId: "branch-101" }, "leave-101"],
      });
    });

    it("useCancelLeave invalidates leaves list and target leave detail query on success", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { data: { _id: "leave-101", status: "cancelled" } },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCancelLeave(), { wrapper });

      act(() => {
        result.current.mutate({ id: "leave-101", cancelReason: "Plans changed" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leaves", { scope: "branch", branchId: "branch-101" }],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["leave", { scope: "branch", branchId: "branch-101" }, "leave-101"],
      });
    });
  });
});
