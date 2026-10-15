import React from "react";
import { Award } from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface LoyaltyHeaderBannerProps {
  isSyncing: boolean;
  onSync: () => void;
}

export function LoyaltyHeaderBanner({
  isSyncing,
  onSync,
}: LoyaltyHeaderBannerProps) {
  const actions = (
    <SyncButton
      isSyncing={isSyncing}
      onSync={onSync}
      label="Refresh Loyalty"
      className="w-full sm:w-auto"
    />
  );

  return (
    <PageHeaderBanner
      title="Loyalty & Rewards"
      description="Manage program configuration, monitor customer point balances, and audit transaction ledgers."
      icon={Award}
      actions={actions}
    />
  );
}
