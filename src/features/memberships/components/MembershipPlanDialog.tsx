"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { Plus, Trash2, Loader2, Sparkles, Building2, Tag, ShieldCheck } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"general" | "benefits" | "restrictions">("general");

  const { data: serviceCategoriesData } = useServiceCategories();
  const serviceCategories = serviceCategoriesData?.data || [];

  const { data: servicesData } = useServices({ limit: "all" });
  const allServices = (servicesData?.data || []).filter((s) => s.isActive);

  const { branches: allBranches } = useBranches();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<MembershipPlanFormValues>({
    resolver: zodResolver(membershipPlanFormSchema) as unknown as Resolver<MembershipPlanFormValues>,
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

  const perks = watch("complimentaryPerks") || [];
  const selectedBranchIds = watch("permittedBranchIds") || [];
  const selectedCategoryIds = watch("eligibleServiceCategoryIds") || [];
  const selectedServiceIds = watch("eligibleServiceIds") || [];

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
        validityDuration: initialPlan.validityDuration || initialPlan.validityMonths || 12,
        maxBeneficiaries: initialPlan.maxBeneficiaries || 1,
        serviceDiscountPercentage: initialPlan.benefits?.serviceDiscountPercentage || 0,
        productDiscountPercentage: initialPlan.benefits?.productDiscountPercentage || 0,
        eligibleServiceCategoryIds: initialPlan.benefits?.eligibleServiceCategoryIds || [],
        eligibleServiceIds: initialPlan.benefits?.eligibleServiceIds || [],
        excludedServiceCategoryIds: initialPlan.benefits?.excludedServiceCategoryIds || [],
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

  const toggleBranchSelection = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      setValue("permittedBranchIds", selectedBranchIds.filter((b) => b !== branchId));
    } else {
      setValue("permittedBranchIds", [...selectedBranchIds, branchId]);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setValue("eligibleServiceCategoryIds", selectedCategoryIds.filter((c) => c !== categoryId));
    } else {
      setValue("eligibleServiceCategoryIds", [...selectedCategoryIds, categoryId]);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialPlan ? "Edit Membership Plan" : "Create Membership Plan"}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border pb-1 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "general"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            General Identity & Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("benefits")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "benefits"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Discounts & Perks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restrictions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === "restrictions"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Branch & Eligibility Policies
          </button>
        </div>

        {/* TAB 1: General Identity & Pricing */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Plan Name *</label>
                <Input placeholder="e.g. Gold VIP Privilege" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Plan Code (Optional)</label>
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
                <label className="text-xs font-semibold text-foreground">Selling Price (₹) *</label>
                <Input type="number" step="0.01" min="0" {...register("price", { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Validity (Months) *</label>
                <Input
                  type="number"
                  min="1"
                  {...register("validityMonths", {
                    valueAsNumber: true,
                    onChange: (e) => {
                      setValue("validityDuration", Number(e.target.value));
                    },
                  })}
                />
                {errors.validityMonths && (
                  <p className="text-xs text-destructive">{errors.validityMonths.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Maximum Beneficiaries *</label>
                <Input type="number" min="1" max="20" {...register("maxBeneficiaries", { valueAsNumber: true })} />
                <span className="text-[10px] text-muted-foreground block">
                  Permitted members (1 = Single user, &gt;1 = Family/Corporate pool)
                </span>
                {errors.maxBeneficiaries && (
                  <p className="text-xs text-destructive">{errors.maxBeneficiaries.message}</p>
                )}
              </div>

              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="text-xs font-semibold text-foreground">Plan Status</label>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    {...register("isActive")}
                  />
                  <span className="text-xs font-medium text-foreground">Active & available in POS catalog</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Textarea
                placeholder="Describe the privileges, target audience, and exclusivity..."
                rows={2}
                {...register("description")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Terms & Conditions</label>
              <Textarea
                placeholder="Cancellation, transferability, refund policy, and validity terms..."
                rows={2}
                {...register("termsAndConditions")}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Discounts & Complimentary Perks */}
        {activeTab === "benefits" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Service Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("serviceDiscountPercentage", { valueAsNumber: true })}
                />
                <span className="text-[10px] text-muted-foreground block">
                  Percentage automatically applied to billable salon services
                </span>
                {errors.serviceDiscountPercentage && (
                  <p className="text-xs text-destructive">{errors.serviceDiscountPercentage.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Product Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("productDiscountPercentage", { valueAsNumber: true })}
                />
                <span className="text-[10px] text-muted-foreground block">
                  Percentage automatically applied to retail products at checkout
                </span>
                {errors.productDiscountPercentage && (
                  <p className="text-xs text-destructive">{errors.productDiscountPercentage.message}</p>
                )}
              </div>
            </div>

            {/* Complimentary Perks List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Complimentary Perks</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Free Welcome Blowdry, Priority Stylist Booking, Birthday Gift"
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPerk();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPerk}
                  className="shrink-0 gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Perk
                </Button>
              </div>

              {perks.length > 0 && (
                <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
                  {perks.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted text-xs border"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {p}
                      </span>
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
          </div>
        )}

        {/* TAB 3: Branch & Category Restrictions */}
        {activeTab === "restrictions" && (
          <div className="space-y-4">
            {/* Branch Permissions */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Permitted Branches (Multi-Branch Access)
              </label>
              <p className="text-[11px] text-muted-foreground">
                Leave all unchecked to allow redemption across all branches in the organization.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto p-2 bg-muted/20 border rounded-md">
                {allBranches.map((branch) => {
                  const isChecked = selectedBranchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border-primary font-medium" : "bg-card hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBranchSelection(branch.id)}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{branch.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Service Category Eligibility */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" /> Eligible Service Categories
              </label>
              <p className="text-[11px] text-muted-foreground">
                Leave unchecked to apply discounts to all service categories. Check specific categories to restrict perks.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-36 overflow-y-auto p-2 bg-muted/20 border rounded-md">
                {serviceCategories.map((cat: any) => {
                  const catId = cat.id || cat._id;
                  const isChecked = selectedCategoryIds.includes(catId);
                  return (
                    <label
                      key={catId}
                      className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border-primary font-medium" : "bg-card hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategorySelection(catId)}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-[11px] text-muted-foreground">
            {initialPlan ? `Editing ${initialPlan.name}` : "New membership plan"}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2 cursor-pointer">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
