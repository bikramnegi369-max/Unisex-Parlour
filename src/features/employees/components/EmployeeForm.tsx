import React, { useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, type EmployeeFormValues } from "../schemas/employee.schema";
import type { Employee, EmployeePayload } from "../types/employee.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useServices } from "@/features/services/hooks/services/useServices";
import { mapBackendValidationErrors } from "@/lib/api/errors";

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
  const { branches, isLoading: isLoadingBranches } = useBranches();
  
  // Fetch services for specialties selection
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: 100, // Fetch first 100 services for selection
  });
  const servicesList = servicesData?.data || [];

  const isEditMode = !!initialEmployee;

  const defaultValues = useMemo(() => {
    if (!initialEmployee) {
      return {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "Stylist" as const,
        branchIds: [],
        specialties: [],
        status: "active" as const,
      };
    }

    return {
      firstName: initialEmployee.firstName || "",
      lastName: initialEmployee.lastName || "",
      email: initialEmployee.email || "",
      phone: initialEmployee.phone || "",
      role: initialEmployee.role || "Stylist",
      branchIds: initialEmployee.branchIds || [],
      specialties: initialEmployee.specialties || [],
      status: initialEmployee.status || "active",
    };
  }, [initialEmployee]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as unknown as Resolver<EmployeeFormValues>,
    defaultValues,
  });

  const selectedBranchIds = watch("branchIds") || [];
  const selectedSpecialties = watch("specialties") || [];

  // Effect to map server validation errors
  useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  const handleBranchToggle = (branchId: string) => {
    const current = [...selectedBranchIds];
    const index = current.indexOf(branchId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(branchId);
    }
    setValue("branchIds", current, { shouldValidate: true });
  };

  const handleSpecialtyToggle = (serviceId: string) => {
    const current = [...selectedSpecialties];
    const index = current.indexOf(serviceId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(serviceId);
    }
    setValue("specialties", current, { shouldValidate: true });
  };

  const handleFormSubmit = (values: EmployeeFormValues) => {
    // According to backend contract:
    // POST takes: firstName, lastName, email, phone, role, branchIds, specialties
    // PUT takes: firstName, lastName, phone, role, branchIds, specialties (does NOT include email)
    if (isEditMode) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email, status, ...updatePayload } = values;
      onSubmit(updatePayload);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, ...createPayload } = values;
      onSubmit(createPayload);
    }
  };

  const isLoadingData = isLoadingBranches || isLoadingServices;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-2 text-left">
      {/* 1. Profile Information */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">Profile Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              First Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="firstName"
              placeholder="e.g. John"
              className={errors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("firstName")}
            />
            {errors.firstName && <p className="mt-1 text-xs font-medium text-destructive">{errors.firstName.message}</p>}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Last Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="lastName"
              placeholder="e.g. Doe"
              className={errors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("lastName")}
            />
            {errors.lastName && <p className="mt-1 text-xs font-medium text-destructive">{errors.lastName.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Email Address <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. john.doe@parlour.com"
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting || isEditMode}
              {...register("email")}
            />
            {isEditMode && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Email address cannot be changed after registration.
              </p>
            )}
            {errors.email && <p className="mt-1 text-xs font-medium text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              placeholder="e.g. +1234567890"
              className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("phone")}
            />
            {errors.phone && <p className="mt-1 text-xs font-medium text-destructive">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="role" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Role / Permission Tier <span className="text-destructive">*</span>
            </label>
            <Select
              id="role"
              disabled={isSubmitting}
              className={errors.role ? "border-destructive" : ""}
              {...register("role")}
            >
              <option value="Stylist">Stylist (Service Specialist)</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Manager">Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Owner">Owner</option>
            </Select>
            {errors.role && <p className="mt-1 text-xs font-medium text-destructive">{errors.role.message}</p>}
          </div>
        </div>
      </div>

      {/* 2. Branch Assignment */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <div className="border-b border-border/50 pb-2 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground">Branch Assignment <span className="text-destructive">*</span></h3>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">At least one required</span>
        </div>

        {isLoadingData ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Loading branch data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map((branch) => {
              const isChecked = selectedBranchIds.includes(branch.id);
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => !isSubmitting && handleBranchToggle(branch.id)}
                  disabled={isSubmitting}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs font-medium transition-all select-none cursor-pointer ${
                    isChecked
                      ? "border-primary bg-primary/5 text-foreground font-semibold"
                      : "border-border/80 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <span>{branch.name}</span>
                  <span className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                    isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {errors.branchIds && <p className="text-xs font-medium text-destructive mt-1">{errors.branchIds.message}</p>}
      </div>

      {/* 3. Certified Service Specialties */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
        <div className="border-b border-border/50 pb-2 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-foreground">Service Specialties</h3>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Optional</span>
        </div>

        {isLoadingData ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>Loading services...</span>
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto border border-border/80 rounded-lg p-2 bg-background space-y-1">
            {servicesList.map((service) => {
              const isChecked = selectedSpecialties.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => !isSubmitting && handleSpecialtyToggle(service.id)}
                  disabled={isSubmitting}
                  className={`flex items-center justify-between p-2 rounded text-left text-xs font-medium transition-all select-none w-full cursor-pointer ${
                    isChecked ? "bg-primary/5 text-foreground font-semibold" : "hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{service.name}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{service.duration} mins</span>
                  </div>
                  <span className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                    isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 px-4 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isLoadingData}
          className="h-10 px-6 cursor-pointer flex items-center gap-2 min-w-32"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{submitLabel}</span>
        </Button>
      </div>
    </form>
  );
}
