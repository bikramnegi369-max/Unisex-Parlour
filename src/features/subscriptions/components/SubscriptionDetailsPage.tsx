"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Edit, Ban, Gift, CreditCard, Layers, History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { EntityProfileLayout, type ProfileTabItem } from "@/components/entity/EntityProfileLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { useSubscription } from "../hooks/useSubscription";
import { useUpdateSubscription } from "../hooks/useUpdateSubscription";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { SubscriptionOverviewTab } from "./SubscriptionOverviewTab";
import { SubscriptionEntitlementsTab } from "./SubscriptionEntitlementsTab";
import { SubscriptionUsageTab } from "./SubscriptionUsageTab";
import { EditSubscriptionDialog } from "./EditSubscriptionDialog";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { RedeemSubscriptionModal } from "./RedeemSubscriptionModal";
import type { UpdateSubscriptionFormValues, CancelSubscriptionFormValues } from "../schemas/subscription.schema";

interface SubscriptionDetailsPageProps {
  id: string;
}

export function SubscriptionDetailsPage({ id }: SubscriptionDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);

  const canEdit = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.configure);
  const canCancel = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.configure);
  const canRedeem = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.redeem);

  const { data: subscription, isLoading, isError, refetch } = useSubscription(id);
  const updateMutation = useUpdateSubscription();
  const cancelMutation = useCancelSubscription();

  const handleEditSubmit = async (values: UpdateSubscriptionFormValues) => {
    try {
      await updateMutation.mutateAsync({ id, payload: values });
      toast.success("Subscription updated successfully.");
      setIsEditOpen(false);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to update subscription.";
      toast.error(msg);
    }
  };

  const handleCancelConfirm = async (values: CancelSubscriptionFormValues) => {
    try {
      await cancelMutation.mutateAsync({ id, payload: values });
      toast.success("Subscription has been cancelled.");
      setIsCancelOpen(false);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to cancel subscription.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-lg" />
        <div className="h-32 bg-card border border-border rounded-xl" />
        <div className="h-64 bg-card border border-border rounded-xl" />
      </div>
    );
  }

  if (isError || !subscription) {
    return (
      <ErrorState
        title="Subscription Not Found"
        description="The requested subscription could not be retrieved or you do not have permission to view it."
        retryAction={{
          label: "Try Again",
          onClick: () => refetch(),
        }}
      />
    );
  }

  const isActive = subscription.status === "active";
  const remainingCount = (subscription.entitlements || []).reduce(
    (sum, e) => sum + e.remainingQuantity,
    0
  );

  const tabs: ProfileTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <Info className="h-4 w-4" />,
    },
    {
      id: "entitlements",
      label: "Entitlements",
      icon: <Layers className="h-4 w-4" />,
      badge: remainingCount > 0 ? remainingCount : undefined,
    },
    {
      id: "usage",
      label: "Redemption Ledger",
      icon: <History className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 sm:p-6 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-foreground">
                    {subscription.subscriptionCode || subscription.id}
                  </h1>
                  <SubscriptionStatusBadge status={subscription.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Customer:{" "}
                  <span className="font-semibold text-foreground">
                    {subscription.customer?.name ||
                      (typeof subscription.customerId === "string"
                        ? subscription.customerId
                        : (subscription.customerId as { _id?: string; id?: string })?._id || "N/A")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {canRedeem && isActive && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsRedeemOpen(true)}
                className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Gift className="h-4 w-4" />
                Redeem Entitlements
              </Button>
            )}

            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-9 text-xs gap-1.5 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}

            {canCancel && isActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelOpen(true)}
                className="h-9 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabbed Profile Layout */}
      <EntityProfileLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "overview" && (
          <SubscriptionOverviewTab
            subscription={subscription}
            getBranchName={getBranchName}
          />
        )}

        {activeTab === "entitlements" && (
          <SubscriptionEntitlementsTab
            entitlements={subscription.entitlements || []}
          />
        )}

        {activeTab === "usage" && (
          <SubscriptionUsageTab subscriptionId={subscription.id} />
        )}
      </EntityProfileLayout>

      {/* Edit Modal */}
      {isEditOpen && (
        <Dialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Update Subscription Details"
        >
          <EditSubscriptionDialog
            subscription={subscription}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSubmit={handleEditSubmit}
            isLoading={updateMutation.isPending}
          />
        </Dialog>
      )}

      {/* Cancel Modal */}
      {isCancelOpen && (
        <Dialog
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
          title="Cancel Subscription"
        >
          <CancelSubscriptionDialog
            subscription={subscription}
            isOpen={isCancelOpen}
            onClose={() => setIsCancelOpen(false)}
            onConfirm={handleCancelConfirm}
            isLoading={cancelMutation.isPending}
          />
        </Dialog>
      )}

      {/* Redemption Modal */}
      {isRedeemOpen && (
        <Dialog
          isOpen={isRedeemOpen}
          onClose={() => setIsRedeemOpen(false)}
          title="Redeem Subscription Entitlements"
        >
          <RedeemSubscriptionModal
            subscription={subscription}
            isOpen={isRedeemOpen}
            onClose={() => setIsRedeemOpen(false)}
            onSuccess={() => {
              refetch();
              setActiveTab("usage");
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
