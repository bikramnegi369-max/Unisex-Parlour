import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports.api";
import { ReportsFilterParams } from "../types/reports.types";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useReportsOverview(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "overview", params] as const,
    queryFn: () => reportsApi.getOverview(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}

export function useRevenueReport(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "revenue", params] as const,
    queryFn: () => reportsApi.getRevenueReport(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}

export function useStaffPerformanceReport(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "staff", params] as const,
    queryFn: () => reportsApi.getStaffPerformanceReport(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}

export function useCustomerRetentionReport(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "retention", params] as const,
    queryFn: () => reportsApi.getCustomerRetentionReport(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}

export function useServiceAnalyticsReport(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "services", params] as const,
    queryFn: () => reportsApi.getServiceAnalyticsReport(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}

export function useInventoryReport(params: ReportsFilterParams, enabled = true) {
  const { branchKey } = useBranchContext();
  return useQuery({
    queryKey: ["reports", branchKey, "inventory", params] as const,
    queryFn: () => reportsApi.getInventoryReport(params),
    enabled: Boolean(params.startDate && params.endDate && enabled),
    staleTime: 60 * 1000,
  });
}
