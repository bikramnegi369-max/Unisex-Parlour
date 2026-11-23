import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  listExpenses: vi.fn(),
  getExpenseSummary: vi.fn(),
  getPettyCashBalance: vi.fn(),
  listPettyCashTransactions: vi.fn(),
  createExpense: vi.fn(),
  approveExpense: vi.fn(),
  rejectExpense: vi.fn(),
  deleteExpense: vi.fn(),
  replenishPettyCash: vi.fn(),
  recoverPettyCashPayout: vi.fn(),
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

vi.mock("../api/expenses.api", () => ({
  expensesApi: {
    listExpenses: mocks.listExpenses,
    getExpenseSummary: mocks.getExpenseSummary,
    getPettyCashBalance: mocks.getPettyCashBalance,
    listPettyCashTransactions: mocks.listPettyCashTransactions,
    createExpense: mocks.createExpense,
    approveExpense: mocks.approveExpense,
    rejectExpense: mocks.rejectExpense,
    deleteExpense: mocks.deleteExpense,
    replenishPettyCash: mocks.replenishPettyCash,
    recoverPettyCashPayout: mocks.recoverPettyCashPayout,
  },
}));

vi.mock("@/lib/api/crossTabSync", () => ({
  broadcastCrossTabInvalidation: mocks.broadcastCrossTabInvalidation,
}));

import {
  useExpenses,
  useExpenseSummary,
  usePettyCashBalance,
} from "../hooks";
import { useCreateExpense } from "../hooks/useCreateExpense";
import { expenseFormSchema, recoverPayoutSchema } from "../schemas/expense.schema";

const queryClients: QueryClient[] = [];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClients.push(queryClient);
  return function ExpensesQueryClientWrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("Expenses Module Architecture & Hooks", () => {
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
    mocks.listExpenses.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    mocks.getExpenseSummary.mockResolvedValue({
      totalExpenses: 5000,
      approvedExpenses: 4000,
      pendingExpenses: 1000,
      pettyCashExpenses: 500,
      byCategory: [],
    });
    mocks.getPettyCashBalance.mockResolvedValue({
      balance: 1500,
      organizationId: "org-1",
      branchId: "branch-101",
    });
  });

  describe("Branch-aware query key isolation", () => {
    it("isolates query cache across branches so switching branches fetches fresh data", async () => {
      const { result, rerender } = renderHook(() => useExpenses({ page: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mocks.listExpenses).toHaveBeenCalledTimes(1);

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

      await waitFor(() => expect(mocks.listExpenses).toHaveBeenCalledTimes(2));
    });
  });

  describe("Permission gating on queries", () => {
    it("disables useExpenses query when user lacks expenses.view permission", () => {
      mocks.hasPermission.mockReturnValue(false);

      const { result } = renderHook(() => useExpenses(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.listExpenses).not.toHaveBeenCalled();
    });

    it("disables usePettyCashBalance when user lacks expenses.view permission", () => {
      mocks.hasPermission.mockReturnValue(false);

      const { result } = renderHook(() => usePettyCashBalance(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mocks.getPettyCashBalance).not.toHaveBeenCalled();
    });
  });

  describe("Mutation invalidation & cross-tab sync", () => {
    it("broadcasts cross-tab invalidation upon successful create expense mutation", async () => {
      mocks.createExpense.mockResolvedValue({ id: "exp-1", amount: 150 });

      const { result } = renderHook(() => useCreateExpense(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        category: "supplies",
        amount: 150,
        payeeName: "Vendor Inc",
        paymentMethod: "upi",
        expenseDate: "2026-11-21",
      });

      expect(mocks.createExpense).toHaveBeenCalledWith({
        category: "supplies",
        amount: 150,
        payeeName: "Vendor Inc",
        paymentMethod: "upi",
        expenseDate: "2026-11-21",
      });
      expect(mocks.broadcastCrossTabInvalidation).toHaveBeenCalledWith("expenses");
      expect(mocks.broadcastCrossTabInvalidation).toHaveBeenCalledWith("finance");
    });
  });

  describe("Zod Form Schema Validation", () => {
    it("validates valid expense payload successfully", () => {
      const validData = {
        category: "supplies",
        amount: 250,
        payeeName: "Apex Cleaners",
        paymentMethod: "upi" as const,
        expenseDate: "2026-11-21",
      };

      const parsed = expenseFormSchema.safeParse(validData);
      expect(parsed.success).toBe(true);
    });

    it("rejects non-positive amount and missing payee name", () => {
      const invalidData = {
        category: "supplies",
        amount: -50,
        payeeName: "",
        paymentMethod: "upi" as const,
        expenseDate: "2026-11-21",
      };

      const parsed = expenseFormSchema.safeParse(invalidData);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("amount"))).toBe(true);
        expect(issues.some((i) => i.path.includes("payeeName"))).toBe(true);
      }
    });

    it("validates petty cash recovery schema correctly", () => {
      const validRecovery = {
        linkedExpenseId: "507f1f77bcf86cd799439011",
        originalPayoutId: "507f1f77bcf86cd799439012",
        recoveredAmount: 100,
        reason: "Returned unspent cash from market",
      };
      const parsed = recoverPayoutSchema.safeParse(validRecovery);
      expect(parsed.success).toBe(true);

      const invalidRecovery = {
        linkedExpenseId: "invalid-id",
        originalPayoutId: "",
        recoveredAmount: 0,
        reason: "",
      };
      const invalidParsed = recoverPayoutSchema.safeParse(invalidRecovery);
      expect(invalidParsed.success).toBe(false);
    });
  });
});
