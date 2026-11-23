import { useQuery } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { AuditHistoryQueryParams } from "../types/finance.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useFinanceAuditHistory(params: AuditHistoryQueryParams = {}) {
  const { getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled =
    isAuthenticated &&
    (hasPermission(user, "finance.audit.view") || hasPermission(user, "finance.view"));

  const queryKey = getBranchQueryKey("finance-audit-history", [params]);

  return useQuery({
    queryKey,
    queryFn: () => financeApi.getAuditHistory(params),
    enabled: isEnabled,
  });
}
