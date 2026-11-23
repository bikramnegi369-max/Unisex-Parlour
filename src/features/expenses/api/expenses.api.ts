import { apiClient } from "@/lib/api/axios";
import {
  Expense,
  ExpenseSummary,
  PettyCashBalance,
  PettyCashTransaction,
  CreateExpensePayload,
  UpdateExpensePayload,
  ReplenishPettyCashPayload,
  RecoverPayoutPayload,
  ExpenseQueryParams,
} from "../types/expense.types";

export const expensesApi = {
  listExpenses: async (params: ExpenseQueryParams = {}) => {
    const res = await apiClient.get<{
      success: boolean;
      items: Expense[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>("/expenses", {
      branchScope: "current",
      params,
    });
    return res.data;
  },

  getExpenseById: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: Expense }>(
      `/expenses/${id}`,
      {
        branchScope: "current",
      },
    );
    return res.data.data;
  },

  createExpense: async (payload: CreateExpensePayload) => {
    const res = await apiClient.post<{ success: boolean; data: Expense }>(
      "/expenses",
      payload,
      {
        branchScope: "current",
      },
    );
    return res.data.data;
  },

  updateExpense: async (id: string, payload: UpdateExpensePayload) => {
    const res = await apiClient.put<{ success: boolean; data: Expense }>(
      `/expenses/${id}`,
      payload,
      {
        branchScope: "current",
      },
    );
    return res.data.data;
  },

  approveExpense: async (id: string) => {
    const res = await apiClient.patch<{ success: boolean; data: Expense }>(
      `/expenses/${id}/approve`,
      {},
      { branchScope: "current" },
    );
    return res.data.data;
  },

  rejectExpense: async (id: string, reason: string) => {
    const res = await apiClient.patch<{ success: boolean; data: Expense }>(
      `/expenses/${id}/reject`,
      { reason },
      { branchScope: "current" },
    );
    return res.data.data;
  },

  deleteExpense: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/expenses/${id}`,
      {
        branchScope: "current",
      },
    );
    return res.data;
  },

  getExpenseSummary: async (startDate?: string, endDate?: string) => {
    const res = await apiClient.get<{ success: boolean; data: ExpenseSummary }>(
      "/expenses/summary",
      {
        branchScope: "current",
        params: { startDate, endDate },
      },
    );
    return res.data.data;
  },

  getPettyCashBalance: async () => {
    const res = await apiClient.get<{
      success: boolean;
      data: PettyCashBalance;
    }>("/expenses/petty-cash/balance", { branchScope: "current" });
    return res.data.data;
  },

  replenishPettyCash: async (
    payload: ReplenishPettyCashPayload,
    idempotencyKey: string,
  ) => {
    const res = await apiClient.post<{
      success: boolean;
      data: PettyCashTransaction;
    }>("/expenses/petty-cash/replenish", payload, {
      branchScope: "current",
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return res.data.data;
  },

  recoverPettyCashPayout: async (
    payload: RecoverPayoutPayload,
    idempotencyKey: string,
  ) => {
    const res = await apiClient.post<{
      success: boolean;
      data: PettyCashTransaction;
    }>("/expenses/petty-cash/recover-payout", payload, {
      branchScope: "current",
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return res.data.data;
  },

  listPettyCashTransactions: async (page = 1, limit = 30) => {
    const res = await apiClient.get<{
      success: boolean;
      items: PettyCashTransaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>("/expenses/petty-cash/transactions", {
      branchScope: "current",
      params: { page, limit },
    });
    return res.data;
  },
};
