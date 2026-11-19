"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerMembershipsTab } from "@/features/memberships/components/CustomerMembershipsTab";
import { MembershipPlansTab } from "@/features/memberships/components/MembershipPlansTab";
import { SellMembershipDialog } from "@/features/memberships/components/SellMembershipDialog";
import { useMembershipPlans } from "@/features/memberships/hooks/useMemberships";
import { useCreateInvoice } from "@/features/billing/hooks/useBillingMutations";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { CreditCard, Users, Layers, ShoppingCart, Plus } from "lucide-react";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SellMembershipFormValues } from "@/features/memberships/schemas/membership.schema";

export default function MembershipsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBranchId, isAllBranchesSelected } = useBranchContext();
  const [activeTab, setActiveTab] = useState<"memberships" | "plans">("memberships");
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(null);

  const canConfigure = hasPermission(user, "memberships.configure");
  const canSell = hasPermission(user, "memberships.sell") || hasPermission(user, "billing.checkout");

  const { data: plansData } = useMembershipPlans();
  const plans = plansData?.data || [];

  const createInvoiceMutation = useCreateInvoice();

  const handleOpenSell = (planId?: string) => {
    if (isAllBranchesSelected || !currentBranchId) {
      toast.error("Please select a specific branch before initiating membership sales checkout.");
      return;
    }
    setPreselectedPlanId(planId || null);
    setIsSellOpen(true);
  };

  const handleSellSubmit = async (values: SellMembershipFormValues) => {
    try {
      if (!currentBranchId) {
        toast.error("Branch context required");
        return;
      }

      // Route through Unified Billing Engine
      const invoicePayload = {
        branchId: currentBranchId,
        customerId: values.payerCustomerId,
        membershipLines: [
          {
            membershipPlanId: values.membershipPlanId,
            quantity: 1,
            payerCustomerId: values.payerCustomerId,
            beneficiaryCustomerIds: values.beneficiaryCustomerIds,
            soldByStaffId: values.soldByStaffId || undefined,
          },
        ],
        notes: values.notes || "Membership Purchase",
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to initiate membership sale.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <PageHeaderBanner
        title="Memberships"
        description="Manage membership privilege tiers, multi-beneficiary assignments, and customer privileges."
        icon={CreditCard}
        actions={
          canSell ? (
            <Button onClick={() => handleOpenSell()} className="gap-1.5 shadow-sm">
              <ShoppingCart className="w-4 h-4" /> Sell Membership
            </Button>
          ) : undefined
        }
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
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
          Customer Memberships
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
          Membership Plans ({plans.length})
        </button>
      </div>

      <div>
        {activeTab === "memberships" ? (
          <CustomerMembershipsTab
            onSell={() => handleOpenSell()}
            canSell={canSell}
          />
        ) : (
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
        isLoading={createInvoiceMutation.isPending}
        plans={plans}
        selectedPlanId={preselectedPlanId}
      />
    </div>
  );
}
