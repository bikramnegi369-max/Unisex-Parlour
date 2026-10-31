"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  Calendar,
  Plus,
  Gift,
  UserCheck,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncButton } from "@/components/ui/sync-button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "@/features/subscriptions/config/subscriptions.config";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import { useCreateSubscription } from "@/features/subscriptions/hooks/useCreateSubscription";
import { SubscriptionStatusBadge } from "@/features/subscriptions/components/SubscriptionStatusBadge";
import { CreateSubscriptionDialog } from "@/features/subscriptions/components/CreateSubscriptionDialog";
import { RedeemSubscriptionModal } from "@/features/subscriptions/components/RedeemSubscriptionModal";
import { useServices } from "@/features/services/hooks/services/useServices";
import type { Service } from "@/features/services/types/service.types";
import type { Subscription } from "@/features/subscriptions/types/subscription.types";
import type { CreateSubscriptionFormValues } from "@/features/subscriptions/schemas/subscription.schema";

interface CustomerSubscriptionsTabProps {
  customerId: string;
}

export type SubscriptionFilterMode = "all" | "payer" | "beneficiary";

export function CustomerSubscriptionsTab({
  customerId,
}: CustomerSubscriptionsTabProps) {
  const { user } = useAuth();
  const canSell = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.sell);
  const canRedeem = hasPermission(
    user,
    SUBSCRIPTIONS_CONFIG.permissions.redeem,
  );

  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [redeemSubscriptionTarget, setRedeemSubscriptionTarget] =
    useState<Subscription | null>(null);

  // Enterprise pattern: Fetch subscriptions associated with this customer
  const { data, isLoading, isFetching, isError, refetch } = useSubscriptions({
    customerId,
    limit: 50,
  });

  const { data: servicesData } = useServices({ limit: "all" });
  const services: Service[] = servicesData?.data || [];

  const createMutation = useCreateSubscription();

  const handleCreateSubmit = async (values: CreateSubscriptionFormValues) => {
    try {
      const createdSub = await createMutation.mutateAsync({
        customerId: values.customerId,
        planId: values.planId,
        price: values.price,
        entitlements: values.entitlements,
        permittedBranchIds: values.permittedBranchIds,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes,
      });

      setIsCreateOpen(false);
      refetch();

      const invoiceId = createdSub.invoiceId || createdSub.invoice?.id;
      const invoiceNumber =
        createdSub.invoiceNumber || createdSub.invoice?.invoiceNumber || "";

      if (invoiceId) {
        toast.success(
          `Subscription sold! Sale invoice ${invoiceNumber} created (${createdSub.paymentStatus === "paid" ? "Paid" : "Pending Payment"}).`,
          {
            action: {
              label: "View Invoice",
              onClick: () => router.push(`/billing/${invoiceId}`),
            },
            duration: 6000,
          },
        );
        router.push(`/billing/${invoiceId}`);
      } else {
        toast.success("Subscription sold and created successfully.");
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to create subscription.";
      toast.error(msg);
    }
  };

  const [filterMode, setFilterMode] = useState<SubscriptionFilterMode>("all");

  const subscriptions: Subscription[] = useMemo(
    () => data?.data || [],
    [data?.data],
  );

  // Pre-calculate categorised counts for badge displays
  const { payerCount, beneficiaryCount } = useMemo(() => {
    let payer = 0;
    let beneficiary = 0;

    for (const sub of subscriptions) {
      const rawPayerId =
        sub.payerCustomerId ||
        sub.payerId ||
        sub.payer?.id ||
        sub.customerId ||
        sub.customer?.id;
      const isPayer = rawPayerId === customerId;
      if (isPayer) payer++;

      // A subscription belongs in "Beneficiary Entitlements" if the customer is receiving
      // entitlements as a beneficiary member on a subscription paid/purchased by someone else.
      const isBeneficiaryMember =
        !isPayer &&
        (sub.members || []).some(
          (m) => m.customerId === customerId || m.customer?.id === customerId,
        );
      if (isBeneficiaryMember) beneficiary++;
    }

    return { payerCount: payer, beneficiaryCount: beneficiary };
  }, [subscriptions, customerId]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub: Subscription) => {
      const isPayer =
        (sub.payerCustomerId ||
          sub.payerId ||
          sub.payer?.id ||
          sub.customerId ||
          sub.customer?.id) === customerId;

      const isBeneficiaryMember =
        !isPayer &&
        (sub.members || []).some(
          (m) => m.customerId === customerId || m.customer?.id === customerId,
        );

      if (filterMode === "payer") return isPayer;
      if (filterMode === "beneficiary") return isBeneficiaryMember;
      return true;
    });
  }, [subscriptions, filterMode, customerId]);

  const isSyncing = isFetching && !isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Toolbar Header Shimmer */}
        <div className="flex items-center justify-between p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-muted/60 rounded animate-pulse" />
            <div className="h-3 w-64 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="h-8 w-28 bg-muted/60 rounded-md animate-pulse" />
        </div>

        {/* Subscription Cards Shimmer Skeletons */}
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border/80 bg-card shadow-xs space-y-3.5"
            >
              {/* Card Header Shimmer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-28 bg-muted/60 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-muted/50 rounded-full animate-pulse" />
                  </div>
                  <div className="h-3 w-48 bg-muted/40 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-24 bg-muted/60 rounded-md animate-pulse" />
                  <div className="h-8 w-24 bg-muted/40 rounded-md animate-pulse" />
                </div>
              </div>

              {/* Progress Bar Shimmer */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-32 bg-muted/40 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-muted/40 rounded-full animate-pulse" />
              </div>

              {/* Entitlement Chips Shimmer */}
              <div className="space-y-2 pt-1">
                <div className="h-3 w-36 bg-muted/40 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5"
                    >
                      <div className="h-3.5 w-24 bg-muted/60 rounded animate-pulse" />
                      <div className="h-2 w-full bg-muted/40 rounded-full animate-pulse" />
                      <div className="h-2.5 w-16 bg-muted/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Subscriptions"
        description="Could not load subscriptions for this customer."
        retryAction={{
          label: "Retry",
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-xl shadow-2xs">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            Customer Subscriptions
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Manage prepaid service entitlements and redemption history for this
            customer.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <SyncButton
            isSyncing={isSyncing}
            onSync={() => refetch()}
            label="Refresh"
            className="h-8 text-xs"
          />

          {canSell && (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Sell Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Filter and View Toggle */}
      {subscriptions.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            Show:
          </span>

          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            All Subscriptions
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                filterMode === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-foreground border border-border"
              }`}
            >
              {subscriptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("payer")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "payer"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Purchased as Payer
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                filterMode === "payer"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-foreground border border-border"
              }`}
            >
              {payerCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("beneficiary")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterMode === "beneficiary"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Beneficiary Entitlements
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                filterMode === "beneficiary"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-foreground border border-border"
              }`}
            >
              {beneficiaryCount}
            </span>
          </button>
        </div>
      )}

      {filteredSubscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={
            filterMode === "all"
              ? "No Active Subscriptions"
              : filterMode === "payer"
                ? "No Purchased Subscriptions"
                : "No Beneficiary Entitlements"
          }
          description={
            filterMode === "all"
              ? "This customer does not have any active or past subscriptions registered."
              : filterMode === "payer"
                ? "This customer has not directly purchased or financed any subscriptions as a payer."
                : "This customer has not been registered as an entitlement beneficiary on any family or group subscription."
          }
          action={
            canSell && filterMode === "all"
              ? {
                  label: "Sell Customer Subscription",
                  onClick: () => setIsCreateOpen(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <div
          className={`space-y-4 transition-opacity duration-200 ${isSyncing ? "opacity-60 pointer-events-none" : "opacity-100"}`}
        >
          {filteredSubscriptions.map((sub: Subscription) => {
            const isPayer =
              (sub.payerCustomerId ||
                sub.payerId ||
                sub.payer?.id ||
                sub.customerId ||
                sub.customer?.id) === customerId;
            const memberEntry = (sub.members || []).find(
              (m) =>
                m.customerId === customerId || m.customer?.id === customerId,
            );
            const isBeneficiary = !isPayer && Boolean(memberEntry);

            // If customer is beneficiary, display customer's specific entitlement quota
            const relevantEntitlements =
              isBeneficiary &&
              memberEntry?.entitlements &&
              memberEntry.entitlements.length > 0
                ? memberEntry.entitlements
                : sub.entitlements || [];

            const totalRemaining = relevantEntitlements.reduce(
              (sum: number, e: { remainingQuantity: number }) =>
                sum + e.remainingQuantity,
              0,
            );
            const totalAllocated = relevantEntitlements.reduce(
              (sum: number, e: { totalQuantity: number }) =>
                sum + e.totalQuantity,
              0,
            );
            const percentUsed =
              totalAllocated > 0
                ? Math.round(
                    ((totalAllocated - totalRemaining) / totalAllocated) * 100,
                  )
                : 0;
            const isPaid =
              sub.isPaid === true ||
              sub.paymentStatus === "paid" ||
              (sub.paymentStatus === undefined && sub.status === "active");
            const isActive = sub.status === "active" && isPaid;

            // Resolve payer info when customer is looking at a beneficiary entitlement
            const payerDisplayName =
              sub.payer?.name ||
              sub.customer?.name ||
              (isPayer ? "This Customer" : "Primary Account");
            const payerPhone = sub.payer?.phone || sub.customer?.phone;

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-border bg-card shadow-xs hover:border-primary/30 transition-all space-y-3.5"
              >
                {/* Header row: Code, Status, Price, and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                        {sub.subscriptionCode || sub.id}
                      </span>
                      <SubscriptionStatusBadge
                        status={sub.status}
                        paymentStatus={sub.paymentStatus}
                      />
                      {isPayer && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                          Payer Role
                        </span>
                      )}
                      {isBeneficiary && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          <UserCheck className="h-3 w-3 text-primary" />
                          Beneficiary Role
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(sub.price)}
                      </span>

                      {!isPayer && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                            <User className="h-3 w-3" />
                            Payer:{" "}
                            <strong className="text-foreground">
                              {payerDisplayName}
                            </strong>
                            {payerPhone && (
                              <span className="font-mono text-[10px]">
                                ({payerPhone})
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {canRedeem && isActive && totalRemaining > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setRedeemSubscriptionTarget(sub)}
                        className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        Quick Redeem
                      </Button>
                    )}

                    <Link
                      href={`/subscriptions/${sub.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <span>Full Details</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Overall Quota Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium text-[11px]">
                      {isBeneficiary
                        ? "Member Quota Consumption"
                        : "Package Usage Consumption"}
                    </span>
                    <span className="font-semibold text-foreground text-[11px]">
                      {totalAllocated - totalRemaining} used / {totalAllocated}{" "}
                      total (
                      <span className="text-primary font-bold">
                        {totalRemaining} remaining
                      </span>
                      )
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        percentUsed >= 100
                          ? "bg-muted-foreground"
                          : percentUsed > 75
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, percentUsed)}%` }}
                    />
                  </div>
                </div>

                {/* Entitlements Breakdown Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {isBeneficiary
                      ? "Assigned Member Service Quotas"
                      : "Service Entitlements Quotas"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {relevantEntitlements.map((ent, idx) => {
                      const srv = services.find((s) => s.id === ent.serviceId);
                      const isDepleted = ent.remainingQuantity === 0;

                      return (
                        <div
                          key={ent.serviceId || `ent-${idx}`}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                            isDepleted
                              ? "bg-muted/30 border-border/60 text-muted-foreground opacity-60"
                              : "bg-muted/10 border-border text-foreground"
                          }`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <div className="font-semibold truncate">
                              {srv?.name ||
                                ent.serviceName ||
                                `Service #${ent.serviceId.slice(-4)}`}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {ent.usedQuantity} used of {ent.totalQuantity}
                            </div>
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isDepleted
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {ent.remainingQuantity} left
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sell Subscription Dialog with Pre-selected Customer */}
      {isCreateOpen && (
        <Dialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          maxWidth="2xl"
          title="Sell Customer Subscription"
        >
          <CreateSubscriptionDialog
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={handleCreateSubmit}
            isLoading={createMutation.isPending}
            initialCustomerId={customerId}
          />
        </Dialog>
      )}

      {/* Quick Redeem Dialog */}
      {redeemSubscriptionTarget && (
        <Dialog
          isOpen={Boolean(redeemSubscriptionTarget)}
          onClose={() => setRedeemSubscriptionTarget(null)}
          title="Redeem Subscription Entitlements"
        >
          <RedeemSubscriptionModal
            subscription={redeemSubscriptionTarget}
            isOpen={Boolean(redeemSubscriptionTarget)}
            onClose={() => setRedeemSubscriptionTarget(null)}
            memberCustomerId={customerId}
            onSuccess={() => {
              refetch();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
