import React, { useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeFormValues } from "../schemas/employee.schema";
import type { Employee, EmployeePayload } from "../types/employee.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapBackendValidationErrors } from "@/lib/api/errors";
import UserSelector from "./UserSelector";
import { useUser } from "@/features/users/hooks/useUser";
import type { UserSummary } from "@/features/users/types/users.types";
import { Loader2 } from "lucide-react";

interface EmployeeFormProps {
  initialEmployee?: Employee;
  onSubmit: (data: EmployeePayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  error?: unknown;
}

export default function EmployeeForm({
  initialEmployee,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
  error,
}: EmployeeFormProps) {
  const isEditMode = !!initialEmployee;

  const defaultValues = useMemo(() => {
    if (!initialEmployee) {
      return {
        name: "",
        email: "",
        phone: "",
        designation: "",
        joiningDate: new Date().toISOString().split("T")[0],
        avatarUrl: "",
        status: "active" as const,
        userId: undefined,
      };
    }

    let formattedDate = "";
    if (initialEmployee.joiningDate) {
      formattedDate = initialEmployee.joiningDate.split("T")[0];
    }

    return {
      name: initialEmployee.name || "",
      email: initialEmployee.email || "",
      phone: initialEmployee.phone || "",
      designation: initialEmployee.designation || "",
      joiningDate: formattedDate,
      avatarUrl: initialEmployee.avatarUrl || "",
      status: initialEmployee.status || "active",
      userId: initialEmployee.userId || undefined,
    };
  }, [initialEmployee]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as unknown as Resolver<EmployeeFormValues>,
    defaultValues,
  });

  const { data: linkedUser } = useUser(initialEmployee?.userId ?? null);

  // Effect to map server validation errors
  useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  const linkedUserSummary = useMemo(() => {
    if (linkedUser) {
      return {
        id: linkedUser.id,
        name: linkedUser.name,
        username: linkedUser.username,
        email: linkedUser.email,
        phone: linkedUser.phone,
        status: linkedUser.status,
      } satisfies UserSummary;
    }

    if (initialEmployee?.userId) {
      return {
        id: initialEmployee.userId,
        name: initialEmployee.name,
        username: initialEmployee.email,
        email: initialEmployee.email,
        phone: initialEmployee.phone,
        status: initialEmployee.status,
      } satisfies UserSummary;
    }

    return null;
  }, [initialEmployee, linkedUser]);

  const handleFormSubmit = (values: EmployeeFormValues) => {
    onSubmit(values);
  };

  const handleUserSelect = (user: UserSummary) => {
    setValue("userId", user.id, { shouldDirty: true, shouldValidate: true });
  };

  const handleUserClear = () => {
    setValue("userId", undefined, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 py-1 text-left">
      {/* Section 1: Personal Information */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
          <p className="text-xs text-muted-foreground">General identity and contact details of the employee.</p>
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
            {errors.name && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Email Address <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. john.doe@salon.com"
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting || isEditMode}
              {...register("email")}
            />
            {isEditMode ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Email address cannot be changed after registration.
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Required for system communications. Must be unique.
              </p>
            )}
            {errors.email && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <Input
              id="phone"
              placeholder="e.g. +919876543210"
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("phone")}
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Must be in international E.164 format (e.g., +919876543210).
            </p>
            {errors.phone && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="avatarUrl" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Avatar Image URL
            </label>
            <Input
              id="avatarUrl"
              placeholder="e.g. https://domain.com/avatar.jpg"
              className={errors.avatarUrl ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("avatarUrl")}
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Optional link to a public image hosting URL.
            </p>
            {errors.avatarUrl && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.avatarUrl.message}</p>}
          </div>
        </div>
      </div>

      {/* Section 2: Account Linkage */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">User Account Linkage</h3>
          <p className="text-xs text-muted-foreground">Link this staff record to an existing system user via a searchable selector.</p>
        </div>
        <hr className="border-border/60" />

        <div>
          <UserSelector
            initialUser={linkedUserSummary}
            onSelect={handleUserSelect}
            onClear={handleUserClear}
            disabled={isSubmitting}
          />
          <input type="hidden" {...register("userId")} />
        </div>
      </div>

      {/* Section 3: Employment Information */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Employment Details</h3>
          <p className="text-xs text-muted-foreground">Professional job details and contract start date.</p>
        </div>
        <hr className="border-border/60" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="designation" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Designation <span className="text-destructive">*</span>
            </label>
            <Input
              id="designation"
              placeholder="e.g. Senior Stylist, Salon Manager"
              className={errors.designation ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("designation")}
            />
            {errors.designation && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.designation.message}</p>}
          </div>

          <div>
            <label htmlFor="joiningDate" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Joining Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="joiningDate"
              type="date"
              className={errors.joiningDate ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("joiningDate")}
            />
            {errors.joiningDate && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.joiningDate.message}</p>}
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/60 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 px-4 cursor-pointer font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 px-6 cursor-pointer font-semibold flex items-center gap-2 min-w-30 justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </Button>
      </div>
    </form>
  );
}
