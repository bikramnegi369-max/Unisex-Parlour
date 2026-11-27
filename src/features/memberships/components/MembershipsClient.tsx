"use client";

import { SectionTabs } from "@/components/ui/section-tabs";

import React, { useState } from "react";
import { MembershipsOverviewTab } from "@/features/memberships/components/MembershipsOverviewTab";
import { CustomerMembershipsTab } from "@/features/memberships/components/CustomerMembershipsTab";
import { MembershipPlansTab } from "@/features/memberships/components/MembershipPlansTab";
import { SellMembershipDialog } from "@/features/memberships/components/SellMembershipDialog";
import type {
  CreateMembershipPlanPayload,
  SellMembershipCheckoutPayload,
} from "@/features/memberships/types/membership.types";
import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useMembershipReports,
  useSellMembership,
} from "@/features/memberships/hooks/useMemberships";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  CreditCard,
  Users,
  Layers,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import { SyncButton } from "@/components/ui/sync-button";
import { toast } from "sonner";

export function MembershipsClient() {
  const { user } = useAuth();
  const { currentBranchId, isAllBranchesSelected } = useBranchContext();
  const [activeTab, setActiveTab] = useState<
    "overview" | "memberships" | "plans"
  >("overview");
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(
    null,
  );

  const canConfigure = hasPermission(user, "memberships.configure");
  const canSell =
    hasPermission(user, "memberships.sell") ||
    hasPermission(user, "billing.checkout");

  const { data: plansData, refetch: refetchPlans } = useMembershipPlans();
  const plans = plansData?.data || [];

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isFetching: isReportsFetching,
    refetch: refetchReports,
  } = useMembershipReports(currentBranchId || undefined);

  const createPlanMutation = useCreateMembershipPlan();
  const sellMembershipMutation = useSellMembership();

  const handleOpenSell = (planId?: string) => {
    if (isAllBranchesSelected || !currentBranchId) {
      toast.error(
        "Please select a specific branch before initiating membership sales checkout.",
      );
      return;
    }
    setPreselectedPlanId(planId || null);
    setIsSellOpen(true);
  };

  const handleSellSubmit = async (payload: SellMembershipCheckoutPayload) => {
    try {
      if (!currentBranchId) {
        toast.error("Branch context required");
        return;
      }

      const res = await sellMembershipMutation.mutateAsync({
        membershipPlanId: payload.membershipPlanId,
        payerCustomerId: payload.payerCustomerId,
        beneficiaryCustomerIds: payload.beneficiaryCustomerIds,
        beneficiaries: payload.beneficiaries,
        branchId: currentBranchId,
        soldByStaffId: payload.soldByStaffId,
        notes: payload.notes,
        // Defer invoice generation to Unified Sales Workspace checkout
        billImmediately: false,
      });

      const memberCount =
        res?.customerMemberships?.length ||
        payload.beneficiaryCustomerIds?.length ||
        1;
      const memCode = res?.customerMembership?.membershipCode || "";

      const invId = res?.invoice?.id;
      toast.success(
        `Membership sold successfully! Enrolled ${memberCount} member(s). ${memCode ? `Code: ${memCode}` : ""}`.trim(),
        {
          action: invId
            ? {
                label: "View Invoice",
                onClick: () => window.open(`/billing/${invId}`, "_blank"),
              }
            : undefined,
          duration: 6000,
        },
      );

      setIsSellOpen(false);
      refetchReports();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to sell membership.";
      toast.error(errorMsg);
    }
  };

  const handleCreateCustomPlanAndSell = async (
    customPlanPayload: CreateMembershipPlanPayload,
    checkoutData: {
      payerCustomerId: string;
      beneficiaryCustomerIds: string[];
      beneficiaries?: Array<{
        customerId: string;
        benefits?: Partial<
          import("@/features/memberships/types/membership.types").MembershipBenefits
        >;
      }>;
      soldByStaffId?: string;
      notes?: string;
    },
  ) => {
    try {
      if (!currentBranchId) {
        toast.error("Branch context required");
        return;
      }

      // 1. Create custom plan
      const createdPlan =
        await createPlanMutation.mutateAsync(customPlanPayload);

      // 2. Sell membership immediately using the new plan
      const res = await sellMembershipMutation.mutateAsync({
        membershipPlanId: createdPlan.id,
        payerCustomerId: checkoutData.payerCustomerId,
        beneficiaryCustomerIds: checkoutData.beneficiaryCustomerIds,
        beneficiaries: checkoutData.beneficiaries,
        branchId: currentBranchId,
        soldByStaffId: checkoutData.soldByStaffId,
        notes: checkoutData.notes,
        // Defer invoice generation to Unified Sales Workspace checkout
        billImmediately: false,
      });

      const memberCount =
        res?.customerMemberships?.length ||
        checkoutData.beneficiaryCustomerIds?.length ||
        1;
      const memCode = res?.customerMembership?.membershipCode || "";

      const customInvId = res?.invoice?.id;
      toast.success(
        `Custom membership created and sold successfully! Enrolled ${memberCount} member(s). ${memCode ? `Code: ${memCode}` : ""}`.trim(),
        {
          action: customInvId
            ? {
                label: "View Invoice",
                onClick: () => window.open(`/billing/${customInvId}`, "_blank"),
              }
            : undefined,
          duration: 6000,
        },
      );

      setIsSellOpen(false);
      refetchReports();
      refetchPlans();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to create custom membership sale.";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <PageHeaderBanner
        title="Memberships"
        description="Enterprise memberships dashboard, multi-beneficiary privileged sales, and tailored customer plans."
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-2">
            <SyncButton
              isSyncing={isReportsFetching}
              onSync={() => {
                refetchReports();
                refetchPlans();
              }}
              label="Refresh Data"
            />
            {canSell && (
              <Button
                onClick={() => handleOpenSell()}
                className="gap-1.5 shadow-sm cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" /> Sell Membership
              </Button>
            )}
          </div>
        }
      />

      {/* Tab Switcher */}
      <SectionTabs
        ariaLabel="Membership sections"
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        items={[
          {
            key: "overview",
            label: "Overview & Metrics",
            icon: <LayoutDashboard className="h-4 w-4" />,
          },
          {
            key: "memberships",
            label: "Enrolled Memberships",
            icon: <Users className="h-4 w-4" />,
          },
          {
            key: "plans",
            label: `Catalogue Plans (${plans.length})`,
            icon: <Layers className="h-4 w-4" />,
          },
        ]}
      />

      <div>
        {activeTab === "overview" && (
          <MembershipsOverviewTab
            reports={reportsData}
            isLoading={isReportsLoading}
            onSellMembership={() => handleOpenSell()}
            onCreatePlan={() => setActiveTab("plans")}
            onViewCustomerMemberships={() => setActiveTab("memberships")}
            onViewPlansCatalog={() => setActiveTab("plans")}
            canSell={canSell}
            canConfigure={canConfigure}
          />
        )}

        {activeTab === "memberships" && (
          <CustomerMembershipsTab
            onSell={() => handleOpenSell()}
            canSell={canSell}
          />
        )}

        {activeTab === "plans" && (
          <MembershipPlansTab
            onSellPlan={(pId) => handleOpenSell(pId)}
            canConfigure={canConfigure}
            canSell={canSell}
          />
        )}
      </div>

      {/* Production-grade Sell Membership Dialog */}
      <SellMembershipDialog
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSubmit={handleSellSubmit}
        onCreateCustomPlanAndSell={handleCreateCustomPlanAndSell}
        isLoading={
          createPlanMutation.isPending || sellMembershipMutation.isPending
        }
        plans={plans}
        selectedPlanId={preselectedPlanId}
      />
    </div>
  );
}
