"use client";

import React, { useState } from "react";
import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeleteMembershipPlan,
  useDuplicateMembershipPlan,
} from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Users,
  Sparkles,
  Percent,
  Calendar,
  Edit2,
  Trash2,
  ShoppingCart,
  Copy,
} from "lucide-react";
import { MembershipPlanDialog } from "./MembershipPlanDialog";
import { MembershipPlanCard } from "./MembershipPlanCard";
import { toast } from "sonner";
import type { MembershipPlan } from "../types/membership.types";
import type { MembershipPlanFormValues } from "../schemas/membership.schema";

interface MembershipPlansTabProps {
  onSellPlan?: (planId: string) => void;
  canConfigure?: boolean;
  canSell?: boolean;
}

export function MembershipPlansTab({
  onSellPlan,
  canConfigure = true,
  canSell = true,
}: MembershipPlansTabProps) {
  const { data, isLoading } = useMembershipPlans();
  const createPlanMutation = useCreateMembershipPlan();
  const updatePlanMutation = useUpdateMembershipPlan();
  const deletePlanMutation = useDeleteMembershipPlan();
  const duplicatePlanMutation = useDuplicateMembershipPlan();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (plan: MembershipPlan) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate the plan "${plan.name}"?`,
      )
    ) {
      return;
    }
    try {
      await deletePlanMutation.mutateAsync(plan.id);
      toast.success(`Plan "${plan.name}" deactivated successfully.`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to deactivate plan.";
      toast.error(errorMsg);
    }
  };

  const handleDuplicate = async (plan: MembershipPlan) => {
    try {
      await duplicatePlanMutation.mutateAsync(plan.id);
      toast.success(`Plan "${plan.name}" duplicated successfully.`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to duplicate plan.";
      toast.error(errorMsg);
    }
  };

  const handleSubmitPlan = async (values: MembershipPlanFormValues) => {
    try {
      const payload = {
        name: values.name,
        code: values.code ? values.code.toUpperCase() : null,
        tier: values.tier,
        description: values.description,
        termsAndConditions: values.termsAndConditions,
        price: values.price,
        validityMonths: values.validityMonths,
        validityUnit: values.validityUnit,
        validityDuration: values.validityDuration,
        maxBeneficiaries: values.maxBeneficiaries,
        benefits: {
          serviceDiscountPercentage: values.serviceDiscountPercentage,
          productDiscountPercentage: values.productDiscountPercentage,
          eligibleServiceCategoryIds: values.eligibleServiceCategoryIds,
          eligibleServiceIds: values.eligibleServiceIds,
          excludedServiceCategoryIds: values.excludedServiceCategoryIds,
          excludedServiceIds: values.excludedServiceIds,
          complimentaryPerks: values.complimentaryPerks,
        },
        permittedBranchIds: values.permittedBranchIds,
        isActive: values.isActive,
      };

      if (editingPlan) {
        await updatePlanMutation.mutateAsync({ id: editingPlan.id, payload });
        toast.success(`Plan "${values.name}" updated successfully.`);
      } else {
        await createPlanMutation.mutateAsync(payload);
        toast.success(`Plan "${values.name}" created successfully.`);
      }
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to save plan.";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Configured Membership Plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure membership privilege tiers, discounts, included perks, and
            multi-beneficiary limits.
          </p>
        </div>

        {canConfigure && (
          <Button onClick={handleOpenCreate} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Plan Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading plans catalog...
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">
              No membership plans configured yet
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Get started by creating your first tiered membership plan with
              service discounts and included perks.
            </p>
            {canConfigure && (
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                className="gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" /> Create First Plan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.data.map((plan) => (
            <MembershipPlanCard
              key={plan.id}
              plan={plan}
              canSell={canSell}
              canConfigure={canConfigure}
              onSell={onSellPlan}
              onDuplicate={handleDuplicate}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Configuration Dialog */}
      <MembershipPlanDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmitPlan}
        isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        initialPlan={editingPlan}
      />
    </div>
  );
}
