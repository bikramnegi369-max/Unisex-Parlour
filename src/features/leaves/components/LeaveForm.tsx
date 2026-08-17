"use client";
import React, { useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createLeaveSchema,
  updateLeaveSchema,
  type CreateLeaveFormValues,
} from "../schemas/leaves.schema";
import type { Leave, CreateLeavePayload, UpdateLeavePayload } from "../types/leaves.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { mapBackendValidationErrors } from "@/lib/api/errors";
import { Loader2 } from "lucide-react";

interface LeaveFormProps {
  initialLeave?: Leave;
  onSubmit: (data: CreateLeavePayload | UpdateLeavePayload) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  error?: unknown;
}

export default function LeaveForm({
  initialLeave,
  onSubmit,
  isSubmitting,
  onCancel,
  submitLabel,
  error,
}: LeaveFormProps) {
  const isEditMode = !!initialLeave;
  const { user } = useAuth();
  const canManage = hasPermission(user, "employees.leaves.manage");

  // Fetch active employees if the user has manage permission (for on-behalf creation)
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    status: "active",
    limit: 100,
  });

  const defaultValues = useMemo(() => {
    if (!initialLeave) {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`;
      return {
        staffId: "",
        leaveType: "",
        startDate: todayStr,
        endDate: todayStr,
        reason: "",
      };
    }

    return {
      staffId: initialLeave.staffId || "",
      leaveType: initialLeave.leaveType || "",
      startDate: initialLeave.startDate || "",
      endDate: initialLeave.endDate || "",
      reason: initialLeave.reason || "",
    };
  }, [initialLeave]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
  } = useForm<CreateLeaveFormValues>({
    resolver: zodResolver(isEditMode ? updateLeaveSchema : createLeaveSchema) as unknown as Resolver<CreateLeaveFormValues>,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (error) {
      mapBackendValidationErrors(error, setError);
    }
  }, [error, setError]);

  const handleFormSubmit = (values: CreateLeaveFormValues) => {
    if (isEditMode) {
      // Update payload allows only specific fields
      const updatePayload: UpdateLeavePayload = {
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
      };
      onSubmit(updatePayload);
    } else {
      const createPayload: CreateLeavePayload = {
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
      };
      // Only attach staffId if canManage and staffId is explicitly selected (non-empty)
      if (canManage && values.staffId) {
        createPayload.staffId = values.staffId;
      }
      onSubmit(createPayload);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 py-1 text-left">
      <div className="space-y-4">
        {/* On-behalf staff selector (Only for managers, only on create) */}
        {!isEditMode && canManage && (
          <div>
            <label htmlFor="staffId" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Apply For Staff Member (Optional - Omit for Self-Service)
            </label>
            {isLoadingEmployees ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading active staff...
              </div>
            ) : (
              <select
                id="staffId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                {...register("staffId")}
              >
                <option value="">Self-Service (Current Authenticated User)</option>
                {employeesData?.data.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.staffCode || emp.designation})
                  </option>
                ))}
              </select>
            )}
            {errors.staffId && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.staffId.message}</p>}
          </div>
        )}

        {isEditMode && (
          <div>
            <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Staff Member
            </label>
            <div className="p-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground font-medium">
              {initialLeave.name || "Self Service"}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="leaveType" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Leave Type (e.g. Sick, Casual, Earned) <span className="text-destructive">*</span>
          </label>
          <Input
            id="leaveType"
            placeholder="e.g. Sick Leave"
            className={errors.leaveType ? "border-destructive focus-visible:ring-destructive" : ""}
            disabled={isSubmitting}
            {...register("leaveType")}
          />
          {errors.leaveType && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.leaveType.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              Start Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="startDate"
              type="date"
              className={errors.startDate ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("startDate")}
            />
            {errors.startDate && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.startDate.message}</p>}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
              End Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="endDate"
              type="date"
              className={errors.endDate ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSubmitting}
              {...register("endDate")}
            />
            {errors.endDate && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.endDate.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Reason for Leave <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reason"
            placeholder="Please detail the reason for requesting leave..."
            className={`min-h-[100px] ${errors.reason ? "border-destructive focus-visible:ring-destructive" : ""}`}
            disabled={isSubmitting}
            {...register("reason")}
          />
          {errors.reason && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.reason.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
