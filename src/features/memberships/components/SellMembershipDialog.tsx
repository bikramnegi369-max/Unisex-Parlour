"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { StaffAttributionSelect } from "@/features/employees/components/StaffAttributionSelect";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency } from "@/lib/formatters";
import {
  CreditCard,
  Users,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Tag,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type {
  MembershipPlan,
  CreateMembershipPlanPayload,
} from "../types/membership.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { getCustomer } from "@/features/customers/api/customers.api";
import {
  membershipPlanFormSchema,
  type MembershipPlanFormValues,
} from "../schemas/membership.schema";
import { MembershipPlanFormFields } from "./MembershipPlanFormFields";
import { toast } from "sonner";

export interface SellMembershipCheckoutPayload {
  membershipPlanId: string;
  payerCustomerId: string;
  beneficiaryCustomerIds: string[];
  soldByStaffId?: string;
  notes?: string;
}

interface SellMembershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SellMembershipCheckoutPayload) => Promise<void>;
  onCreateCustomPlanAndSell?: (
    customPlanPayload: CreateMembershipPlanPayload,
    checkoutData: {
      payerCustomerId: string;
      beneficiaryCustomerIds: string[];
      soldByStaffId?: string;
      notes?: string;
    },
  ) => Promise<void>;
  isLoading: boolean;
  plans: MembershipPlan[];
  selectedPlanId?: string | null;
  initialCustomerId?: string | null;
}

