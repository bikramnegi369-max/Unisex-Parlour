"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  membershipPlanFormSchema,
  type MembershipPlanFormValues,
} from "../schemas/membership.schema";
import type { MembershipPlan } from "../types/membership.types";
import { MembershipPlanFormFields } from "./MembershipPlanFormFields";

interface MembershipPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: MembershipPlanFormValues) => Promise<void>;
  isLoading: boolean;
  initialPlan?: MembershipPlan | null;
}

export function MembershipPlanDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialPlan,
}: MembershipPlanDialogProps) {
  const form = useForm<MembershipPlanFormValues>({
    resolver: zodResolver(
      membershipPlanFormSchema,
    ) as unknown as Resolver<MembershipPlanFormValues>,
    defaultValues: {
      name: "",
      code: "",
      tier: "Standard",
      description: "",
      termsAndConditions: "",
      price: 1999,
      validityMonths: 12,
      validityUnit: "months",
      validityDuration: 12,
      maxBeneficiaries: 1,
      serviceDiscountPercentage: 10,
      productDiscountPercentage: 5,
      eligibleServiceCategoryIds: [],
      eligibleServiceIds: [],
      excludedServiceCategoryIds: [],
      excludedServiceIds: [],
      permittedBranchIds: [],
      complimentaryPerks: [],
      isActive: true,
    },
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (initialPlan) {
      reset({
        name: initialPlan.name,
        code: initialPlan.code || "",
        tier: initialPlan.tier || "Standard",
        description: initialPlan.description || "",
        termsAndConditions: initialPlan.termsAndConditions || "",
        price: initialPlan.price,
        validityMonths: initialPlan.validityMonths,
        validityUnit: initialPlan.validityUnit || "months",
        validityDuration:
          initialPlan.validityDuration || initialPlan.validityMonths || 12,
        maxBeneficiaries: initialPlan.maxBeneficiaries || 1,
        serviceDiscountPercentage:
          initialPlan.benefits?.serviceDiscountPercentage || 0,
        productDiscountPercentage:
          initialPlan.benefits?.productDiscountPercentage || 0,
        eligibleServiceCategoryIds:
          initialPlan.benefits?.eligibleServiceCategoryIds || [],
        eligibleServiceIds: initialPlan.benefits?.eligibleServiceIds || [],
        excludedServiceCategoryIds:
          initialPlan.benefits?.excludedServiceCategoryIds || [],
        excludedServiceIds: initialPlan.benefits?.excludedServiceIds || [],
        permittedBranchIds: initialPlan.permittedBranchIds || [],
        complimentaryPerks: initialPlan.benefits?.complimentaryPerks || [],
        isActive: initialPlan.isActive ?? true,
      });
    } else {
      reset({
        name: "",
        code: "",
        tier: "Standard",
        description: "",
        termsAndConditions: "",
        price: 1999,
        validityMonths: 12,
        validityUnit: "months",
        validityDuration: 12,
        maxBeneficiaries: 1,
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 5,
        eligibleServiceCategoryIds: [],
        eligibleServiceIds: [],
        excludedServiceCategoryIds: [],
        excludedServiceIds: [],
        permittedBranchIds: [],
        complimentaryPerks: [],
        isActive: true,
      });
    }
  }, [initialPlan, isOpen, reset]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialPlan ? "Edit Membership Plan" : "Create Membership Plan Template"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Reusable Form Fields with 100% parity */}
        <MembershipPlanFormFields form={form} />

        {/* Modal Action Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-[11px] text-muted-foreground">
            {initialPlan ? `Editing ${initialPlan.name}` : "New membership plan template"}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 text-xs cursor-pointer"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initialPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
