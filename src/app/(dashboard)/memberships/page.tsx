"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@/features/memberships/hooks/useMemberships";
import { useCreateInvoice } from "@/features/billing/hooks/useBillingMutations";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { CreditCard, Users, Layers, ShoppingCart, LayoutDashboard, Plus } from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MembershipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBranchId, isAllBranchesSelected } = useBranchContext();
  const [activeTab, setActiveTab] = useState<"overview" | "memberships" | "plans">("overview");
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(null);

  const canConfigure = hasPermission(user, "memberships.configure");
  const canSell = hasPermission(user, "memberships.sell") || hasPermission(user, "billing.checkout");

  const { data: plansData } = useMembershipPlans();
  const plans = plansData?.data || [];

  const { data: reportsData, isLoading: isReportsLoading } = useMembershipReports(currentBranchId || undefined);

  const createPlanMutation = useCreateMembershipPlan();
  const createInvoiceMutation = useCreateInvoice();

  const handleOpenSell = (planId?: string) => {
    if (isAllBranchesSelected || !currentBranchId) {
      toast.error("Please select a specific branch before initiating membership sales checkout.");
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

      // Route through Unified Billing Engine
      const invoicePayload = {
        branchId: currentBranchId,
        customerId: payload.payerCustomerId,
        membershipLines: [
          {
            membershipPlanId: payload.membershipPlanId,
            quantity: 1,
            payerCustomerId: payload.payerCustomerId,
            beneficiaryCustomerIds: payload.beneficiaryCustomerIds,
            beneficiaries: payload.beneficiaries,
            soldByStaffId: payload.soldByStaffId || undefined,
          },
        ],
        notes: payload.notes || "Membership Purchase",
      };

      const result = await createInvoiceMutation.mutateAsync(invoicePayload);
      const invoiceId = result?.id || result?._id;

      toast.success("Unified draft invoice created! Redirecting to checkout settlement...");
      setIsSellOpen(false);

      if (invoiceId) {
        router.push(`/billing/${invoiceId}`);
      } else {
        router.push("/billing");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to initiate membership sale.";
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
        benefits?: Partial<import("@/features/memberships/types/membership.types").MembershipBenefits>;
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

      // 1. Create custom plan (isCustom: true unless user opted to save to catalog)
      const createdPlan = await createPlanMutation.mutateAsync(customPlanPayload);

      // 2. Immediately initiate invoice with newly created custom plan
      const invoicePayload = {
        branchId: currentBranchId,
        customerId: checkoutData.payerCustomerId,
        membershipLines: [
          {
            membershipPlanId: createdPlan.id,
            quantity: 1,
            payerCustomerId: checkoutData.payerCustomerId,
            beneficiaryCustomerIds: checkoutData.beneficiaryCustomerIds,
            beneficiaries: checkoutData.beneficiaries,
            soldByStaffId: checkoutData.soldByStaffId || undefined,
          },
        ],
        notes: checkoutData.notes || `Custom membership sold: ${customPlanPayload.name}`,
      };

      const result = await createInvoiceMutation.mutateAsync(invoicePayload);
      const invoiceId = result?.id || result?._id;

      toast.success("Custom membership configured and invoice generated! Redirecting to checkout...");
      setIsSellOpen(false);

      if (invoiceId) {
        router.push(`/billing/${invoiceId}`);
      } else {
        router.push("/billing");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to create custom membership sale.";
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
          canSell ? (
            <Button onClick={() => handleOpenSell()} className="gap-1.5 shadow-sm cursor-pointer">
              <ShoppingCart className="w-4 h-4" /> Sell Membership
            </Button>
          ) : undefined
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview & Metrics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("memberships")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "memberships"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Enrolled Memberships
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "plans"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          Catalogue Plans ({plans.length})
        </button>
      </div>

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
        isLoading={createInvoiceMutation.isPending || createPlanMutation.isPending}
        plans={plans}
        selectedPlanId={preselectedPlanId}
      />
    </div>
  );
}