export function SellMembershipDialog({
  isOpen,
  onClose,
  onSubmit,
  onCreateCustomPlanAndSell,
  isLoading,
  plans,
  selectedPlanId,
  initialCustomerId,
}: SellMembershipDialogProps) {
  const { currentBranchId } = useBranchContext();

  // Multi-step journey state: 1 = Who (Payer & Beneficiaries), 2 = Plan or Custom Builder, 3 = Review & Checkout
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Parties
  const [payerCustomerId, setPayerCustomerId] = useState<string>(
    initialCustomerId || "",
  );
  const [beneficiaryCustomerIds, setBeneficiaryCustomerIds] = useState<
    string[]
  >(initialCustomerId ? [initialCustomerId] : []);
  const [beneficiaryCandidateId, setBeneficiaryCandidateId] =
    useState<string>("");

  // Customer profile cache for human-friendly names and phones
  const [customerProfiles, setCustomerProfiles] = useState<
    Record<string, Customer>
  >({});

  // Step 2: Mode selection ("catalog" vs "custom")
  const [planMode, setPlanMode] = useState<"catalog" | "custom">("catalog");
  const [chosenPlanId, setChosenPlanId] = useState<string>(
    selectedPlanId || "",
  );

  // Option B: Shared Custom Plan Builder Form using MembershipPlanFormFields for 100% template parity
  const customPlanForm = useForm<MembershipPlanFormValues>({
    resolver: zodResolver(
      membershipPlanFormSchema,
    ) as unknown as Resolver<MembershipPlanFormValues>,
    defaultValues: {
      name: "Custom Customer Membership",
      code: "",
      tier: "Custom VIP",
      description: "",
      termsAndConditions: "Agreed at time of purchase.",
      price: 2999,
      validityMonths: 12,
      validityUnit: "months",
      validityDuration: 12,
      maxBeneficiaries: 1, // P0: Exactly 1 by default
      serviceDiscountPercentage: 20,
      productDiscountPercentage: 10,
      eligibleServiceCategoryIds: [],
      eligibleServiceIds: [],
      excludedServiceCategoryIds: [],
      excludedServiceIds: [],
      permittedBranchIds: currentBranchId ? [currentBranchId] : [],
      complimentaryPerks: ["Priority Appointment Scheduling"],
      isActive: true,
    },
  });

  const [saveAsPermanentCatalog, setSaveAsPermanentCatalog] = useState(false);

  // Step 3: Staff Attribution & Notes
  const [soldByStaffId, setSoldByStaffId] = useState("");
  const [notes, setNotes] = useState("");

  // Reset or initialize state on dialog open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPayerCustomerId(initialCustomerId || "");
      setBeneficiaryCustomerIds(initialCustomerId ? [initialCustomerId] : []);
      setChosenPlanId(selectedPlanId || (plans[0]?.id ?? ""));
      setPlanMode("catalog");
      setSaveAsPermanentCatalog(false);
      setSoldByStaffId("");
      setNotes("");

      customPlanForm.reset({
        name: "Custom Customer Membership",
        code: "",
        tier: "Custom VIP",
        description: "",
        termsAndConditions: "Agreed at time of purchase.",
        price: 2999,
        validityMonths: 12,
        validityUnit: "months",
        validityDuration: 12,
        maxBeneficiaries: 1, // P0: Exactly 1 by default
        serviceDiscountPercentage: 20,
        productDiscountPercentage: 10,
        eligibleServiceCategoryIds: [],
        eligibleServiceIds: [],
        excludedServiceCategoryIds: [],
        excludedServiceIds: [],
        permittedBranchIds: currentBranchId ? [currentBranchId] : [],
        complimentaryPerks: ["Priority Appointment Scheduling"],
        isActive: true,
      });

      if (initialCustomerId) {
        getCustomer(initialCustomerId)
          .then((cust) => {
            if (cust) {
              setCustomerProfiles((prev) => ({ ...prev, [cust.id]: cust }));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialCustomerId, selectedPlanId, plans, currentBranchId, customPlanForm]);

  const selectedCatalogPlan = useMemo(
    () => plans.find((p) => p.id === chosenPlanId),
    [plans, chosenPlanId],
  );

  const customFormValues = customPlanForm.watch();

  // Effective max allowed beneficiaries
  const effectiveMaxBeneficiaries = useMemo(() => {
    if (planMode === "catalog") {
      return selectedCatalogPlan?.maxBeneficiaries || 1;
    }
    return customFormValues.maxBeneficiaries || 1;
  }, [planMode, selectedCatalogPlan, customFormValues.maxBeneficiaries]);

  // Handle adding payer to beneficiary list
  const handleAddPayerAsBeneficiary = () => {
    if (!payerCustomerId) return;
    if (beneficiaryCustomerIds.includes(payerCustomerId)) return;
    if (beneficiaryCustomerIds.length >= effectiveMaxBeneficiaries) {
      toast.warning(
        `Maximum ${effectiveMaxBeneficiaries} beneficiary allowed for this plan.`,
      );
      return;
    }
    setBeneficiaryCustomerIds((prev) => [...prev, payerCustomerId]);
  };

  // Handle adding an additional beneficiary
  const handleAddBeneficiary = (customerId: string, customer?: Customer) => {
    if (!customerId) return;
    if (customer) {
      setCustomerProfiles((prev) => ({ ...prev, [customerId]: customer }));
    }
    if (beneficiaryCustomerIds.includes(customerId)) {
      toast.warning("This customer is already added as a beneficiary.");
      return;
    }
    if (beneficiaryCustomerIds.length >= effectiveMaxBeneficiaries) {
      toast.warning(
        `Maximum ${effectiveMaxBeneficiaries} beneficiaries reached.`,
      );
      return;
    }
    setBeneficiaryCustomerIds((prev) => [...prev, customerId]);
    setBeneficiaryCandidateId("");
  };

  const handleRemoveBeneficiary = (customerId: string) => {
    setBeneficiaryCustomerIds((prev) =>
      prev.filter((id) => id !== customerId),
    );
  };

  // Step 1 Validation
  const canProceedFromStep1 = Boolean(
    payerCustomerId &&
      beneficiaryCustomerIds.length > 0 &&
      beneficiaryCustomerIds.length <= effectiveMaxBeneficiaries,
  );

  // Step 2 Validation
  const canProceedFromStep2 = Boolean(
    planMode === "catalog"
      ? chosenPlanId && selectedCatalogPlan
      : customFormValues.name?.trim() &&
          customFormValues.price >= 0 &&
          (customFormValues.validityDuration || customFormValues.validityMonths) > 0,
  );

  // Submit Final Sale
  const handleFinalSubmit = async () => {
    if (!payerCustomerId) {
      toast.error("Please specify who is paying for the membership.");
      return;
    }
    if (beneficiaryCustomerIds.length === 0) {
      toast.error(
        "Please add at least one beneficiary who will use this membership.",
      );
      return;
    }

    if (planMode === "catalog") {
      if (!chosenPlanId) {
        toast.error("Please select a membership plan.");
        return;
      }
      await onSubmit({
        membershipPlanId: chosenPlanId,
        payerCustomerId,
        beneficiaryCustomerIds,
        soldByStaffId: soldByStaffId || undefined,
        notes: notes || "Membership Sale",
      });
    } else {
      if (!onCreateCustomPlanAndSell) {
        toast.error("Custom plan creation is not supported in this view.");
        return;
      }

      // Convert validity duration to months for backward compatibility
      let validityMonths = customFormValues.validityDuration || 12;
      if (customFormValues.validityUnit === "years")
        validityMonths = (customFormValues.validityDuration || 1) * 12;
      if (customFormValues.validityUnit === "days")
        validityMonths = Math.max(
          1,
          Math.round((customFormValues.validityDuration || 30) / 30),
        );

      const customPayload: CreateMembershipPlanPayload = {
        name: customFormValues.name.trim(),
        code: customFormValues.code || null,
        tier: customFormValues.tier,
        price: customFormValues.price,
        validityMonths,
        validityDuration: customFormValues.validityDuration || validityMonths,
        validityUnit: customFormValues.validityUnit || "months",
        maxBeneficiaries: customFormValues.maxBeneficiaries || 1,
        isCustom: !saveAsPermanentCatalog, // P0: Flag as custom unless explicitly saved to catalog
        permittedBranchIds:
          customFormValues.permittedBranchIds &&
          customFormValues.permittedBranchIds.length > 0
            ? customFormValues.permittedBranchIds
            : currentBranchId
              ? [currentBranchId]
              : [],
        benefits: {
          serviceDiscountPercentage:
            customFormValues.serviceDiscountPercentage || 0,
          productDiscountPercentage:
            customFormValues.productDiscountPercentage || 0,
          eligibleServiceCategoryIds:
            customFormValues.eligibleServiceCategoryIds || [],
          eligibleServiceIds: customFormValues.eligibleServiceIds || [],
          excludedServiceCategoryIds:
            customFormValues.excludedServiceCategoryIds || [],
          excludedServiceIds: customFormValues.excludedServiceIds || [],
          complimentaryPerks: customFormValues.complimentaryPerks || [],
        },
        beneficiaryPolicy: {
          allowMultipleBeneficiaries:
            (customFormValues.maxBeneficiaries || 1) > 1,
          maxBeneficiaries: customFormValues.maxBeneficiaries || 1,
          payerMustBeBeneficiary: false,
          allowBeneficiaryChanges: true,
        },
        description:
          customFormValues.description ||
          `Custom membership tailored for customer #${payerCustomerId.slice(-6)}`,
        termsAndConditions:
          customFormValues.termsAndConditions ||
          "Custom salon membership agreed upon at purchase.",
      };

      await onCreateCustomPlanAndSell(customPayload, {
        payerCustomerId,
        beneficiaryCustomerIds,
        soldByStaffId: soldByStaffId || undefined,
        notes: notes || `Custom membership sold: ${customFormValues.name}`,
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Guided Membership Sale & Setup"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b pb-4 px-1">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                step === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              }`}
            >
              1
            </div>
            <div>
              <p className="text-xs font-semibold">1. Customer & Beneficiaries</p>
              <p className="text-[11px] text-muted-foreground">
                Who is paying & who will use it?
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                step === 2
                  ? "bg-primary text-primary-foreground"
                  : step > 2
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div>
              <p className="text-xs font-semibold">2. Choose or Build Plan</p>
              <p className="text-[11px] text-muted-foreground">
                Catalogue plan or custom perks
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                step === 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <div>
              <p className="text-xs font-semibold">3. Review & Checkout</p>
              <p className="text-[11px] text-muted-foreground">
                Unified bill settlement
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: Parties (Payer & Beneficiaries) */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">
                  Clear Purchaser vs. User Privilege Rules:
                </strong>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  The purchaser pays for the membership. Only customers listed as{" "}
                  <em>beneficiaries</em> receive service & product discounts.
                  If the purchaser also wishes to use the perks, add them as a
                  beneficiary below.
                </p>
              </div>
            </div>

            {/* Who is paying? */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center justify-between">
                <span>Who is purchasing this membership? (Payer / Bill Payer)</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Required
                </span>
              </label>
              <CustomerSelector
                value={payerCustomerId}
                onChange={(val, cust) => {
                  setPayerCustomerId(val);
                  if (cust) {
                    setCustomerProfiles((prev) => ({ ...prev, [val]: cust }));
                  }
                  if (val && beneficiaryCustomerIds.length === 0) {
                    setBeneficiaryCustomerIds([val]);
                  }
                }}
              />
            </div>

            {/* Who will use this membership? */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" /> Who will use the
                    membership benefits? (Beneficiaries)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Selected beneficiaries: {beneficiaryCustomerIds.length} (Max
                    allowed: {effectiveMaxBeneficiaries})
                  </p>
                </div>

                {payerCustomerId &&
                  !beneficiaryCustomerIds.includes(payerCustomerId) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddPayerAsBeneficiary}
                      disabled={
                        beneficiaryCustomerIds.length >=
                        effectiveMaxBeneficiaries
                      }
                      className="text-xs h-7 gap-1 cursor-pointer"
                    >
                      Add Payer as Beneficiary
                    </Button>
                  )}
              </div>

              {/* Add Candidate Beneficiary */}
              {beneficiaryCustomerIds.length < effectiveMaxBeneficiaries && (
                <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Add Family / Group Beneficiary:
                  </span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomerSelector
                        value={beneficiaryCandidateId}
                        onChange={(id, cust) => {
                          if (id) handleAddBeneficiary(id, cust);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficiary List Cards */}
              <div className="space-y-2 pt-1">
                {beneficiaryCustomerIds.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                    No beneficiaries designated yet. Please select at least one
                    customer who will use the membership.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {beneficiaryCustomerIds.map((bId) => {
                      const isPayer = bId === payerCustomerId;
                      const profile = customerProfiles[bId];
                      const displayName =
                        profile?.name || `Customer #${bId.slice(-6)}`;
                      const phone = profile?.phone;

                      return (
                        <div
                          key={bId}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                              {isPayer ? "P" : "B"}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold block truncate text-foreground">
                                {displayName}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {phone && <span>{phone}</span>}
                                {phone && isPayer && <span>•</span>}
                                {isPayer && (
                                  <span className="text-primary font-medium">
                                    Payer & Beneficiary
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBeneficiary(bId)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                            title="Remove Beneficiary"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Plan or Custom Builder (FIXED: P0 Single Scroll Region) */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Mode Toggle Pills */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-muted/60 rounded-lg">
              <button
                type="button"
                onClick={() => setPlanMode("catalog")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  planMode === "catalog"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-4 h-4 text-primary" /> Choose Existing
                Catalogue Plan
              </button>
              <button
                type="button"
                onClick={() => setPlanMode("custom")}
                className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  planMode === "custom"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tag className="w-4 h-4 text-emerald-600" /> Build Custom Plan
                for This Customer
              </button>
            </div>

            {/* Option A: Catalogue Plan Selection */}
            {planMode === "catalog" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Available Standard Plans:
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {plans.length} plans in catalogue
                  </span>
                </div>

                {plans.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-xs text-muted-foreground space-y-2">
                    <p>No catalogue plans available yet.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPlanMode("custom")}
                      className="text-xs"
                    >
                      Build Custom Plan Instead
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plans.map((p) => {
                      const isSelected = p.id === chosenPlanId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setChosenPlanId(p.id)}
                          className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                              : "bg-card hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge
                                variant="outline"
                                className="text-[10px] text-primary mb-1"
                              >
                                {p.tier} Tier
                              </Badge>
                              <h4 className="font-semibold text-sm leading-snug">
                                {p.name}
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Up to {p.maxBeneficiaries || 1} beneficiaries
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-bold text-foreground">
                                {formatCurrency(p.price)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                / {p.validityMonths} months
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded text-[11px]">
                            <div>
                              <span className="text-muted-foreground block">
                                Service Discount:
                              </span>
                              <strong className="text-emerald-600 font-semibold">
                                {p.benefits?.serviceDiscountPercentage || 0}% OFF
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">
                                Product Discount:
                              </span>
                              <strong className="text-emerald-600 font-semibold">
                                {p.benefits?.productDiscountPercentage || 0}% OFF
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Option B: Customer-Specific Custom Plan Builder (P0 Feature Parity + No Nested Overflow) */}
            {planMode === "custom" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md text-xs text-emerald-800 dark:text-emerald-200">
                  <strong>Full Template Parity Custom Builder:</strong> Configure
                  every commercial, benefit, branch, perk, and multi-member
                  feature for this specific customer.
                </div>

                {/* Shared Full-Feature Parity Configuration Form Fields */}
                <MembershipPlanFormFields
                  form={customPlanForm}
                  isCustomMode={true}
                />

                {/* Reusable Catalogue Opt-In */}
                <div className="pt-2 border-t">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsPermanentCatalog}
                      onChange={(e) => setSaveAsPermanentCatalog(e.target.checked)}
                      className="rounded text-primary h-4 w-4"
                    />
                    <span>
                      Save this custom plan to the reusable catalogue for future
                      sales
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Review & Checkout */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-muted/40 border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Purchase &
                Privilege Summary
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Membership Plan:
                    </span>
                    <strong className="text-sm font-semibold">
                      {planMode === "catalog"
                        ? selectedCatalogPlan?.name
                        : customFormValues.name}
                    </strong>
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] text-primary"
                    >
                      {planMode === "catalog"
                        ? selectedCatalogPlan?.tier
                        : customFormValues.tier}{" "}
                      Tier
                    </Badge>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Validity:
                    </span>
                    <span>
                      {planMode === "catalog"
                        ? `${selectedCatalogPlan?.validityMonths} months`
                        : `${customFormValues.validityDuration || 12} ${customFormValues.validityUnit || "months"}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Benefits Provided:
                    </span>
                    <div className="flex gap-2 pt-0.5">
                      <span className="font-semibold text-emerald-600">
                        {planMode === "catalog"
                          ? selectedCatalogPlan?.benefits
                              ?.serviceDiscountPercentage || 0
                          : customFormValues.serviceDiscountPercentage || 0}
                        % Services
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">
                        {planMode === "catalog"
                          ? selectedCatalogPlan?.benefits
                              ?.productDiscountPercentage || 0
                          : customFormValues.productDiscountPercentage || 0}
                        % Products
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l md:pl-4">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Payer (Bill Payer):
                    </span>
                    <strong className="font-semibold">
                      {customerProfiles[payerCustomerId]?.name ||
                        `Customer #${payerCustomerId.slice(-6)}`}
                    </strong>
                    {customerProfiles[payerCustomerId]?.phone && (
                      <span className="text-[10px] text-muted-foreground block">
                        {customerProfiles[payerCustomerId]?.phone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Designated Beneficiaries ({beneficiaryCustomerIds.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {beneficiaryCustomerIds.map((bId) => {
                        const name =
                          customerProfiles[bId]?.name ||
                          `Customer #${bId.slice(-6)}`;
                        return (
                          <Badge
                            key={bId}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {name} {bId === payerCustomerId && "(Payer)"}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-muted-foreground block text-[11px]">
                      Total Checkout Amount:
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(
                        planMode === "catalog"
                          ? selectedCatalogPlan?.price || 0
                          : customFormValues.price || 0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Attribution & Cashier Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <StaffAttributionSelect
                  label="Sold By Staff (Commission Attribution)"
                  value={soldByStaffId}
                  onChange={(val) => setSoldByStaffId(val || "")}
                  branchId={currentBranchId || undefined}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  Notes / Special Instructions
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for invoice"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200">
              <strong>Unified Checkout Settlement:</strong> Submitting creates a
              draft invoice and routes directly to the POS settlement screen.
              Membership benefits become usable immediately for any in-flight
              appointments under the pending-payment workflow.
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2)}
              className="text-xs gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(2)}
                disabled={!canProceedFromStep1}
                className="text-xs gap-1 cursor-pointer"
              >
                Next: Select Plan <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(3)}
                disabled={!canProceedFromStep2}
                className="text-xs gap-1 cursor-pointer"
              >
                Next: Review & Checkout <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                {isLoading ? "Initiating Sale..." : "Proceed to Checkout"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
