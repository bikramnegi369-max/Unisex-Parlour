"use client";

import React from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  updateSubscriptionSchema,
  type UpdateSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Subscription } from "../types/subscription.types";

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
    if (current.includes(branchId)) {
      setValue(
        "permittedBranchIds",
        current.filter((id) => id !== branchId),
        { shouldValidate: true }
      );
    } else {
      setValue("permittedBranchIds", [...current, branchId], {
        shouldValidate: true,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Permitted Branches Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Permitted Branches
          </label>
          <span className="text-[10px] text-muted-foreground">
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

      {/* End Date */}
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

      {/* Notes */}
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
