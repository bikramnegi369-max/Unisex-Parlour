import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useDashboardOperations() {
  const { branchKey, currentOrganization } = useBranchContext();
  const orgId = currentOrganization?.id || "default-org";

  return useQuery({
    queryKey: ["dashboard", "operations", orgId, branchKey],
    queryFn: () => dashboardApi.getOperations(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Background poll every 60 seconds
    refetchOnWindowFocus: true,
  });
}
