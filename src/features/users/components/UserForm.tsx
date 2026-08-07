import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useRoles } from "../hooks/useRoles";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "../schemas/users.schema";
import type { UserResponseDTO } from "../types/users.types";

interface UserFormProps {
  initialUser?: UserResponseDTO;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function UserForm({
  initialUser,
  onSubmit,
  isSubmitting,
  onCancel,
}: UserFormProps) {
  const isEditMode = !!initialUser;
  const { user: currentUser } = useAuth();
  const { branches, isLoading: isLoadingBranches } = useBranches();
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();

  // If editing self, block hasOrgWideAccess changes
  const isSelfEdit = currentUser?.id === initialUser?.id;

  const defaultValues = useMemo(() => {
    if (!initialUser) {
      return {
        name: "",
        email: "",
        phone: "",
        roleId: "",
        branchAccess: [],
        hasOrgWideAccess: false,
      };
    }

    // Map branchAccess objects to string array of branchIds
    const selectedBranches = initialUser.branchAccess
      .filter((b) => b.isActive)
      .map((b) => b.branchId);

    const initialRoleId =
      typeof initialUser.role === "object" && initialUser.role !== null
        ? initialUser.role.id
        : (roles.find((r) => r.name === initialUser.role)?.id || "");

    return {
      name: initialUser.name || "",
      email: initialUser.email || "",
      phone: initialUser.phone || "",
      roleId: initialRoleId,
      branchAccess: selectedBranches,
      hasOrgWideAccess: !!initialUser.hasOrgWideAccess,
    };
  }, [initialUser, roles]);

  const activeSchema = isEditMode ? updateUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(activeSchema),
    defaultValues,
  });

  const hasOrgWideAccess = watch("hasOrgWideAccess");
  const selectedBranchAccess: string[] = watch("branchAccess") || [];

  const handleBranchCheckboxChange = (branchId: string, checked: boolean) => {
    let updated: string[];
    if (checked) {
      updated = [...selectedBranchAccess, branchId];
    } else {
      updated = selectedBranchAccess.filter((id) => id !== branchId);
    }
    setValue("branchAccess", updated, { shouldDirty: true, shouldValidate: true });
  };

  const handleFormSubmit = (values: any) => {
    // Backend contract expects string[] for branchAccess
    const submitPayload = {
      name: values.name,
      phone: values.phone,
      branchAccess: values.hasOrgWideAccess ? [] : values.branchAccess,
      hasOrgWideAccess: values.hasOrgWideAccess,
      ...(!isEditMode ? { email: values.email, roleId: values.roleId } : {}),
    };
    onSubmit(submitPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 py-1 text-left">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Account Information</h3>
          <p className="text-xs text-muted-foreground">General details and authorization parameters.</p>
        </div>
        <hr className="border-border/60" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive font-medium mt-1">{errors.name.message as string}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <Input
              id="phone"
              placeholder="e.g. +1234567890"
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive font-medium mt-1">{errors.phone.message as string}</p>
            )}
          </div>
        </div>

        {!isEditMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="jane@parlour.com"
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                disabled={isSubmitting}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.email.message as string}</p>
              )}
            </div>

            <div>
              <label htmlFor="roleId" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
                System Role <span className="text-destructive">*</span>
              </label>
              <select
                id="roleId"
                disabled={isSubmitting || isLoadingRoles}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("roleId")}
              >
                <option value="">Select a role...</option>
                {roles.map((r, index) => (
                  <option key={r.id || r.name || `role-${index}`} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.roleId && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.roleId.message as string}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scoping Section */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">Branch Authorization</h3>
          <p className="text-xs text-muted-foreground">Select branches this user is authorized to manage.</p>
        </div>
        <hr className="border-border/60" />

        <div className="flex items-center gap-2 py-2">
          <input
            id="hasOrgWideAccess"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
            disabled={isSubmitting || isSelfEdit}
            {...register("hasOrgWideAccess")}
          />
          <label htmlFor="hasOrgWideAccess" className="text-xs font-semibold text-foreground cursor-pointer">
            Grant Organization-Wide Access (All current and future branches)
          </label>
        </div>

        {!hasOrgWideAccess && (
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
              Select Branch Access
            </label>
            {isLoadingBranches ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading branches...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <input
                      id={`branch-${b.id}`}
                      type="checkbox"
                      checked={selectedBranchAccess.includes(b.id)}
                      onChange={(e) => handleBranchCheckboxChange(b.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      disabled={isSubmitting}
                    />
                    <label htmlFor={`branch-${b.id}`} className="text-xs font-medium text-foreground cursor-pointer select-none">
                      {b.name}
                    </label>
                  </div>
                ))}
                {branches.length === 0 && (
                  <div className="col-span-full text-xs text-muted-foreground text-center py-2">
                    No active branches available.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/95 cursor-pointer">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : isEditMode ? (
            "Save Changes"
          ) : (
            "Register User"
          )}
        </Button>
      </div>
    </form>
  );
}
