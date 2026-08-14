"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createRoleSchema, type CreateRoleFormValues } from "../schemas/role.schema";
import { useCreateRole } from "../hooks/useRoles";

interface CreateRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoleDialog({ isOpen, onClose }: CreateRoleDialogProps) {
  const { mutate: createRole, isPending, error } = useCreateRole();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (values: CreateRoleFormValues) => {
    createRole(values, {
      onSuccess: () => {
        toast.success("Role created successfully.");
        handleClose();
      },

      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to create role.";
        toast.error(msg);
      },
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create Custom Role">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs font-semibold text-destructive">
            {(error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message || "Failed to create role. Please try again."}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Role Name <span className="text-destructive">*</span>
          </label>
          <Input
            {...register("name")}
            placeholder="e.g. Senior Stylist, Inventory Auditor"
            disabled={isPending}
          />
          {errors.name && (
            <p className="text-xs text-destructive font-medium mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
          <Textarea
            {...register("description")}
            placeholder="Brief description of responsibilities and permissions..."
            disabled={isPending}
            rows={3}
          />
          {errors.description && (
            <p className="text-xs text-destructive font-medium mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex items-center gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Role...
              </>
            ) : (
              "Create Role"
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
