import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { DayClosureQueryParams } from "../types/finance.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useDayClosures(params: DayClosureQueryParams = {}, enabled = true) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    enabled &&
    isAuthenticated &&
    hasPermission(user, "finance.view") &&
    currentBranchId !== null &&
    currentBranchId !== "all";

  const queryKey = getBranchQueryKey("day-closures", [params]);

  return useQuery({
    queryKey,
    queryFn: () => financeApi.listDayClosures(params),
    enabled: isEnabled,
  });
}
