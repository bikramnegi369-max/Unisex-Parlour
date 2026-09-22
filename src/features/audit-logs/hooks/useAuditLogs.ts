import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api/auditLogs.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { GetAuditLogsParams } from "../types/auditLog.types";

export interface UseAuditLogsOptions {
  enabled?: boolean;
}

export function useAuditLogs(
  params: GetAuditLogsParams = {},
  options: UseAuditLogsOptions = {}
) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "logs.view");

  // If explicit branchId passed in params, honor it; otherwise use active branch from context
  const effectiveBranchId =
    params.branchId !== undefined ? params.branchId : currentBranchId;

  const isEnabled =
    (options.enabled !== undefined ? options.enabled : true) &&
    isAuthenticated &&
    hasViewPermission &&
    (effectiveBranchId !== null || isOrgWide);

  // Normalize params for query key to avoid undefined values creating inconsistent keys
  const effectiveParams: GetAuditLogsParams = {
    ...params,
    branchId: effectiveBranchId === "all" ? undefined : effectiveBranchId || undefined,
  };

  const queryKey = getBranchQueryKey("audit-logs", [effectiveParams]);

  const query = useQuery({
    queryKey,
    queryFn: () => getAuditLogs(effectiveParams),
    enabled: isEnabled,
  });

  return query;
}
