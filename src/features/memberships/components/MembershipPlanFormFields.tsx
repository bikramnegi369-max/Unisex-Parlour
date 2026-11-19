"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Building2,
  Tag,
  ShieldCheck,
  Plus,
  Trash2,
  Percent,
  Calendar,
  Layers,
} from "lucide-react";
import type { MembershipPlanFormValues } from "../schemas/membership.schema";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useBranches } from "@/features/branches/hooks/useBranches";

interface MembershipPlanFormFieldsProps {
  form: UseFormReturn<MembershipPlanFormValues>;
  isCustomMode?: boolean;
}

export function MembershipPlanFormFields({
  form,
  isCustomMode = false,
}: MembershipPlanFormFieldsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "benefits" | "restrictions">("general");
  const [newPerk, setNewPerk] = useState("");

  const { data: serviceCategoriesData } = useServiceCategories();
  const serviceCategories = serviceCategoriesData?.data || [];

  const { data: servicesData } = useServices({ limit: "all" });
  const allServices = (servicesData?.data || []).filter((s) => s.isActive);

  const { branches: allBranches } = useBranches();

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const perks = watch("complimentaryPerks") || [];
  const selectedBranchIds = watch("permittedBranchIds") || [];
  const selectedCategoryIds = watch("eligibleServiceCategoryIds") || [];
  const selectedServiceIds = watch("eligibleServiceIds") || [];
  const maxBeneficiaries = watch("maxBeneficiaries") || 1;

  const handleAddPerk = () => {
    if (!newPerk.trim()) return;
    setValue("complimentaryPerks", [...perks, newPerk.trim()]);
    setNewPerk("");
  };

  const handleRemovePerk = (index: number) => {
    setValue(
      "complimentaryPerks",
      perks.filter((_, i) => i !== index),
    );
  };

  const toggleBranchSelection = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      setValue(
        "permittedBranchIds",
        selectedBranchIds.filter((id) => id !== branchId),
      );
    } else {
      setValue("permittedBranchIds", [...selectedBranchIds, branchId]);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setValue(
        "eligibleServiceCategoryIds",
        selectedCategoryIds.filter((id) => id !== categoryId),
      );
    } else {
      setValue("eligibleServiceCategoryIds", [...selectedCategoryIds, categoryId]);
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setValue(
        "eligibleServiceIds",
        selectedServiceIds.filter((id) => id !== serviceId),
      );
    } else {
      setValue("eligibleServiceIds", [...selectedServiceIds, serviceId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Subtab Navigation Pills */}
      <div className="flex border-b border-border pb-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === "general"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> General & Pricing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("benefits")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === "benefits"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Discounts & Perks
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("restrictions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === "restrictions"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Branch & Eligibility Rules
        </button>
      </div>

      {/* TAB 1: General & Pricing */}
      {activeTab === "general" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Plan Name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name")}
                placeholder="e.g. VIP Gold Annual"
                className="text-xs h-8"
              />
              {errors.name && (
                <p className="text-[11px] text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Plan Code / SKU (Optional)
              </label>
              <Input
                {...register("code")}
                placeholder="e.g. MEM-GLD-12"
                className="text-xs h-8 font-mono uppercase"
              />
              {errors.code && (
                <p className="text-[11px] text-destructive">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Tier Level <span className="text-destructive">*</span>
              </label>
              <select
                {...register("tier")}
                className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="VIP">VIP</option>
                <option value="Custom VIP">Custom VIP</option>
              </select>
              {errors.tier && (
                <p className="text-[11px] text-destructive">{errors.tier.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Selling Price (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min={0}
                {...register("price", { valueAsNumber: true })}
                placeholder="1999"
                className="text-xs h-8 font-semibold"
              />
              {errors.price && (
                <p className="text-[11px] text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Validity Duration
              </label>
              <Input
                type="number"
                min={1}
                {...register("validityDuration", { valueAsNumber: true })}
                className="text-xs h-8"
              />
              {errors.validityDuration && (
                <p className="text-[11px] text-destructive">
                  {errors.validityDuration.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Duration Unit
              </label>
              <select
                {...register("validityUnit")}
                className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Max Beneficiaries</span>
                <span className="text-[10px] text-muted-foreground font-normal">Default: 1</span>
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                {...register("maxBeneficiaries", { valueAsNumber: true })}
                className="text-xs h-8"
              />
              {errors.maxBeneficiaries && (
                <p className="text-[11px] text-destructive">
                  {errors.maxBeneficiaries.message}
                </p>
              )}
            </div>
          </div>

          {/* Explain multi-member policy if > 1 */}
          {maxBeneficiaries > 1 && (
            <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Multi-Beneficiary Privilege Enabled:</strong> Allows up to{" "}
                <strong>{maxBeneficiaries}</strong> customers to share this membership&apos;s privileges.
                Each enrolled customer receives an individual active membership record while sharing terms.
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Internal Description
            </label>
            <Textarea
              {...register("description")}
              placeholder="Brief summary of target customer audience and perks"
              rows={2}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Discounts & Perks */}
      {activeTab === "benefits" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-600" /> Service Discount (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("serviceDiscountPercentage", { valueAsNumber: true })}
                className="text-xs h-8 font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Applied automatically to eligible salon services at checkout.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-600" /> Product Discount (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("productDiscountPercentage", { valueAsNumber: true })}
                className="text-xs h-8 font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Applied automatically to retail product sales at checkout.
              </p>
            </div>
          </div>

          {/* Complimentary Perks List Builder */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Complimentary Perks & Inclusions
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Free Welcome Scalp Analysis on every visit"
                value={newPerk}
                onChange={(e) => setNewPerk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPerk();
                  }
                }}
                className="text-xs h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPerk}
                className="text-xs h-8 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Perk
              </Button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
              {perks.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-2 bg-muted/20 border border-dashed rounded text-center">
                  No perks added yet.
                </div>
              ) : (
                perks.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border bg-card text-xs shadow-2xs"
                  >
                    <span className="truncate">{p}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePerk(idx)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Branch & Category Eligibility Rules */}
      {activeTab === "restrictions" && (
        <div className="space-y-4 pt-1">
          {/* Permitted Branches Multi-Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Permitted Salon Branches
            </label>
            <p className="text-[11px] text-muted-foreground">
              Leave all unchecked to permit redemption across all salon branches.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-32 overflow-y-auto p-2 bg-muted/20 border rounded-md">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-32 overflow-y-auto p-2 bg-muted/20 border rounded-md">
              {serviceCategories.map((cat) => {
                const catId = cat.id || (cat as { _id?: string })._id || "";
                if (!catId) return null;
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

          {/* Specific Services Inclusion */}
          {allServices.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Specific Service Inclusions (Optional)
              </label>
              <p className="text-[11px] text-muted-foreground">
                Optionally restrict to specific services. If empty, all services in eligible categories apply.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-28 overflow-y-auto p-2 bg-muted/20 border rounded-md">
                {allServices.slice(0, 30).map((srv) => {
                  const srvId = srv.id || (srv as { _id?: string })._id || "";
                  if (!srvId) return null;
                  const isChecked = selectedServiceIds.includes(srvId);
                  return (
                    <label
                      key={srvId}
                      className={`flex items-center gap-2 p-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border-primary font-medium" : "bg-card hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleServiceSelection(srvId)}
                        className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{srv.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Terms & Conditions
            </label>
            <Textarea
              {...register("termsAndConditions")}
              placeholder="e.g. Non-transferable, valid on appointments only, cannot be clubbed with external coupon vouchers."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
