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
  ChevronDown,
  ChevronUp,
  Sliders,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type {
  MembershipPlan,
  CreateMembershipPlanPayload,
  SellMembershipCheckoutPayload,
  MembershipBenefits,
  EnrolledBeneficiaryState,
} from "../types/membership.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { getCustomer } from "@/features/customers/api/customers.api";
import {
  membershipPlanFormSchema,
  type MembershipPlanFormValues,
} from "../schemas/membership.schema";
import { MembershipPlanFormFields } from "./MembershipPlanFormFields";
import { toast } from "sonner";

interface SellMembershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SellMembershipCheckoutPayload) => Promise<void>;
  onCreateCustomPlanAndSell?: (
    customPlanPayload: CreateMembershipPlanPayload,
    checkoutData: {
      payerCustomerId: string;
      beneficiaryCustomerIds: string[];
      beneficiaries?: Array<{
        customerId: string;
        benefits?: Partial<MembershipBenefits>;
      }>;
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

  // Exactly 2 Steps:
  // Step 1: Plan and Beneficiary Configuration (The ONLY place where capacity, members, and benefits are managed)
  // Step 2: Review and Payment Only (No member additions, no capacity toggles, no duplicate inputs)
  const [step, setStep] = useState<1 | 2>(1);

  // Plan Mode: "catalog" (existing plan) vs "custom" (build custom plan for customer)
  const [planMode, setPlanMode] = useState<"catalog" | "custom">("catalog");
  const [chosenPlanId, setChosenPlanId] = useState<string>(selectedPlanId || "");

  // Purchaser / Bill Payer ID
  const [payerCustomerId, setPayerCustomerId] = useState<string>(
    initialCustomerId || "",
  );

  // Custom Plan Builder Form (using shared MembershipPlanFormFields for full parity)
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
      maxBeneficiaries: 1, // Default is exactly ONE
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

  // CANONICAL SINGLE SOURCE OF TRUTH for Enrolled Beneficiaries
  const [enrolledBeneficiaries, setEnrolledBeneficiaries] = useState<
    EnrolledBeneficiaryState[]
  >([]);

  // Expandable inline per-beneficiary editor & tag inputs
  const [expandedBeneficiaryId, setExpandedBeneficiaryId] = useState<
    string | null
  >(null);
  const [newPerkInputs, setNewPerkInputs] = useState<Record<string, string>>({});

  // Candidate member selector state
  const [candidateMemberId, setCandidateMemberId] = useState<string>("");

  // Customer profile cache for human-friendly names and phones
  const [customerProfiles, setCustomerProfiles] = useState<
    Record<string, Customer>
  >({});

  // Review step metadata: Staff Attribution & Notes
  const [soldByStaffId, setSoldByStaffId] = useState("");
  const [notes, setNotes] = useState("");

  // Selected catalog plan object
  const selectedCatalogPlan = useMemo(
    () => plans.find((p) => p.id === chosenPlanId) || plans[0] || null,
    [plans, chosenPlanId],
  );

  const customFormValues = customPlanForm.watch();

  // Effective plan maximum allowed beneficiaries
  const maxBeneficiaries = useMemo(() => {
    if (planMode === "catalog") {
      return selectedCatalogPlan?.maxBeneficiaries || 1;
    }
    return customFormValues.maxBeneficiaries || 1;
  }, [planMode, selectedCatalogPlan, customFormValues.maxBeneficiaries]);

  // Plan baseline benefits
  const planDefaultBenefits: MembershipBenefits = useMemo(() => {
    if (planMode === "catalog") {
      return (
        selectedCatalogPlan?.benefits || {
          serviceDiscountPercentage: 0,
          productDiscountPercentage: 0,
          complimentaryPerks: [],
        }
      );
    }
    return {
      serviceDiscountPercentage: customFormValues.serviceDiscountPercentage || 0,
      productDiscountPercentage: customFormValues.productDiscountPercentage || 0,
      complimentaryPerks: customFormValues.complimentaryPerks || [],
      eligibleServiceCategoryIds: customFormValues.eligibleServiceCategoryIds || [],
      eligibleServiceIds: customFormValues.eligibleServiceIds || [],
      excludedServiceCategoryIds: customFormValues.excludedServiceCategoryIds || [],
      excludedServiceIds: customFormValues.excludedServiceIds || [],
    };
  }, [planMode, selectedCatalogPlan, customFormValues]);

  // Reset or initialize state on dialog open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      const initialPayer = initialCustomerId || "";
      setPayerCustomerId(initialPayer);
      setChosenPlanId(selectedPlanId || (plans[0]?.id ?? ""));
      setPlanMode("catalog");
      setSaveAsPermanentCatalog(false);
      setSoldByStaffId("");
      setNotes("");
      setCandidateMemberId("");
      setExpandedBeneficiaryId(null);
      setNewPerkInputs({});

      // Initialize canonical beneficiaries: Purchaser as primary member if present
      if (initialPayer) {
        setEnrolledBeneficiaries([
          {
            customerId: initialPayer,
            isPrimary: true,
            isCustomized: false,
          },
        ]);
        getCustomer(initialPayer)
          .then((cust) => {
            if (cust) {
              setCustomerProfiles((prev) => ({ ...prev, [cust.id]: cust }));
            }
          })
          .catch(() => {});
      } else {
        setEnrolledBeneficiaries([]);
      }

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
        maxBeneficiaries: 1,
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
    }
  }, [isOpen, initialCustomerId, selectedPlanId, plans, currentBranchId, customPlanForm]);

  // When Payer Customer Changes, update or set primary beneficiary
  const handlePayerChange = (newPayerId: string, customer?: Customer) => {
    setPayerCustomerId(newPayerId);
    if (customer) {
      setCustomerProfiles((prev) => ({ ...prev, [newPayerId]: customer }));
    }
    if (!newPayerId) return;

    setEnrolledBeneficiaries((prev) => {
      // If empty, set payer as primary
      if (prev.length === 0) {
        return [{ customerId: newPayerId, isPrimary: true, isCustomized: false }];
      }
      // If payer already enrolled, mark them primary
      const existsIndex = prev.findIndex((b) => b.customerId === newPayerId);
      if (existsIndex >= 0) {
        return prev.map((b, idx) => ({
          ...b,
          isPrimary: idx === existsIndex,
        }));
      }
      // Replace the first slot if it was the old primary, or if only 1 member allowed
      if (maxBeneficiaries === 1 || prev[0]?.isPrimary) {
        const remaining = prev.slice(1);
        return [{ customerId: newPayerId, isPrimary: true, isCustomized: false }, ...remaining];
      }
      return prev;
    });
  };

  // Add Member Action (Enforces capacity and duplicate protection)
  const handleAddMember = (customerId: string, customer?: Customer) => {
    if (!customerId) return;
    if (customer) {
      setCustomerProfiles((prev) => ({ ...prev, [customerId]: customer }));
    }

    if (enrolledBeneficiaries.some((b) => b.customerId === customerId)) {
      toast.warning("This customer is already enrolled as a member.");
      setCandidateMemberId("");
      return;
    }

    if (enrolledBeneficiaries.length >= maxBeneficiaries) {
      toast.error(
        `Plan capacity reached (${maxBeneficiaries} maximum member${maxBeneficiaries > 1 ? "s" : ""}). Upgrade or adjust the plan limit to add more members.`,
      );
      setCandidateMemberId("");
      return;
    }

    const isFirst = enrolledBeneficiaries.length === 0;
    setEnrolledBeneficiaries((prev) => [
      ...prev,
      {
        customerId,
        isPrimary: isFirst || customerId === payerCustomerId,
        isCustomized: false,
      },
    ]);
    setCandidateMemberId("");
  };

  // Remove Member Action
  const handleRemoveMember = (customerId: string) => {
    setEnrolledBeneficiaries((prev) => {
      const filtered = prev.filter((b) => b.customerId !== customerId);
      // If we removed the primary member, promote the first remaining member
      if (filtered.length > 0 && !filtered.some((b) => b.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });

    if (expandedBeneficiaryId === customerId) {
      setExpandedBeneficiaryId(null);
    }
  };

  // Update Individual Beneficiary Benefit Overrides
  const handleUpdateBeneficiaryBenefits = (
    customerId: string,
    updatedBenefits: Partial<MembershipBenefits>,
  ) => {
    setEnrolledBeneficiaries((prev) =>
      prev.map((b) => {
        if (b.customerId !== customerId) return b;
        return {
          ...b,
          isCustomized: true,
          benefits: {
            ...b.benefits,
            ...updatedBenefits,
          },
        };
      }),
    );
  };

  // Reset Individual Beneficiary Benefits to Plan Defaults
  const handleResetBeneficiaryBenefits = (customerId: string) => {
    setEnrolledBeneficiaries((prev) =>
      prev.map((b) => {
        if (b.customerId !== customerId) return b;
        return {
          ...b,
          isCustomized: false,
          benefits: undefined,
        };
      }),
    );
  };

  // Resolve Effective Benefits for a specific member
  const getMemberEffectiveBenefits = (member: EnrolledBeneficiaryState) => {
    if (member.isCustomized && member.benefits) {
      return {
        serviceDiscountPercentage:
          member.benefits.serviceDiscountPercentage !== undefined
            ? member.benefits.serviceDiscountPercentage
            : planDefaultBenefits.serviceDiscountPercentage,
        productDiscountPercentage:
          member.benefits.productDiscountPercentage !== undefined
            ? member.benefits.productDiscountPercentage
            : planDefaultBenefits.productDiscountPercentage,
        complimentaryPerks:
          member.benefits.complimentaryPerks !== undefined
            ? member.benefits.complimentaryPerks
            : planDefaultBenefits.complimentaryPerks,
        isOverridden: true,
      };
    }
    return {
      serviceDiscountPercentage: planDefaultBenefits.serviceDiscountPercentage,
      productDiscountPercentage: planDefaultBenefits.productDiscountPercentage,
      complimentaryPerks: planDefaultBenefits.complimentaryPerks,
      isOverridden: false,
    };
  };

  // Capacity validation check
  const isOverCapacity = enrolledBeneficiaries.length > maxBeneficiaries;
  const isUnderEnrolled = enrolledBeneficiaries.length === 0;

  // Step 1 Validation
  const canProceedToReview = Boolean(
    payerCustomerId &&
      !isUnderEnrolled &&
      !isOverCapacity &&
      (planMode === "catalog"
        ? chosenPlanId
        : customFormValues.name?.trim() && customFormValues.price >= 0),
  );

  // Construct Final Checkout Payload
  const handleFinalCheckout = async () => {
    if (!payerCustomerId) {
      toast.error("Please specify who is paying for the membership.");
      return;
    }
    if (enrolledBeneficiaries.length === 0) {
      toast.error("Please enroll at least one beneficiary member.");
      return;
    }
    if (enrolledBeneficiaries.length > maxBeneficiaries) {
      toast.error(
        `Enrolled members (${enrolledBeneficiaries.length}) exceed plan maximum capacity (${maxBeneficiaries}).`,
      );
      return;
    }

    // Build canonical beneficiary overrides payload
    const beneficiariesPayload = enrolledBeneficiaries.map((b) => {
      if (b.isCustomized && b.benefits) {
        return {
          customerId: b.customerId,
          benefits: {
            serviceDiscountPercentage:
              b.benefits.serviceDiscountPercentage ??
              planDefaultBenefits.serviceDiscountPercentage,
            productDiscountPercentage:
              b.benefits.productDiscountPercentage ??
              planDefaultBenefits.productDiscountPercentage,
            complimentaryPerks:
              b.benefits.complimentaryPerks ??
              planDefaultBenefits.complimentaryPerks,
          },
        };
      }
      return { customerId: b.customerId };
    });

    const beneficiaryCustomerIds = enrolledBeneficiaries.map((b) => b.customerId);

    if (planMode === "catalog") {
      if (!chosenPlanId) {
        toast.error("Please select a valid membership plan.");
        return;
      }
      await onSubmit({
        membershipPlanId: chosenPlanId,
        payerCustomerId,
        beneficiaryCustomerIds,
        beneficiaries: beneficiariesPayload,
        soldByStaffId: soldByStaffId || undefined,
        notes: notes || "Membership Sale",
      });
    } else {
      if (!onCreateCustomPlanAndSell) {
        toast.error("Custom plan creation is not supported in this context.");
        return;
      }

      let validityMonths = customFormValues.validityDuration || 12;
      if (customFormValues.validityUnit === "years") {
        validityMonths = (customFormValues.validityDuration || 1) * 12;
      } else if (customFormValues.validityUnit === "days") {
        validityMonths = Math.max(
          1,
          Math.round((customFormValues.validityDuration || 30) / 30),
        );
      }

      const customPayload: CreateMembershipPlanPayload = {
        name: customFormValues.name.trim(),
        code: customFormValues.code || null,
        tier: customFormValues.tier,
        price: customFormValues.price,
        validityMonths,
        validityDuration: customFormValues.validityDuration || validityMonths,
        validityUnit: customFormValues.validityUnit || "months",
        maxBeneficiaries: customFormValues.maxBeneficiaries || 1,
        isCustom: !saveAsPermanentCatalog,
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
        beneficiaries: beneficiariesPayload,
        soldByStaffId: soldByStaffId || undefined,
        notes: notes || `Custom membership sold: ${customFormValues.name}`,
      });
    }
  };

  const planDisplayName =
    planMode === "catalog"
      ? selectedCatalogPlan?.name || "Select a Plan"
      : customFormValues.name || "Custom Plan";

  const planPrice =
    planMode === "catalog"
      ? selectedCatalogPlan?.price || 0
      : customFormValues.price || 0;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Guided Membership Sale & Setup"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step Indicator Header: Exactly 2 Steps */}
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
              <p className="text-xs font-semibold">1. Plan & Beneficiaries</p>
              <p className="text-[11px] text-muted-foreground">
                Plan selection, members ({enrolledBeneficiaries.length} of {maxBeneficiaries}) & tailored perks
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                step === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div>
              <p className="text-xs font-semibold">2. Review & Payment</p>
              <p className="text-[11px] text-muted-foreground">
                Summary, staff attribution & checkout
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: PLAN SELECTION, BENEFICIARY ENROLLMENT & BENEFIT CONFIGURATION    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* 1.1 Mode Selection: Catalogue Plan vs Custom Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Select or Build Plan
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Configures plan rules & capacity once
                </span>
              </div>

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
                  <Sparkles className="w-4 h-4 text-primary" /> Existing Catalogue Plan
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
                  <Tag className="w-4 h-4 text-emerald-600" /> Build Custom Plan for Customer
                </button>
              </div>

              {/* Mode A: Select Catalogue Plan Grid */}
              {planMode === "catalog" && (
                <div className="space-y-3 pt-1">
                  {plans.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                      No catalogue plans available. Switch to &quot;Build Custom Plan&quot; to configure perks.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border rounded-lg bg-muted/20">
                      {plans.map((p) => {
                        const isSelected = p.id === chosenPlanId;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setChosenPlanId(p.id)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                                : "border-border bg-card hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold truncate text-foreground">
                                {p.name}
                              </span>
                              <Badge variant="outline" className="text-[9px]">
                                {p.tier}
                              </Badge>
                            </div>
                            <div className="flex items-baseline justify-between mt-1.5 text-muted-foreground">
                              <span className="font-bold text-foreground text-sm">
                                {formatCurrency(p.price)}
                              </span>
                              <span className="text-[10px]">
                                {p.validityMonths} mo • Max {p.maxBeneficiaries || 1} {p.maxBeneficiaries === 1 ? "member" : "members"}
                              </span>
                            </div>
                            <div className="mt-1 text-[10px] text-emerald-600 font-medium">
                              {p.benefits?.serviceDiscountPercentage || 0}% Svcs / {p.benefits?.productDiscountPercentage || 0}% Prods
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Custom Plan Builder Form */}
              {planMode === "custom" && (
                <div className="p-4 border rounded-lg bg-muted/10 space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded text-xs text-emerald-800 dark:text-emerald-200">
                    <strong>Custom Membership Builder:</strong> Configure plan capacity, price, and default benefits once below.
                  </div>
                  <MembershipPlanFormFields form={customPlanForm} isCustomMode={true} />
                  <div className="pt-2 border-t">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAsPermanentCatalog}
                        onChange={(e) => setSaveAsPermanentCatalog(e.target.checked)}
                        className="rounded text-primary h-4 w-4"
                      />
                      <span>Save this custom plan to the reusable catalogue for future sales</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 1.2 Purchaser (Bill Payer) Selection */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold flex items-center justify-between">
                <span>1. Who is purchasing this membership? (Payer / Bill Payer)</span>
                <span className="text-[11px] font-normal text-muted-foreground">Required</span>
              </label>
              <CustomerSelector
                value={payerCustomerId}
                onChange={handlePayerChange}
              />
            </div>

            {/* 1.3 Beneficiary Members Management & Capacity Tracker */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" /> 2. Enrolled Beneficiaries ({enrolledBeneficiaries.length} of {maxBeneficiaries} added)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Only enrolled members receive membership discounts. Capacity is governed by the selected plan ({maxBeneficiaries} max).
                  </p>
                </div>

                {/* Status indicator badge */}
                <div className="flex items-center gap-2">
                  {enrolledBeneficiaries.length < maxBeneficiaries ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                      {maxBeneficiaries - enrolledBeneficiaries.length} slot{maxBeneficiaries - enrolledBeneficiaries.length > 1 ? "s" : ""} remaining
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-amber-700 bg-amber-500/10 text-[10px]">
                      Capacity Reached ({maxBeneficiaries}/{maxBeneficiaries})
                    </Badge>
                  )}
                </div>
              </div>

              {/* Over-capacity warning if user switched to a lower-capacity plan */}
              {isOverCapacity && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Capacity Exceeded:</strong> Selected plan permits a maximum of {maxBeneficiaries} member{maxBeneficiaries > 1 ? "s" : ""}, but {enrolledBeneficiaries.length} are currently enrolled. Please remove excess members before proceeding.
                  </span>
                </div>
              )}

              {/* Add Member Control (Single Obvious Action) */}
              {enrolledBeneficiaries.length < maxBeneficiaries ? (
                <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
                  <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-primary" /> Add Member to Membership:
                  </span>
                  <CustomerSelector
                    value={candidateMemberId}
                    onChange={(id, cust) => {
                      if (id) handleAddMember(id, cust);
                    }}
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-muted/40 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                  Maximum member limit of {maxBeneficiaries} reached. To add another member, increase plan capacity or remove an enrolled member.
                </div>
              )}

              {/* Enrolled Beneficiary Member Cards */}
              <div className="space-y-2 pt-1">
                {enrolledBeneficiaries.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                    No beneficiary members enrolled yet. Please select or add the member who will enjoy these benefits.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {enrolledBeneficiaries.map((member, idx) => {
                      const profile = customerProfiles[member.customerId];
                      const displayName =
                        profile?.name || `Customer #${member.customerId.slice(-6)}`;
                      const phone = profile?.phone;
                      const isPayer = member.customerId === payerCustomerId;
                      const isExpanded = expandedBeneficiaryId === member.customerId;
                      const effective = getMemberEffectiveBenefits(member);

                      return (
                        <div
                          key={member.customerId}
                          className="rounded-lg border bg-card text-xs shadow-2xs overflow-hidden transition-all"
                        >
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                {member.isPrimary ? "P" : idx + 1}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold block truncate text-foreground">
                                    {displayName}
                                  </span>
                                  {member.isPrimary && (
                                    <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                                      Primary Member
                                    </Badge>
                                  )}
                                  {isPayer && (
                                    <Badge variant="secondary" className="text-[9px]">
                                      Purchaser
                                    </Badge>
                                  )}
                                  {effective.isOverridden ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium"
                                    >
                                      Customized Perks
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] text-muted-foreground"
                                    >
                                      Plan Default Perks
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                  {phone && <span>{phone}</span>}
                                  {phone && <span>•</span>}
                                  <span className="text-emerald-600 font-semibold">
                                    {effective.serviceDiscountPercentage}% Svcs / {effective.productDiscountPercentage}% Prods
                                  </span>
                                  {effective.complimentaryPerks.length > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{effective.complimentaryPerks.length} perk{effective.complimentaryPerks.length > 1 ? "s" : ""}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setExpandedBeneficiaryId(
                                    isExpanded ? null : member.customerId,
                                  )
                                }
                                className={`h-7 px-2 text-[11px] gap-1 cursor-pointer font-medium ${
                                  isExpanded
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Sliders className="w-3 h-3" />
                                {isExpanded ? "Close Editor" : "Tailor Perks"}
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.customerId)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Expandable Per-Beneficiary Benefit Editor */}
                          {isExpanded && (
                            <div className="p-3.5 bg-muted/20 border-t space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  Individual Benefit Privileges for {displayName}
                                </span>
                                {member.isCustomized && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetBeneficiaryBenefits(member.customerId)}
                                    className="h-6 text-[10px] text-muted-foreground hover:text-primary gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reset to Plan Defaults
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                    Service Discount (%)
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      member.benefits?.serviceDiscountPercentage ??
                                      planDefaultBenefits.serviceDiscountPercentage
                                    }
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      handleUpdateBeneficiaryBenefits(member.customerId, {
                                        serviceDiscountPercentage: isNaN(val)
                                          ? 0
                                          : Math.min(100, Math.max(0, val)),
                                      });
                                    }}
                                    className="text-xs h-8"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                    Product Discount (%)
                                  </label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      member.benefits?.productDiscountPercentage ??
                                      planDefaultBenefits.productDiscountPercentage
                                    }
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      handleUpdateBeneficiaryBenefits(member.customerId, {
                                        productDiscountPercentage: isNaN(val)
                                          ? 0
                                          : Math.min(100, Math.max(0, val)),
                                      });
                                    }}
                                    className="text-xs h-8"
                                  />
                                </div>
                              </div>

                              {/* Complimentary Perks for this individual member */}
                              <div className="space-y-1.5 pt-1">
                                <label className="text-[10px] font-semibold text-muted-foreground block">
                                  Member Perks & Privileges
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {effective.complimentaryPerks.map((perk, pIdx) => (
                                    <span
                                      key={`${perk}-${pIdx}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border"
                                    >
                                      {perk}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = effective.complimentaryPerks.filter(
                                            (_, idx) => idx !== pIdx,
                                          );
                                          handleUpdateBeneficiaryBenefits(member.customerId, {
                                            complimentaryPerks: updated,
                                          });
                                        }}
                                        className="text-muted-foreground hover:text-destructive cursor-pointer ml-0.5"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                <div className="flex gap-1.5 pt-1">
                                  <Input
                                    placeholder="Add perk (e.g., Free Hair Wash, VIP Beverage)"
                                    value={newPerkInputs[member.customerId] || ""}
                                    onChange={(e) =>
                                      setNewPerkInputs((prev) => ({
                                        ...prev,
                                        [member.customerId]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const perkText = (
                                          newPerkInputs[member.customerId] || ""
                                        ).trim();
                                        if (perkText) {
                                          handleUpdateBeneficiaryBenefits(member.customerId, {
                                            complimentaryPerks: [
                                              ...effective.complimentaryPerks,
                                              perkText,
                                            ],
                                          });
                                          setNewPerkInputs((prev) => ({
                                            ...prev,
                                            [member.customerId]: "",
                                          }));
                                        }
                                      }
                                    }}
                                    className="text-xs h-7.5"
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      const perkText = (
                                        newPerkInputs[member.customerId] || ""
                                      ).trim();
                                      if (perkText) {
                                        handleUpdateBeneficiaryBenefits(member.customerId, {
                                          complimentaryPerks: [
                                            ...effective.complimentaryPerks,
                                            perkText,
                                          ],
                                        });
                                        setNewPerkInputs((prev) => ({
                                          ...prev,
                                          [member.customerId]: "",
                                        }));
                                      }
                                    }}
                                    className="text-xs h-7.5 px-2 gap-1 cursor-pointer shrink-0"
                                  >
                                    <Plus className="w-3 h-3" /> Add Perk
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: REVIEW & PAYMENT ONLY (NO DUPLICATE CAPACITY OR MEMBER ENTRY)    */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Review Header Banner */}
            <div className="bg-muted/40 border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-xs text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Subscription Review & Privilege Summary
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Left Column: Plan Specifications */}
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Selected Plan:</span>
                    <strong className="text-sm font-semibold">{planDisplayName}</strong>
                    <Badge variant="outline" className="ml-2 text-[10px] text-primary">
                      {planMode === "catalog"
                        ? selectedCatalogPlan?.tier || "Standard"
                        : customFormValues.tier}{" "}
                      Tier
                    </Badge>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Validity:</span>
                    <span>
                      {planMode === "catalog"
                        ? `${selectedCatalogPlan?.validityMonths || 12} months`
                        : `${customFormValues.validityDuration || 12} ${customFormValues.validityUnit || "months"}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Capacity & Enrollment:</span>
                    <span className="font-semibold text-foreground">
                      {enrolledBeneficiaries.length} of {maxBeneficiaries} member slots enrolled
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Base Plan Discounts:</span>
                    <div className="flex gap-2 pt-0.5">
                      <span className="font-semibold text-emerald-600">
                        {planDefaultBenefits.serviceDiscountPercentage}% Services
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">
                        {planDefaultBenefits.productDiscountPercentage}% Products
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Financial & Purchaser Breakdown */}
                <div className="space-y-2 border-t md:border-t-0 md:border-l md:pl-4">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Purchaser (Bill Payer):</span>
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

                  <div className="pt-2">
                    <span className="text-muted-foreground block text-[11px]">Total Subscription Payable:</span>
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(planPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Beneficiaries Breakdown in Step 2 (Read-Only Display) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Enrolled Beneficiary Privileges ({enrolledBeneficiaries.length}):
              </span>

              <div className="space-y-1.5">
                {enrolledBeneficiaries.map((member, idx) => {
                  const profile = customerProfiles[member.customerId];
                  const displayName =
                    profile?.name || `Customer #${member.customerId.slice(-6)}`;
                  const effective = getMemberEffectiveBenefits(member);

                  return (
                    <div
                      key={member.customerId}
                      className="p-2.5 bg-card border rounded-lg text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {member.isPrimary ? "P" : idx + 1}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {displayName}
                            </span>
                            {member.isPrimary && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 text-primary border-primary/30">
                                Primary
                              </Badge>
                            )}
                            {effective.isOverridden && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 py-0 px-1 font-medium"
                              >
                                Tailored Perks
                              </Badge>
                            )}
                          </div>
                          {profile?.phone && (
                            <span className="text-[10px] text-muted-foreground block">
                              {profile.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-emerald-600 font-semibold block text-xs">
                          {effective.serviceDiscountPercentage}% Svcs / {effective.productDiscountPercentage}% Prods
                        </span>
                        {effective.complimentaryPerks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {effective.complimentaryPerks.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff Attribution & Cashier Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <StaffAttributionSelect
                  label="Sold By Staff (Commission Attribution)"
                  value={soldByStaffId}
                  onChange={(val) => setSoldByStaffId(val || "")}
                  branchId={currentBranchId || undefined}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Notes / Special Instructions</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for invoice"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs flex items-start gap-2 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong>Unified Bill Settlement:</strong> Proceeding creates a draft invoice and opens POS settlement. Membership perks activate immediately across salon appointments under the pending-payment lifecycle.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL ACTION FOOTER (PRESERVES STATE ON BACK/NEXT)                        */}
        {/* ========================================================================= */}
        <div className="flex justify-between items-center pt-4 border-t">
          {step === 2 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Edit Members
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
                disabled={!canProceedToReview}
                className="text-xs gap-1 cursor-pointer"
              >
                Next: Review & Payment <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                onClick={handleFinalCheckout}
                disabled={isLoading}
                className="text-xs gap-1.5 shadow-sm cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                {isLoading ? "Initiating Sale..." : "Proceed to Payment"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
