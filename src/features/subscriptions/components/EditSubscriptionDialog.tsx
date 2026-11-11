"use client";

import React, { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Users, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { useUpdateMemberBranchAccess } from "../hooks/useUpdateMemberBranchAccess";
import {
  updateSubscriptionSchema,
  type UpdateSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Subscription, SubscriptionMember } from "../types/subscription.types";

interface EditSubscriptionDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateSubscriptionFormValues) => Promise<void>;
  isLoading: boolean;
}

export function EditSubscriptionDialog({
  subscription,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: EditSubscriptionDialogProps) {
  const { availableBranches } = useBranchContext();
  const { user } = useAuth();
  const canConfigure = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.configure);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<UpdateSubscriptionFormValues>({
    resolver: zodResolver(updateSubscriptionSchema) as unknown as Resolver<UpdateSubscriptionFormValues>,
    defaultValues: {
      permittedBranchIds: subscription.permittedBranchIds || [],
      endDate: subscription.endDate ? subscription.endDate.split("T")[0] : "",
      notes: subscription.notes || "",
    },
  });

  const watchedPermittedBranches =
    useWatch({
      control,
      name: "permittedBranchIds",
    }) || [];

  const toggleBranch = (branchId: string) => {
    const current = watchedPermittedBranches;
    let nextBranches: string[];
    if (current.includes(branchId)) {
      nextBranches = current.filter((id) => id !== branchId);
    } else {
      nextBranches = [...current, branchId];
    }
    setValue("permittedBranchIds", nextBranches, {
      shouldValidate: true,
    });

    // If subscription now restricts branches and beneficiary custom selection has branches not in nextBranches,
    // prune them to prevent leaking invalid branches.
    if (nextBranches.length > 0 && selectedMemberMode === "custom") {
      setSelectedMemberBranches((prev) => prev.filter((id) => nextBranches.includes(id)));
    }
  };

  // --- Beneficiary Member Branch Access State ---
  const members: SubscriptionMember[] = subscription.members || [];
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members.length > 0 ? members[0].customerId : ""
  );

  const activeMember = members.find((m) => m.customerId === selectedMemberId);

  // Initialize beneficiary mode & branches based on the member's current data
  const [selectedMemberMode, setSelectedMemberMode] = useState<"inherit" | "custom">(() => {
    const firstMem = members[0];
    return firstMem && firstMem.permittedBranchIds && firstMem.permittedBranchIds.length > 0
      ? "custom"
      : "inherit";
  });

  const [selectedMemberBranches, setSelectedMemberBranches] = useState<string[]>(() => {
    const firstMem = members[0];
    return firstMem?.permittedBranchIds ? [...firstMem.permittedBranchIds] : [];
  });

  const handleMemberSelect = (customerId: string) => {
    setSelectedMemberId(customerId);
    const target = members.find((m) => m.customerId === customerId);
    if (target && target.permittedBranchIds && target.permittedBranchIds.length > 0) {
      setSelectedMemberMode("custom");
      setSelectedMemberBranches([...target.permittedBranchIds]);
    } else {
      setSelectedMemberMode("inherit");
      setSelectedMemberBranches([]);
    }
  };

  const handleModeChange = (mode: "inherit" | "custom") => {
    setSelectedMemberMode(mode);
    if (mode === "inherit") {
      setSelectedMemberBranches([]);
    } else {
      // If switching to custom, initialize with current member's existing custom branches or plan branches
      const existing = activeMember?.permittedBranchIds || [];
      const validAllowed =
        watchedPermittedBranches.length > 0
          ? existing.filter((id) => watchedPermittedBranches.includes(id))
          : existing;
      setSelectedMemberBranches(validAllowed);
    }
  };

  const toggleMemberBranch = (branchId: string) => {
    if (selectedMemberBranches.includes(branchId)) {
      setSelectedMemberBranches((prev) => prev.filter((id) => id !== branchId));
    } else {
      setSelectedMemberBranches((prev) => [...prev, branchId]);
    }
  };

  // Determine selectable branches for beneficiary custom access:
  // If subscription has permitted branches, beneficiary can only choose among those.
  // If subscription has no restrictions ([] = all branches), beneficiary can choose among all available branches.
  const eligibleBranchesForMember =
    watchedPermittedBranches.length > 0
      ? availableBranches.filter((b) => watchedPermittedBranches.includes(b.id))
      : availableBranches;

  const updateMemberBranchMutation = useUpdateMemberBranchAccess();

  const handleSaveMemberBranches = async () => {
    if (!selectedMemberId || !activeMember) return;
    if (!canConfigure) {
      toast.error("You do not have permission to configure member branch access.");
      return;
    }

    try {
      // Send [] for inherited access.
      // For custom access, send selected IDs intersected with subscription allowed branches (if subscription is restricted).
      const finalBranchIds =
        selectedMemberMode === "inherit"
          ? []
          : watchedPermittedBranches.length > 0
          ? selectedMemberBranches.filter((id) => watchedPermittedBranches.includes(id))
          : selectedMemberBranches;

      await updateMemberBranchMutation.mutateAsync({
        subscriptionId: subscription.id,
        memberCustomerId: selectedMemberId,
        permittedBranchIds: finalBranchIds,
      });

      toast.success(
        `Updated branch permissions for ${activeMember.customer?.name || "member"}.`
      );
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to update member branch permissions.";
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SECTION 1: Subscription-level Permitted Branches Selection */}
      <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plan Permitted Branches
          </label>
          <span className="text-[10px] text-muted-foreground font-medium">
            {watchedPermittedBranches.length === 0
              ? "All Branches (Default)"
              : `${watchedPermittedBranches.length} branch(es) selected`}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-background">
          <button
            type="button"
            onClick={() => setValue("permittedBranchIds", [], { shouldValidate: true })}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              watchedPermittedBranches.length === 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3 w-3" /> All Branches
          </button>

          {availableBranches.map((branch) => {
            const isSelected = watchedPermittedBranches.includes(branch.id);
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {branch.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Member-Level Branch Permissions (Shown when subscription has members) */}
      {members.length > 0 && (
        <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Beneficiary Member Branch Access
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Configure branch permissions per member
            </span>
          </div>

          {!canConfigure && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>You do not have permission to modify member branch permissions.</span>
            </div>
          )}

          {/* Member Selection */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Select Beneficiary
            </label>
            <Select
              value={selectedMemberId}
              onChange={(e) => handleMemberSelect(e.target.value)}
              className="h-9 text-xs"
              disabled={isLoading || updateMemberBranchMutation.isPending}
            >
              {members.map((m) => {
                const displayName = m.customer?.name || `Customer #${m.customerId.slice(-6)}`;
                const branchCount = m.permittedBranchIds?.length ?? 0;
                const branchDesc =
                  branchCount === 0 ? "Same as Plan" : `${branchCount} custom branch(es)`;
                return (
                  <option key={m.customerId} value={m.customerId}>
                    {displayName} ({branchDesc})
                  </option>
                );
              })}
            </Select>
          </div>

          {activeMember && (
            <div className="space-y-3 pt-2">
              {/* Access Mode Toggle */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Branch Permission Mode
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange("inherit")}
                    disabled={!canConfigure || updateMemberBranchMutation.isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMemberMode === "inherit"
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Same as Plan (Inherited)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("custom")}
                    disabled={!canConfigure || updateMemberBranchMutation.isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedMemberMode === "custom"
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Custom Branches
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground pt-0.5">
                  {selectedMemberMode === "inherit"
                    ? "Member inherits all branch permissions allowed by the parent subscription."
                    : "Member is restricted to a specific subset of the subscription's allowed branches."}
                </p>
              </div>

              {/* Custom Branch Selector */}
              {selectedMemberMode === "custom" && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Permitted Branches for {activeMember.customer?.name || "Member"}
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-background">
                    {eligibleBranchesForMember.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        No eligible branches available based on parent subscription settings.
                      </span>
                    ) : (
                      eligibleBranchesForMember.map((branch) => {
                        const isSelected = selectedMemberBranches.includes(branch.id);
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => toggleMemberBranch(branch.id)}
                            disabled={!canConfigure || updateMemberBranchMutation.isPending}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                                : "bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                            }`}
                          >
                            {branch.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Save Beneficiary Branch Access Button */}
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveMemberBranches}
                  disabled={!canConfigure || updateMemberBranchMutation.isPending}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  {updateMemberBranchMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Save Member Branch Access
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: End Date */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Extend / Update End Date
        </label>
        <Input
          type="date"
          disabled={isLoading}
          {...register("endDate")}
          className="h-9 text-xs"
        />
        {errors.endDate && (
          <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      {/* SECTION 4: Notes */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </label>
        <Textarea
          placeholder="Update subscription notes..."
          rows={3}
          disabled={isLoading}
          {...register("notes")}
          className="text-xs"
        />
        {errors.notes && (
          <p className="text-[11px] text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer gap-1.5"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Update Subscription
        </Button>
      </div>
    </form>
  );
}
