"use client";

import React, { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { membershipPlanFormSchema, type MembershipPlanFormValues } from "../schemas/membership.schema";
import type { MembershipPlan } from "../types/membership.types";

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
  const [newPerk, setNewPerk] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MembershipPlanFormValues>({
    resolver: zodResolver(membershipPlanFormSchema) as unknown as Resolver<MembershipPlanFormValues>,
    defaultValues: {
      name: "",
      code: "",
      tier: "Standard",
      description: "",
      price: 1999,
      validityMonths: 12,
      maxBeneficiaries: 1,
      serviceDiscountPercentage: 10,
      productDiscountPercentage: 5,
      complimentaryPerks: [],
      isActive: true,
    },
  });

  const perks = watch("complimentaryPerks") || [];

  useEffect(() => {
    if (initialPlan) {
      reset({
        name: initialPlan.name,
        code: initialPlan.code || "",
        tier: initialPlan.tier || "Standard",
        description: initialPlan.description || "",
        price: initialPlan.price,
        validityMonths: initialPlan.validityMonths,
        maxBeneficiaries: initialPlan.maxBeneficiaries || 1,
        serviceDiscountPercentage: initialPlan.benefits?.serviceDiscountPercentage || 0,
        productDiscountPercentage: initialPlan.benefits?.productDiscountPercentage || 0,
        complimentaryPerks: initialPlan.benefits?.complimentaryPerks || [],
        isActive: initialPlan.isActive ?? true,
      });
    } else {
      reset({
        name: "",
        code: "",
        tier: "Standard",
        description: "",
        price: 1999,
        validityMonths: 12,
        maxBeneficiaries: 1,
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 5,
        complimentaryPerks: [],
        isActive: true,
      });
    }
  }, [initialPlan, reset, isOpen]);

  const handleAddPerk = () => {
    if (newPerk.trim()) {
      setValue("complimentaryPerks", [...perks, newPerk.trim()]);
      setNewPerk("");
    }
  };

  const handleRemovePerk = (index: number) => {
    setValue(
      "complimentaryPerks",
      perks.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialPlan ? "Edit Membership Plan" : "Create Membership Plan"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Configure plan pricing, validity duration, tier discounts, and multi-beneficiary limits.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Plan Name *</label>
            <Input placeholder="e.g. Gold VIP Privilege" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Code (Optional)</label>
            <Input placeholder="e.g. GOLDVIP" className="uppercase font-mono" {...register("code")} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tier *</label>
            <Input placeholder="e.g. Gold, Platinum, VIP" {...register("tier")} />
            {errors.tier && <p className="text-xs text-destructive">{errors.tier.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Price (₹) *</label>
            <Input type="number" step="0.01" min="0" {...register("price", { valueAsNumber: true })} />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Validity (Months) *</label>
            <Input type="number" min="1" {...register("validityMonths", { valueAsNumber: true })} />
            {errors.validityMonths && <p className="text-xs text-destructive">{errors.validityMonths.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-muted/40 rounded-lg border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Max Beneficiaries *</label>
            <Input type="number" min="1" max="20" {...register("maxBeneficiaries", { valueAsNumber: true })} />
            <span className="text-[10px] text-muted-foreground block">Max members per purchase</span>
            {errors.maxBeneficiaries && <p className="text-xs text-destructive">{errors.maxBeneficiaries.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Service Discount (%)</label>
            <Input type="number" min="0" max="100" {...register("serviceDiscountPercentage", { valueAsNumber: true })} />
            <span className="text-[10px] text-muted-foreground block">Percentage off services</span>
            {errors.serviceDiscountPercentage && <p className="text-xs text-destructive">{errors.serviceDiscountPercentage.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Product Discount (%)</label>
            <Input type="number" min="0" max="100" {...register("productDiscountPercentage", { valueAsNumber: true })} />
            <span className="text-[10px] text-muted-foreground block">Percentage off retail POS</span>
            {errors.productDiscountPercentage && <p className="text-xs text-destructive">{errors.productDiscountPercentage.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Description</label>
          <Textarea placeholder="Describe the privileges and perks included..." rows={2} {...register("description")} />
        </div>

        {/* Complimentary Perks List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Complimentary Perks</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Free Welcome Blowdry, Priority Stylist Booking"
              value={newPerk}
              onChange={(e) => setNewPerk(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPerk();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddPerk} className="shrink-0 gap-1 cursor-pointer">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>

          {perks.length > 0 && (
            <div className="space-y-1 pt-1">
              {perks.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted text-xs border">
                  <span>{p}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePerk(idx)}
                    className="text-muted-foreground hover:text-destructive p-0.5 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2 cursor-pointer">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialPlan ? "Save Changes" : "Create Plan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
