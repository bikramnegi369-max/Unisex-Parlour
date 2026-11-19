"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { StaffAttributionSelect } from "@/features/employees/components/StaffAttributionSelect";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { formatCurrency } from "@/lib/formatters";
import {
  CreditCard,
  Users,
  Sparkles,
  Percent,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  Tag,
  ShieldCheck,
  UserCheck,
  Package,
} from "lucide-react";
import type { MembershipPlan, CreateMembershipPlanPayload } from "../types/membership.types";
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
  const { currentBranchId, isAllBranchesSelected } = useBranchContext();
  const { data: serviceCategoriesData } = useServiceCategories();
  const serviceCategories = serviceCategoriesData?.data || [];
  const { branches: allBranches = [] } = useBranches();

  // Multi-step journey state: 1 = Who (Payer & Beneficiaries), 2 = Plan or Custom Builder, 3 = Review & Checkout
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Parties
  const [payerCustomerId, setPayerCustomerId] = useState<string>(initialCustomerId || "");
  const [beneficiaryCustomerIds, setBeneficiaryCustomerIds] = useState<string[]>(
    initialCustomerId ? [initialCustomerId] : [],
  );
  const [beneficiaryCandidateId, setBeneficiaryCandidateId] = useState<string>("");

  // Step 2: Mode selection ("catalog" vs "custom")
  const [planMode, setPlanMode] = useState<"catalog" | "custom">("catalog");
  const [chosenPlanId, setChosenPlanId] = useState<string>(selectedPlanId || "");

  // Custom Plan Builder State
  const [customPlanName, setCustomPlanName] = useState("");
  const [customTier, setCustomTier] = useState("Custom VIP");
  const [customPrice, setCustomPrice] = useState<number>(3000);
  const [customValidityDuration, setCustomValidityDuration] = useState<number>(12);
  const [customValidityUnit, setCustomValidityUnit] = useState<"days" | "months" | "years">("months");
  const [customMaxBeneficiaries, setCustomMaxBeneficiaries] = useState<number>(2);
  const [customServiceDiscount, setCustomServiceDiscount] = useState<number>(20);
  const [customProductDiscount, setCustomProductDiscount] = useState<number>(10);
  const [customSelectedCategoryIds, setCustomSelectedCategoryIds] = useState<string[]>([]);
  const [customComplimentaryPerks, setCustomComplimentaryPerks] = useState<string[]>([]);
  const [newPerkInput, setNewPerkInput] = useState("");
  const [saveAsPermanentCatalog, setSaveAsPermanentCatalog] = useState(false);

  // Step 3: Staff & Notes
  const [soldByStaffId, setSoldByStaffId] = useState("");
  const [notes, setNotes] = useState("");

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPayerCustomerId(initialCustomerId || "");
      setBeneficiaryCustomerIds(initialCustomerId ? [initialCustomerId] : []);
      setChosenPlanId(selectedPlanId || (plans[0]?.id ?? ""));
      setPlanMode("catalog");
      setSaveAsPermanentCatalog(false);
      setCustomPlanName(initialCustomerId ? "Customer Custom VIP Plan" : "Tailored Membership");
      setCustomSelectedCategoryIds([]);
      setCustomComplimentaryPerks(["Priority Booking"]);
      setSoldByStaffId("");
      setNotes("");
    }
  }, [isOpen, initialCustomerId, selectedPlanId, plans]);

  const selectedCatalogPlan = useMemo(
    () => plans.find((p) => p.id === chosenPlanId),
    [plans, chosenPlanId],
  );

  // Maximum allowed beneficiaries in current setup
  const effectiveMaxBeneficiaries = useMemo(() => {
    if (planMode === "catalog") {
      return selectedCatalogPlan?.maxBeneficiaries || 1;
    }
    return customMaxBeneficiaries || 1;
  }, [planMode, selectedCatalogPlan, customMaxBeneficiaries]);

  // Handle adding payer to beneficiary list
  const handleAddPayerAsBeneficiary = () => {
    if (!payerCustomerId) return;
    if (beneficiaryCustomerIds.includes(payerCustomerId)) return;
    if (beneficiaryCustomerIds.length >= effectiveMaxBeneficiaries) {
      toast.warning(`Maximum ${effectiveMaxBeneficiaries} beneficiaries allowed for this plan.`);
      return;
    }
    setBeneficiaryCustomerIds((prev) => [...prev, payerCustomerId]);
  };

  // Handle adding an additional beneficiary
  const handleAddBeneficiary = (customerId: string) => {
    if (!customerId) return;
    if (beneficiaryCustomerIds.includes(customerId)) {
      toast.warning("This customer is already added as a beneficiary.");
      return;
    }
    if (beneficiaryCustomerIds.length >= effectiveMaxBeneficiaries) {
      toast.warning(`Maximum ${effectiveMaxBeneficiaries} beneficiaries reached.`);
      return;
    }
    setBeneficiaryCustomerIds((prev) => [...prev, customerId]);
    setBeneficiaryCandidateId("");
  };

  const handleRemoveBeneficiary = (customerId: string) => {
    setBeneficiaryCustomerIds((prev) => prev.filter((id) => id !== customerId));
  };

  // Complimentary perk helpers
  const handleAddPerk = () => {
    if (!newPerkInput.trim()) return;
    setCustomComplimentaryPerks((prev) => [...prev, newPerkInput.trim()]);
    setNewPerkInput("");
  };

  const handleRemovePerk = (index: number) => {
    setCustomComplimentaryPerks((prev) => prev.filter((_, i) => i !== index));
  };

  // Category toggle
  const toggleCategorySelection = (catId: string) => {
    setCustomSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  // Step 1 Validation
  const canProceedFromStep1 = Boolean(
    payerCustomerId && beneficiaryCustomerIds.length > 0 && beneficiaryCustomerIds.length <= effectiveMaxBeneficiaries,
  );

  // Step 2 Validation
  const canProceedFromStep2 = Boolean(
    planMode === "catalog"
      ? chosenPlanId && selectedCatalogPlan
      : customPlanName.trim() && customPrice >= 0 && customValidityDuration > 0,
  );

  // Submit Final Sale
  const handleFinalSubmit = async () => {
    if (!payerCustomerId) {
      toast.error("Please specify who is paying for the membership.");
      return;
    }
    if (beneficiaryCustomerIds.length === 0) {
      toast.error("Please add at least one beneficiary who will use this membership.");
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
      // Custom Plan Flow
      if (!onCreateCustomPlanAndSell) {
        toast.error("Custom plan creation is not supported in this view.");
        return;
      }

      // Convert validity duration to months for backward compatibility
      let validityMonths = customValidityDuration;
      if (customValidityUnit === "years") validityMonths = customValidityDuration * 12;
      if (customValidityUnit === "days") validityMonths = Math.max(1, Math.round(customValidityDuration / 30));

      const customPayload: CreateMembershipPlanPayload = {
        name: customPlanName.trim(),
        tier: customTier,
        price: customPrice,
        validityMonths,
        validityDuration: customValidityDuration,
        validityUnit: customValidityUnit,
        maxBeneficiaries: customMaxBeneficiaries,
        isCustom: !saveAsPermanentCatalog, // Flag as custom unless user explicitly checked "Save to Reusable Catalogue"
        permittedBranchIds: currentBranchId ? [currentBranchId] : [],
        benefits: {
          serviceDiscountPercentage: customServiceDiscount,
          productDiscountPercentage: customProductDiscount,
          eligibleServiceCategoryIds: customSelectedCategoryIds,
          complimentaryPerks: customComplimentaryPerks,
        },
        beneficiaryPolicy: {
          allowMultipleBeneficiaries: customMaxBeneficiaries > 1,
          maxBeneficiaries: customMaxBeneficiaries,
          payerMustBeBeneficiary: false,
          allowBeneficiaryChanges: true,
        },
        description: `Customer-specific plan customized for customer ${payerCustomerId.slice(-4)}`,
        termsAndConditions: "Custom salon membership agreed upon at purchase.",
      };

      await onCreateCustomPlanAndSell(customPayload, {
        payerCustomerId,
        beneficiaryCustomerIds,
        soldByStaffId: soldByStaffId || undefined,
        notes: notes || `Custom membership sold: ${customPlanName}`,
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
              <p className="text-[11px] text-muted-foreground">Who is paying & who will use it?</p>
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
              <p className="text-[11px] text-muted-foreground">Catalog plan or custom perks</p>
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
              <p className="text-[11px] text-muted-foreground">Unified bill settlement</p>
            </div>
          </div>
        </div>

        {/* STEP 1: Parties (Payer & Beneficiaries) */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Clear Purchaser vs. User Privilege Rules:</strong>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  The purchaser pays for the membership. Only customers listed as <em>beneficiaries</em> receive service & product discounts.
                  If the purchaser also wishes to use the perks, add them as a beneficiary below.
                </p>
              </div>
            </div>

            {/* Who is paying? */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center justify-between">
                <span>Who is purchasing this membership? (Payer / Bill Payer)</span>
                <span className="text-[11px] font-normal text-muted-foreground">Required</span>
              </label>
              <CustomerSelector
                value={payerCustomerId}
                onChange={(val) => {
                  setPayerCustomerId(val);
                  // Default payer into beneficiary list if empty
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
                    <Users className="w-3.5 h-3.5 text-primary" /> Who will use the membership benefits? (Beneficiaries)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Selected beneficiaries: {beneficiaryCustomerIds.length} (Max allowed: {effectiveMaxBeneficiaries})
                  </p>
                </div>

                {payerCustomerId && !beneficiaryCustomerIds.includes(payerCustomerId) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPayerAsBeneficiary}
                    disabled={beneficiaryCustomerIds.length >= effectiveMaxBeneficiaries}
                    className="text-xs h-7 gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Payer as Beneficiary
                  </Button>
                )}
              </div>

              {/* Add Candidate Beneficiary */}
              {beneficiaryCustomerIds.length < effectiveMaxBeneficiaries && (
                <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Add Family / Group Beneficiary:</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomerSelector
                        value={beneficiaryCandidateId}
                        onChange={(id) => {
                          if (id) handleAddBeneficiary(id);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Beneficiary List Chips */}
              <div className="space-y-2 pt-1">
                {beneficiaryCustomerIds.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                    No beneficiaries designated yet. Please select at least one customer who will use the membership.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {beneficiaryCustomerIds.map((bId) => {
                      const isPayer = bId === payerCustomerId;
                      return (
                        <div
                          key={bId}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {isPayer ? "P" : "B"}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold block truncate">Customer #{bId.slice(-6)}</span>
                              {isPayer && (
                                <span className="text-[10px] text-primary font-medium">Payer & Beneficiary</span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBeneficiary(bId)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
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

        {/* STEP 2: Choose Plan or Custom Builder */}
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
                <Sparkles className="w-4 h-4 text-primary" /> Choose Existing Catalog Plan
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
                <Tag className="w-4 h-4 text-emerald-600" /> Build Custom Plan for This Customer
              </button>
            </div>

            {/* Option A: Catalogue Plan Selection */}
            {planMode === "catalog" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Available Standard Plans:</span>
                  <span className="text-xs text-muted-foreground">{plans.length} plans in catalog</span>
                </div>

                {plans.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-xs text-muted-foreground space-y-2">
                    <p>No catalog plans available yet.</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
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
                              <Badge variant="outline" className="text-[10px] text-primary mb-1">
                                {p.tier} Tier
                              </Badge>
                              <h4 className="font-semibold text-sm leading-snug">{p.name}</h4>
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
                              <span className="text-muted-foreground block">Service Discount:</span>
                              <strong className="text-emerald-600 font-semibold">
                                {p.benefits?.serviceDiscountPercentage || 0}% OFF
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Product Discount:</span>
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

            {/* Option B: Customer-Specific Custom Membership Builder */}
            {planMode === "custom" && (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1.5 border rounded-lg p-4 bg-muted/10">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-md text-xs text-emerald-800 dark:text-emerald-200">
                  <strong>Custom Membership Workflow:</strong> This creates a tailored membership directly attached to this purchase without polluting the global plan catalog.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Custom Membership Name</label>
                    <Input
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="e.g. VIP Family Privileges"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Tier Label</label>
                    <Input
                      value={customTier}
                      onChange={(e) => setCustomTier(e.target.value)}
                      placeholder="e.g. Gold, Custom VIP"
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Price (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Validity Duration</label>
                    <Input
                      type="number"
                      min={1}
                      value={customValidityDuration}
                      onChange={(e) => setCustomValidityDuration(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Duration Unit</label>
                    <select
                      value={customValidityUnit}
                      onChange={(e) => setCustomValidityUnit(e.target.value as any)}
                      className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
                    >
                      <option value="months">Months</option>
                      <option value="days">Days</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Service Discount (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={customServiceDiscount}
                      onChange={(e) => setCustomServiceDiscount(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Product Discount (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={customProductDiscount}
                      onChange={(e) => setCustomProductDiscount(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Max Beneficiaries</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={customMaxBeneficiaries}
                      onChange={(e) => setCustomMaxBeneficiaries(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                {/* Optional Category Exclusions */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Eligible Service Categories
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Leave unselected to apply discount across all salon services.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-24 overflow-y-auto p-2 bg-muted/20 border rounded">
                    {serviceCategories.map((cat) => {
                      const catId = cat.id || (cat as { _id?: string })._id || "";
                      if (!catId) return null;
                      const isChecked = customSelectedCategoryIds.includes(catId);
                      return (
                        <label
                          key={catId}
                          className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCategorySelection(catId)}
                            className="rounded text-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Complimentary Perks */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Included Complimentary Perks
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Free Hair Wash on First Visit"
                      value={newPerkInput}
                      onChange={(e) => setNewPerkInput(e.target.value)}
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
                      size="sm"
                      variant="outline"
                      onClick={handleAddPerk}
                      className="text-xs h-8 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                  {customComplimentaryPerks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {customComplimentaryPerks.map((perk, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[11px] gap-1 pr-1.5 py-0.5"
                        >
                          {perk}
                          <button
                            type="button"
                            onClick={() => handleRemovePerk(i)}
                            className="text-muted-foreground hover:text-destructive ml-0.5"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reusable Catalogue Opt-In */}
                <div className="pt-2 border-t">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAsPermanentCatalog}
                      onChange={(e) => setSaveAsPermanentCatalog(e.target.checked)}
                      className="rounded text-primary h-4 w-4"
                    />
                    <span>Save this as a reusable catalogue plan for future sales</span>
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
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Purchase & Privilege Summary
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Membership Plan:</span>
                    <strong className="text-sm font-semibold">
                      {planMode === "catalog" ? selectedCatalogPlan?.name : customPlanName}
                    </strong>
                    <Badge variant="outline" className="ml-2 text-[10px] text-primary">
                      {planMode === "catalog" ? selectedCatalogPlan?.tier : customTier} Tier
                    </Badge>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Validity:</span>
                    <span>
                      {planMode === "catalog"
                        ? `${selectedCatalogPlan?.validityMonths} months`
                        : `${customValidityDuration} ${customValidityUnit}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Benefits Provided:</span>
                    <div className="flex gap-2 pt-0.5">
                      <span className="font-semibold text-emerald-600">
                        {planMode === "catalog"
                          ? selectedCatalogPlan?.benefits?.serviceDiscountPercentage || 0
                          : customServiceDiscount}% Services
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">
                        {planMode === "catalog"
                          ? selectedCatalogPlan?.benefits?.productDiscountPercentage || 0
                          : customProductDiscount}% Products
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l md:pl-4">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Payer (Bill Payer):</span>
                    <strong className="font-semibold">Customer #{payerCustomerId.slice(-6)}</strong>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Designated Beneficiaries ({beneficiaryCustomerIds.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {beneficiaryCustomerIds.map((bId) => (
                        <Badge key={bId} variant="secondary" className="text-[10px]">
                          Customer #{bId.slice(-6)} {bId === payerCustomerId && "(Payer)"}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-muted-foreground block text-[11px]">Total Checkout Amount:</span>
                    <span className="text-xl font-bold text-foreground">
                      {formatCurrency(planMode === "catalog" ? selectedCatalogPlan?.price || 0 : customPrice)}
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
                <label className="text-xs font-semibold">Notes / Special Instructions</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for invoice"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200">
              <strong>Unified Checkout Settlement:</strong> Submitting creates a draft invoice and routes directly to the POS settlement screen. Membership benefits become usable immediately for any in-flight appointments under the pending-payment workflow.
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
