import React, { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, AlertTriangle, UserCheck } from "lucide-react";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import {
  quickCustomerSchema,
  type QuickCustomerFormValues,
} from "../schemas/customer.schema";
import type { Customer } from "../types/customer.types";
import { toast } from "sonner";

interface ExistingCustomerMetadata {
  _id: string;
  name: string;
  phone: string;
  id?: string;
}

interface QuickCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export function QuickCustomerDialog({
  isOpen,
  onClose,
  onSuccess,
}: QuickCustomerDialogProps) {
  const createCustomerMutation = useCreateCustomer();
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    existingCustomer?: ExistingCustomerMetadata;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickCustomerFormValues>({
    resolver: zodResolver(quickCustomerSchema) as Resolver<QuickCustomerFormValues>,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      gender: "prefer_not_to_say",
    },
  });

  const handleClose = () => {
    reset();
    setDuplicateError(null);
    onClose();
  };

  const handleFormSubmit = async (data: QuickCustomerFormValues) => {
    setDuplicateError(null);

    // Prepare minimal payload - do NOT send organizationId, homeBranchId, branchId, visitedBranchIds
    const payload = {
      name: data.name,
      phone: data.phone,
      ...(data.email ? { email: data.email } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
    };

    try {
      const createdCustomer = await createCustomerMutation.mutateAsync(payload);
      toast.success(`Customer "${createdCustomer.name}" created successfully`);
      onSuccess(createdCustomer);
      handleClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: { existingCustomer?: ExistingCustomerMetadata };
            existingCustomer?: ExistingCustomerMetadata;
            error?: { errors?: { existingCustomer?: ExistingCustomerMetadata } };
          };
        };
      };

      if (axiosError.response?.status === 409) {
        const responseData = axiosError.response.data;
        const existingCust =
          responseData?.errors?.existingCustomer ||
          responseData?.existingCustomer ||
          responseData?.error?.errors?.existingCustomer;

        setDuplicateError({
          message:
            responseData?.message ||
            "Customer already exists with this phone number.",
          existingCustomer: existingCust,
        });
      } else if (axiosError.response?.status === 403) {
        toast.error("You do not have permission to create customers.");
      } else {
        toast.error(
          axiosError.response?.data?.message || "Failed to create customer."
        );
      }
    }
  };

  const handleSelectExisting = () => {
    if (!duplicateError?.existingCustomer) return;
    const existing = duplicateError.existingCustomer;
    const canonicalId = existing._id || existing.id || "";

    const customerObj: Customer = {
      id: canonicalId,
      _id: canonicalId,
      name: existing.name,
      phone: existing.phone,
      organizationId: "",
      homeBranchId: "",
      visitedBranchIds: [],
      loyaltyPoints: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    toast.info(`Selected existing customer: ${existing.name}`);
    onSuccess(customerObj);
    handleClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create New Customer">
      <div className="space-y-4 text-left">
        {duplicateError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>Customer Already Exists</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {duplicateError.message}
              {duplicateError.existingCustomer && (
                <span className="font-medium text-foreground block mt-0.5">
                  Existing profile: {duplicateError.existingCustomer.name} (
                  {duplicateError.existingCustomer.phone})
                </span>
              )}
            </p>

            {duplicateError.existingCustomer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectExisting}
                className="w-full text-xs h-8 gap-1.5 border-amber-500/40 hover:bg-amber-500/10"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Select Existing Customer
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              {...register("name")}
              placeholder="e.g. Sarah Jenkins"
              className="h-8 text-xs"
              disabled={createCustomerMutation.isPending}
            />
            {errors.name && (
              <span className="text-[11px] text-destructive">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <Input
              {...register("phone")}
              placeholder="e.g. +91 98765 43210"
              className="h-8 text-xs"
              disabled={createCustomerMutation.isPending}
            />
            {errors.phone && (
              <span className="text-[11px] text-destructive">
                {errors.phone.message}
              </span>
            )}
          </div>

          {/* Email (Optional) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Input
              type="email"
              {...register("email")}
              placeholder="e.g. sarah@example.com"
              className="h-8 text-xs"
              disabled={createCustomerMutation.isPending}
            />
            {errors.email && (
              <span className="text-[11px] text-destructive">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Gender (Optional) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gender <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Select
              {...register("gender")}
              className="w-full h-8 text-xs"
              disabled={createCustomerMutation.isPending}
            >
              <option value="prefer_not_to_say">Prefer Not to Say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
            {errors.gender && (
              <span className="text-[11px] text-destructive">
                {errors.gender.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={createCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createCustomerMutation.isPending}
              className="gap-1.5"
            >
              {createCustomerMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {createCustomerMutation.isPending
                ? "Creating..."
                : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
