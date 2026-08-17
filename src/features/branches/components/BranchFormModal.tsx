"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getErrorMessage, mapBackendValidationErrors } from "@/lib/api/errors";
import { useCreateBranch } from "../hooks/useCreateBranch";
import { useUpdateBranch } from "../hooks/useUpdateBranch";
import {
  createBranchSchema,
  type CreateBranchFormValues,
  type UpdateBranchFormValues,
} from "../schemas/branch.schema";
import type { Branch } from "@/types/branch";

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit?: Branch | null;
}

export function BranchFormModal({
  isOpen,
  onClose,
  branchToEdit,
}: BranchFormModalProps) {
  const isEditing = Boolean(branchToEdit);
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchFormValues>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (branchToEdit) {
        reset({
          name: branchToEdit.name || "",
          address: branchToEdit.address || "",
          phone: branchToEdit.phone || "",
        });
      } else {
        reset({
          name: "",
          address: "",
          phone: "",
        });
      }
    }
  }, [isOpen, branchToEdit, reset]);

  const onSubmit = async (data: CreateBranchFormValues | UpdateBranchFormValues) => {
    try {
      const trimmedData = {
        name: data.name?.trim(),
        address: data.address?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      };

      if (isEditing && branchToEdit) {
        await updateMutation.mutateAsync({
          id: branchToEdit.id,
          payload: trimmedData,
        });
        toast.success("Branch updated successfully");
      } else {
        await createMutation.mutateAsync({
          name: trimmedData.name!,
          address: trimmedData.address,
          phone: trimmedData.phone,
        });
        toast.success("Branch created successfully");
      }
      onClose();
    } catch (err: unknown) {
      const hasFieldErrors = mapBackendValidationErrors(err, setError);
      if (!hasFieldErrors) {
        const errorMsg = getErrorMessage(
          err,
          isEditing ? "Failed to update branch." : "Failed to create branch."
        );
        toast.error(errorMsg);
      }
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isSubmitting;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Branch" : "Create New Branch"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Branch Name <span className="text-destructive">*</span>
          </label>
          <Input
            {...register("name")}
            placeholder="e.g. Downtown Flagship"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Phone Number
          </label>
          <Input
            {...register("phone")}
            placeholder="e.g. +1 555-0199"
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Address
          </label>
          <Input
            {...register("address")}
            placeholder="e.g. 123 Main Street, Suite 400"
            disabled={isLoading}
          />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
              ? "Save Changes"
              : "Create Branch"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
