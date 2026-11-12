import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { getCancellationPreview } from "../api/subscriptions.api";
import type { CancellationPreviewData } from "../types/subscription.types";

export function useCancellationPreview(subscriptionId: string, enabled: boolean = true) {
  const { user } = useAuth();
  const canView = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.view);

  return useQuery<CancellationPreviewData, Error>({
    queryKey: ["subscriptions", "cancel-preview", subscriptionId],
    queryFn: () => getCancellationPreview(subscriptionId),
    enabled: enabled && !!subscriptionId && canView,
    staleTime: 30 * 1000, // 30 seconds fresh
    refetchOnWindowFocus: false,
  });
}

