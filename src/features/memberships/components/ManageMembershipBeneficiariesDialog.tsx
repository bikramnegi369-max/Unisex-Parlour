"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { ServiceEligibilityField } from "./ServiceEligibilityField";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useMembershipPurchaseGroup,
  useAddBeneficiaryToMembership,
  useCancelBeneficiaryMembership,
} from "../hooks/useMemberships";
import type { Customer } from "@/features/customers/types/customer.types";
import type { MembershipBenefits } from "../types/membership.types";
import { toast } from "sonner";

interface ManageMembershipBeneficiariesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  membershipId: string;
}

export function ManageMembershipBeneficiariesDialog({
  isOpen,
  onClose,
  membershipId,
}: ManageMembershipBeneficiariesDialogProps) {
  const { data: group, isLoading, refetch } = useMembershipPurchaseGroup(membershipId);
  const addBeneficiaryMutation = useAddBeneficiaryToMembership();
  const cancelBeneficiaryMutation = useCancelBeneficiaryMembership();

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomizingBenefits, setIsCustomizingBenefits] = useState(false);
  const [customBenefits, setCustomBenefits] = useState<Partial<MembershipBenefits>>({});

  if (!isOpen) return null;

  const maxBeneficiaries = group?.maxBeneficiaries || 1;
  const enrolledCount = group?.enrolledCount || 0;
  const isCapacityReached = group?.isCapacityReached ?? (enrolledCount >= maxBeneficiaries);
  const availableSlots = group?.availableSlots ?? Math.max(0, maxBeneficiaries - enrolledCount);

  const handleAddMember = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer to add as beneficiary.");
      return;
    }
    if (isCapacityReached) {
      toast.error(
        `Membership capacity reached (${maxBeneficiaries} max). Cannot add more beneficiaries.`,
      );
      return;
    }

    try {
      await addBeneficiaryMutation.mutateAsync({
        membershipId,
        customerId: selectedCustomerId,
        benefitsOverride: isCustomizingBenefits ? customBenefits : undefined,
      });

      toast.success(
        `Added ${selectedCustomer?.name || "customer"} to membership successfully!`,
      );
      setSelectedCustomerId("");
      setSelectedCustomer(null);
      setIsCustomizingBenefits(false);
      setCustomBenefits({});
      refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Failed to add beneficiary member.";
      toast.error(msg);
    }
  };

  const handleCancelBeneficiary = async (benMembershipId: string, memberName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate membership privileges for ${memberName}? Historical billing and appointment records will be safely preserved.`,
      )
    ) {
      return;
    }

    try {
      await cancelBeneficiaryMutation.mutateAsync({
        id: benMembershipId,
        reason: "Deactivated from beneficiary management interface",
      });
      toast.success(`Membership privileges deactivated for ${memberName}`);
      refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Failed to cancel beneficiary membership.";
      toast.error(msg);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 font-medium">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/20 font-medium">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="text-purple-600 border-purple-500/20 font-medium">
            Suspended
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manage Membership Beneficiaries" maxWidth="2xl">
      <div className="flex flex-col overflow-hidden max-h-[80vh]">
        {/* Header Summary */}
        <div className="pb-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {group?.planName} ({group?.tier} Tier)
              </h3>
              <p className="text-xs text-muted-foreground">
                Purchase #{group?.membershipPurchaseId?.slice(-6)}
              </p>
            </div>
          </div>

          {/* Capacity Badge */}
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground block font-medium">
              Capacity Usage
            </span>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span
                className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                  isCapacityReached
                    ? "bg-red-500/15 text-red-600 border border-red-500/30"
                    : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                }`}
              >
                {enrolledCount} of {maxBeneficiaries} members
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="py-4 overflow-y-auto space-y-5 flex-1 pr-1">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Loading membership beneficiary group...
              </div>
            ) : (
              <>
                {/* 1. Add Beneficiary Section */}
                <div className="p-3.5 border rounded-lg bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-primary" /> Add New Beneficiary
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isCapacityReached
                        ? "Capacity Reached (0 slots remaining)"
                        : `${availableSlots} slot${availableSlots > 1 ? "s" : ""} available`}
                    </span>
                  </div>

                  {isCapacityReached ? (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Member Capacity Reached:</strong> This membership plan allows at
                        most {maxBeneficiaries} beneficiaries, and all {maxBeneficiaries} slots
                        are currently utilized. To add a new member, an existing member must be
                        deactivated according to domain rules.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <CustomerSelector
                        value={selectedCustomerId}
                        onChange={(id, cust) => {
                          setSelectedCustomerId(id);
                          setSelectedCustomer(cust || null);
                        }}
                      />

                      {/* Optional tailored benefits toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsCustomizingBenefits(!isCustomizingBenefits)}
                          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          {isCustomizingBenefits ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" /> Use Default Plan Perks
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" /> Customize Perks for this
                              Beneficiary
                            </>
                          )}
                        </button>

                        {isCustomizingBenefits && (
                          <div className="mt-2.5 p-3 border rounded-lg bg-card space-y-3">
                            <ServiceEligibilityField
                              eligibleCategoryIds={customBenefits.eligibleServiceCategoryIds || []}
                              eligibleServiceIds={customBenefits.eligibleServiceIds || []}
                              excludedCategoryIds={customBenefits.excludedServiceCategoryIds || []}
                              excludedServiceIds={customBenefits.excludedServiceIds || []}
                              onChange={(updates) => {
                                setCustomBenefits((prev) => ({ ...prev, ...updates }));
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAddMember}
                          disabled={!selectedCustomerId || addBeneficiaryMutation.isPending}
                          className="gap-1.5 text-xs h-8 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {addBeneficiaryMutation.isPending ? "Adding..." : "Confirm & Add Member"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Enrolled Members Listing */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground block uppercase tracking-wider">
                    Enrolled Beneficiaries ({group?.members?.length || 0})
                  </span>

                  <div className="space-y-2">
                    {group?.members?.map((member, idx) => {
                      const custName =
                        typeof member.customerId === "object"
                          ? (member.customerId as { name?: string })?.name
                          : member.customer?.name || "Customer";
                      const custPhone =
                        typeof member.customerId === "object"
                          ? (member.customerId as { phone?: string })?.phone
                          : member.customer?.phone || "";
                      const isPayer =
                        (typeof member.payerCustomerId === "object"
                          ? (member.payerCustomerId as { _id?: string; id?: string })?._id ||
                            (member.payerCustomerId as { _id?: string; id?: string })?.id
                          : member.payerCustomerId) ===
                        (typeof member.customerId === "object"
                          ? (member.customerId as { _id?: string; id?: string })?._id ||
                            (member.customerId as { _id?: string; id?: string })?.id
                          : member.customerId);

                      const canDeactivate =
                        member.status === "active" || member.status === "pending_payment";

                      return (
                        <div
                          key={member.id || (member as { _id?: string })._id}
                          className="p-3 border rounded-lg bg-card flex items-center justify-between shadow-2xs text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">
                                  {custName}
                                </span>
                                {isPayer && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1 border-primary/40 text-primary"
                                  >
                                    Purchaser
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Code: {member.membershipCode} {custPhone ? `• ${custPhone}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div>{getStatusBadge(member.status)}</div>
                            {canDeactivate && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleCancelBeneficiary(
                                    member.id || (member as { _id?: string })._id || "",
                                    custName || "Customer",
                                  )
                                }
                                disabled={cancelBeneficiaryMutation.isPending}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
    </Dialog>
  );
}
