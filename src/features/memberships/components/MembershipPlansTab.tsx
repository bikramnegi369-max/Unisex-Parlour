"use client";

import React, { useState } from "react";
import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeleteMembershipPlan,
} from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Sparkles, Percent, Calendar, Edit2, Trash2, ShoppingCart } from "lucide-react";
import { MembershipPlanDialog } from "./MembershipPlanDialog";
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
    if (!window.confirm(`Are you sure you want to deactivate the plan "${plan.name}"?`)) {
      return;
    }
    try {
      await deletePlanMutation.mutateAsync(plan.id);
      toast.success(`Plan "${plan.name}" deactivated successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to deactivate plan.");
    }
  };

  const handleSubmitPlan = async (values: MembershipPlanFormValues) => {
    try {
      const payload = {
        name: values.name,
        code: values.code ? values.code.toUpperCase() : null,
        tier: values.tier,
        description: values.description,
        price: values.price,
        validityMonths: values.validityMonths,
        maxBeneficiaries: values.maxBeneficiaries,
        benefits: {
          serviceDiscountPercentage: values.serviceDiscountPercentage,
          productDiscountPercentage: values.productDiscountPercentage,
          complimentaryPerks: values.complimentaryPerks,
        },
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save plan.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Configured Membership Plans</h2>
          <p className="text-sm text-muted-foreground">
            Configure membership privilege tiers, discounts, included perks, and multi-beneficiary limits.
          </p>
        </div>

        {canConfigure && (
          <Button onClick={handleOpenCreate} className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Plan Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading plans catalog...</div>
      ) : !data?.data || data.data.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-lg">No membership plans configured yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Get started by creating your first tiered membership plan with service discounts and included perks.
            </p>
            {canConfigure && (
              <Button onClick={handleOpenCreate} variant="outline" className="gap-1.5 mt-2">
                <Plus className="w-4 h-4" /> Create First Plan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.data.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-1 text-primary border-primary/30">
                      {plan.tier} Tier
                    </Badge>
                    <CardTitle className="text-lg leading-snug">{plan.name}</CardTitle>
                    {plan.code && <CardDescription className="font-mono text-xs">Code: {plan.code}</CardDescription>}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground block">/ {plan.validityMonths} mos</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1 text-sm flex-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Allows up to <strong className="text-foreground">{plan.maxBeneficiaries || 1}</strong> beneficiaries
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs">
                  <div>
                    <span className="text-muted-foreground block">Service Discount</span>
                    <strong className="text-emerald-600 font-semibold">{plan.benefits?.serviceDiscountPercentage || 0}% OFF</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Product Discount</span>
                    <strong className="text-emerald-600 font-semibold">{plan.benefits?.productDiscountPercentage || 0}% OFF</strong>
                  </div>
                </div>

                {plan.benefits?.complimentaryPerks && plan.benefits.complimentaryPerks.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Included Perks:</span>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                      {plan.benefits.complimentaryPerks.map((perk, i) => (
                        <li key={i}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>

              {/* Action Toolbar */}
              <div className="p-4 pt-2 border-t bg-muted/20 flex items-center justify-between gap-2">
                {canSell && onSellPlan && (
                  <Button
                    size="sm"
                    onClick={() => onSellPlan(plan.id)}
                    className="gap-1.5 text-xs flex-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Sell Plan
                  </Button>
                )}

                {canConfigure && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(plan)}
                      className="h-8 px-2.5 text-xs cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(plan)}
                      className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                      title="Deactivate Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
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
