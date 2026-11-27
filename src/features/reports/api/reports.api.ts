import { apiClient } from "@/lib/api/axios";
import {
  ReportsOverviewResponse,
  RevenueReportResponse,
  StaffPerformanceReportResponse,
  CustomerRetentionReportResponse,
  ServiceAnalyticsReportResponse,
  InventoryReportResponse,
  ReportsFilterParams,
  PaginatedReportParams,
  ServiceAnalyticsReportParams,
  InventoryReportParams,
} from "../types/reports.types";

export const reportsApi = {
  getOverview: async (params: ReportsFilterParams) => {
    const res = await apiClient.get<{ success: boolean; data: ReportsOverviewResponse }>(
      "/reports/overview",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  getRevenueReport: async (params: PaginatedReportParams) => {
    const res = await apiClient.get<{ success: boolean; data: RevenueReportResponse }>(
      "/reports/revenue",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  getStaffPerformanceReport: async (params: PaginatedReportParams) => {
    const res = await apiClient.get<{ success: boolean; data: StaffPerformanceReportResponse }>(
      "/reports/staff-performance",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  getCustomerRetentionReport: async (params: PaginatedReportParams) => {
    const res = await apiClient.get<{ success: boolean; data: CustomerRetentionReportResponse }>(
      "/reports/customer-retention",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  getServiceAnalyticsReport: async (params: ServiceAnalyticsReportParams) => {
    const res = await apiClient.get<{ success: boolean; data: ServiceAnalyticsReportResponse }>(
      "/reports/service-analytics",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  getInventoryReport: async (params: InventoryReportParams) => {
    const res = await apiClient.get<{ success: boolean; data: InventoryReportResponse }>(
      "/reports/inventory",
      {
        branchScope: "current",
        params,
      }
    );
    return res.data.data;
  },

  exportReportCsv: async (reportType: "revenue" | "inventory", params: ReportsFilterParams) => {
    const res = await apiClient.get<string>(
      `/reports/${reportType}/export`,
      {
        branchScope: "current",
        params: { ...params, format: "csv" },
        responseType: "text",
      }
    );
    return res.data;
  },
};
