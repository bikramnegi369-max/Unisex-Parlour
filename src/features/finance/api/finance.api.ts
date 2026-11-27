import { apiClient } from "@/lib/api/axios";
import {
  SystemTotalsResponse,
  DayClosure,
  SubmitDayClosurePayload,
  OperatingProfitReport,
  FinancialAlertsAndObligations,
  DayClosureQueryParams,
  BranchPerformanceResponse,
  FinancialTransactionsResponse,
  TransactionsQueryParams,
  FinanceAuditResponse,
  AuditHistoryQueryParams,
  ReportQueryParams,
  FinancialReportsSummaryData,
} from "../types/finance.types";

export const financeApi = {
  getSystemTotals: async (businessDate: string) => {
    const res = await apiClient.get<{ success: boolean; data: SystemTotalsResponse }>(
      "/finance/day-closure/system-totals",
      {
        branchScope: "current",
        params: { businessDate },
      }
    );
    return res.data.data;
  },

  submitDayClosure: async (payload: SubmitDayClosurePayload) => {
    const res = await apiClient.post<{ success: boolean; data: DayClosure }>(
      "/finance/day-closure",
      payload,
      { branchScope: "current" }
    );
    return res.data.data;
  },

  approveDayClosure: async (id: string, managerNotes?: string) => {
    const res = await apiClient.patch<{ success: boolean; data: DayClosure }>(
      `/finance/day-closure/${id}/approve`,
      { managerNotes },
      { branchScope: "current" }
    );
    return res.data.data;
  },

  listDayClosures: async (params: DayClosureQueryParams = {}) => {
    const res = await apiClient.get<{
      success: boolean;
      items: DayClosure[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>("/finance/day-closure", {
      branchScope: "current",
      params,
    });
    return res.data;
  },

  getDayClosureById: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: DayClosure }>(
      `/finance/day-closure/${id}`,
      { branchScope: "current" }
    );
    return res.data.data;
  },

  getOperatingProfit: async (startDate?: string, endDate?: string) => {
    const res = await apiClient.get<{ success: boolean; data: OperatingProfitReport }>(
      "/finance/operating-profit",
      {
        branchScope: "current",
        params: { startDate, endDate },
      }
    );
    return res.data.data;
  },

  getFinancialAlerts: async () => {
    const res = await apiClient.get<{ success: boolean; data: FinancialAlertsAndObligations }>(
      "/finance/overview-alerts",
      { branchScope: "current" }
    );
    return res.data.data;
  },

  getBranchPerformance: async (
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number
  ) => {
    const res = await apiClient.get<{
      success: boolean;
      data: BranchPerformanceResponse & {
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(
      "/finance/branch-performance",
      {
        branchScope: "current",
        params: { startDate, endDate, page, limit },
      }
    );
    return res.data.data;
  },

  getTransactions: async (params: TransactionsQueryParams = {}) => {
    const res = await apiClient.get<FinancialTransactionsResponse>(
      "/finance/transactions",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data;
  },

  getAuditHistory: async (params: AuditHistoryQueryParams = {}) => {
    const res = await apiClient.get<FinanceAuditResponse>(
      "/finance/audit-history",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data;
  },

  getFinancialReports: async (params: ReportQueryParams) => {
    const res = await apiClient.get<{
      success: boolean;
      data: FinancialReportsSummaryData;
    }>("/finance/reports/summary", {
      branchScope: "current",
      params,
    });
    return res.data.data;
  },

  exportFinancialReport: async (params: ReportQueryParams) => {
    const res = await apiClient.get<string>("/finance/reports/export", {
      branchScope: "current",
      params: { ...params, format: "csv" },
      responseType: "text",
    });
    return res.data;
  },
};
