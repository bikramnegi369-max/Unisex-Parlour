import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useDashboardAlerts() {
  const { branchKey, currentOrganization } = useBranchContext();
  const orgId = currentOrganization?.id || "default-org";

  return useQuery({
    queryKey: ["dashboard", "alerts", orgId, branchKey],
    queryFn: () => dashboardApi.getAlerts(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 120 * 1000, // Background poll every 2 minutes
    refetchOnWindowFocus: true,
  });
}
