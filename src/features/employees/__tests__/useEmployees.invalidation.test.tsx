import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeleteEmployee } from "../hooks/useEmployees";
import * as employeesApi from "../api/employees.api";

vi.mock("../api/employees.api", () => ({
  deleteEmployee: vi.fn(),
  getEmployees: vi.fn(),
  getEmployee: vi.fn(),
  getStaffBranches: vi.fn(),
  getStaffServices: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch-123",
    getBranchQueryKey: (key: string, args: unknown[] = []) => [
      key,
      { scope: "branch", branchId: "branch-123" },
      ...args,
    ],
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: "u1", role: "admin", permissions: ["employees.view", "employees.delete"] },
  }),
}));

describe("useDeleteEmployee cache invalidation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("invalidates employees, employee detail, staff-branches, and staff-services on successful deletion", async () => {
    vi.mocked(employeesApi.deleteEmployee).mockResolvedValueOnce(undefined);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteEmployee(), { wrapper });

    act(() => {
      result.current.mutate("emp-999");
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(employeesApi.deleteEmployee).toHaveBeenCalledWith("emp-999");

    // Verify exact invalidated query keys
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["employees", { scope: "branch", branchId: "branch-123" }],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["employee", { scope: "branch", branchId: "branch-123" }, "emp-999"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["staff-branches", { scope: "branch", branchId: "branch-123" }, "emp-999"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["staff-services", { scope: "branch", branchId: "branch-123" }, "emp-999"],
    });
  });
});
