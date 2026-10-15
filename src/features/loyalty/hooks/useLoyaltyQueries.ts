import { useQuery } from "@tanstack/react-query";
import {
  getLoyaltyProgram,
  getCustomerLoyaltyLedger,
  previewRedemption,
} from "../api/loyalty.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { LoyaltyLedgerQuery, RedemptionPreviewParams } from "../types/loyalty.types";

export function useLoyaltyProgram() {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission =
    hasPermission(user, "loyalty.view") || hasPermission(user, "loyalty.configure");

  return useQuery({
    queryKey: ["loyalty-program", user?.organizationId || "org"],
    queryFn: () => getLoyaltyProgram(),
    enabled: isAuthenticated && hasViewPermission,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerLoyaltyLedger(
  customerId: string | undefined,
  query: LoyaltyLedgerQuery = {}
) {
  const { isAuthenticated, user } = useAuth();
  const hasViewPermission =
    hasPermission(user, "loyalty.view") || hasPermission(user, "customers.view");

  return useQuery({
    queryKey: ["loyalty-ledger", customerId || "", query],
    queryFn: () => getCustomerLoyaltyLedger(customerId!, query),
    enabled: isAuthenticated && hasViewPermission && !!customerId,
  });
}

export function useRedemptionPreview(
  params: RedemptionPreviewParams | null,
  options?: { enabled?: boolean }
) {
  const { isAuthenticated } = useAuth();
  const points = params?.pointsRequested ?? (params as unknown as { points?: number })?.points ?? 0;
  const isEnabled =
    Boolean(options?.enabled ?? true) &&
    isAuthenticated &&
    Boolean(params?.customerId) &&
    Boolean(params?.invoiceId || params?.billAmount !== undefined) &&
    points > 0;

  return useQuery({
    queryKey: [
      "loyalty-preview",
      params?.customerId,
      params?.invoiceId || params?.billAmount,
      points,
    ],
    queryFn: () => previewRedemption(params!),
    enabled: isEnabled,
    staleTime: 0, // Always reflect fresh backend checks
  });
}
