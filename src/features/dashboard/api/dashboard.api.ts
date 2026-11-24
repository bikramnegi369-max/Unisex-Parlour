import { apiClient } from "@/lib/api/axios";
import {
  DashboardOverviewData,
  DashboardOperationsData,
  DashboardAlertsData,
  ComparisonPeriod,
} from "../types/dashboard.types";

export interface DashboardOverviewParams {
  startDate: string;
  endDate: string;
  compareWith?: ComparisonPeriod;
}

export const dashboardApi = {
  getOverview: async (
    params: DashboardOverviewParams,
  ): Promise<DashboardOverviewData> => {
    const res = await apiClient.get<DashboardOverviewData>(
      "/dashboard/overview",
      {
        branchScope: "current",
        params,
      },
    );
    return res.data;
  },

  getOperations: async (): Promise<DashboardOperationsData> => {
    const res = await apiClient.get<DashboardOperationsData>(
      "/dashboard/operations",
      {
        branchScope: "current",
      },
    );
    return res.data;
  },

  getAlerts: async (): Promise<DashboardAlertsData> => {
    const res = await apiClient.get<DashboardAlertsData>("/dashboard/alerts", {
      branchScope: "current",
    });
    return res.data;
  },
};
