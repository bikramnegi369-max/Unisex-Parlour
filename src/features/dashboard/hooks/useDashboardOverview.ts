import { useQuery } from "@tanstack/react-query";
import { dashboardApi, DashboardOverviewParams } from "../api/dashboard.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useDashboardOverview(params: DashboardOverviewParams) {
  const { branchKey, currentOrganization } = useBranchContext();
  const orgId = currentOrganization?.id || "default-org";

  return useQuery({
    queryKey: ["dashboard", "overview", orgId, branchKey, params.startDate, params.endDate, params.compareWith],
    queryFn: () => dashboardApi.getOverview(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
