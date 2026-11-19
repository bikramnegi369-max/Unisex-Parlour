"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { StaffAttributionSelect } from "@/features/employees/components/StaffAttributionSelect";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { sellMembershipFormSchema, type SellMembershipFormValues } from "../schemas/membership.schema";
import type { MembershipPlan } from "../types/membership.types";

interface SellMembershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: SellMembershipFormValues) => Promise<void>;
  isLoading: boolean;
  plans: MembershipPlan[];
  selectedPlanId?: string | null;
  initialCustomerId?: string | null;
}

export function SellMembershipDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  plans,
  selectedPlanId,
  initialCustomerId,
}: SellMembershipDialogProps) {
  const { currentBranchId } = useBranchContext();
  const [beneficiaryInputId, setBeneficiaryInputId] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SellMembershipFormValues>({
    resolver: zodResolver(sellMembershipFormSchema) as unknown as Resolver<SellMembershipFormValues>,
    defaultValues: {
      membershipPlanId: selectedPlanId || "",
      payerCustomerId: initialCustomerId || "",
      beneficiaryCustomerIds: initialCustomerId ? [initialCustomerId] : [],
      soldByStaffId: "",
      notes: "",
    },
  });

  const activePlanId = watch("membershipPlanId");
  const payerId = watch("payerCustomerId");
  const beneficiaries = watch("beneficiaryCustomerIds") || [];

  const selectedPlan = plans.find((p) => p.id === activePlanId);
  const maxBeneficiaries = selectedPlan?.maxBeneficiaries || 1;

  useEffect(() => {
    if (selectedPlanId) {
      setValue("membershipPlanId", selectedPlanId);
    }
  }, [selectedPlanId, setValue]);

  useEffect(() => {
    if (initialCustomerId) {
      setValue("payerCustomerId", initialCustomerId);
      setValue("beneficiaryCustomerIds", [initialCustomerId]);
    }
  }, [initialCustomerId, setValue]);

  useEffect(() => {
    if (!isOpen) {
      reset({
        membershipPlanId: selectedPlanId || "",
        payerCustomerId: initialCustomerId || "",
        beneficiaryCustomerIds: initialCustomerId ? [initialCustomerId] : [],
        soldByStaffId: "",
        notes: "",
      });
      setBeneficiaryInputId("");
    }
  }, [isOpen, selectedPlanId, initialCustomerId, reset]);

  // Convenience helper: Add Payer as Beneficiary
  const handleAddPayerAsBeneficiary = () => {
    if (!payerId) return;
    if (beneficiaries.includes(payerId)) return;
    if (beneficiaries.length >= maxBeneficiaries) return;
    setValue("beneficiaryCustomerIds", [...beneficiaries, payerId]);
  };

  const handleAddBeneficiary = (customerId: string) => {
    if (!customerId) return;
    if (beneficiaries.includes(customerId)) return;
    if (beneficiaries.length >= maxBeneficiaries) return;
    setValue("beneficiaryCustomerIds", [...beneficiaries, customerId]);
    setBeneficiaryInputId("");
  };

  const handleRemoveBeneficiary = (index: number) => {
    setValue(
      "beneficiaryCustomerIds",
      beneficiaries.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Sell Membership & Unified Checkout"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Select a membership plan, assign the paying customer, and configure beneficiary privileges.
        </p>

        {/* Plan Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Select Membership Plan *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 border rounded-lg">
            {plans.map((plan) => {
              const isSelected = plan.id === activePlanId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setValue("membershipPlanId", plan.id)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{plan.name}</span>
                    <span className="font-bold text-sm">₹{plan.price}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{plan.tier} Tier</span>
                    <span>Up to {plan.maxBeneficiaries || 1} members</span>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.membershipPlanId && (
            <p className="text-xs text-destructive">{errors.membershipPlanId.message}</p>
          )}
        </div>

        {/* Payer Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Purchaser / Payer Customer *</label>
          <Controller
            control={control}
            name="payerCustomerId"
            render={({ field }) => (
              <CustomerSelector
                value={field.value}
                onChange={(cId) => field.onChange(cId)}
                branchId={currentBranchId || undefined}
                error={errors.payerCustomerId?.message}
              />
            )}
          />
          {payerId && !beneficiaries.includes(payerId) && beneficiaries.length < maxBeneficiaries && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPayerAsBeneficiary}
              className="text-xs mt-1 h-7 gap-1 text-primary border-primary/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Also add Payer as a Beneficiary
            </Button>
          )}
        </div>

        {/* Beneficiaries Selection */}
        <div className="space-y-2 p-3 bg-muted/40 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Assigned Beneficiaries ({beneficiaries.length} / {maxBeneficiaries}) *
              </label>
              <span className="text-[11px] text-muted-foreground block">
                Each beneficiary receives independent discounts and privileges.
              </span>
            </div>
          </div>

          {beneficiaries.length < maxBeneficiaries ? (
            <div className="pt-1">
              <CustomerSelector
                value={beneficiaryInputId}
                onChange={(cId) => handleAddBeneficiary(cId)}
                branchId={currentBranchId || undefined}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Maximum beneficiary limit reached for this plan ({maxBeneficiaries}).
            </p>
          )}

          {beneficiaries.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {beneficiaries.map((bId, idx) => (
                <div key={bId} className="flex items-center justify-between p-2 rounded-md bg-background border text-xs">
                  <span className="font-mono text-muted-foreground">Customer #{bId.slice(-6)}</span>
                  <div className="flex items-center gap-2">
                    {bId === payerId && (
                      <Badge variant="secondary" className="text-[10px] h-4.5">Payer & Beneficiary</Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveBeneficiary(idx)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.beneficiaryCustomerIds && (
            <p className="text-xs text-destructive">{errors.beneficiaryCustomerIds.message}</p>
          )}
        </div>

        {/* Selling Staff Attribution */}
        <div className="space-y-1.5">
          <Controller
            control={control}
            name="soldByStaffId"
            render={({ field }) => (
              <StaffAttributionSelect
                label="Selling Staff (Commission Attribution)"
                value={field.value || ""}
                onChange={(val) => field.onChange(val || "")}
                branchId={currentBranchId || undefined}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2 cursor-pointer">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Proceed to Unified Checkout
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
