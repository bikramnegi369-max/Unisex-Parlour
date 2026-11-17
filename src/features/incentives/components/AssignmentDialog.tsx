"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Info, AlertTriangle } from "lucide-react";
import {
  assignmentFormSchema,
  AssignmentFormValues,
} from "../schemas/incentives.schema";
import {
  IncentiveScheme,
  SchemeAssignmentRequest,
  isSupportedIncentiveScheme,
} from "../types/incentives.types";

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: SchemeAssignmentRequest) => Promise<void>;
  schemes: IncentiveScheme[];
  staffList?: Array<{ id: string; name: string; staffCode?: string }>;
  branches?: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}

export const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  schemes,
  staffList = [],
  branches = [],
  isSubmitting = false,
}) => {
  const [conflictError, setConflictError] = useState<string | null>(null);
  const assignableSchemes = useMemo(
    () => schemes.filter((scheme) => scheme.status === "active" && isSupportedIncentiveScheme(scheme)),
    [schemes],
  );

  const {
    register,
    setValue,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema) as unknown as Resolver<AssignmentFormValues>,
    defaultValues: {
      schemeId: "",
      scopeType: "STAFF",
      scopeId: "",
      startDate: new Date().toISOString().split("T")[0],
      priority: 0,
    },
  });

  const selectedScopeType = useWatch({ control, name: "scopeType" });

  const handleClose = () => {
    setConflictError(null);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        schemeId: assignableSchemes[0]?.id || "",
        scopeType: "STAFF",
        scopeId: staffList[0]?.id || "",
        startDate: new Date().toISOString().split("T")[0],
        priority: 0,
      });
    }
  }, [isOpen, assignableSchemes, staffList, reset]);

  const handleFormSubmit = async (data: AssignmentFormValues) => {
    setConflictError(null);
    try {
      const payload: SchemeAssignmentRequest = {
        schemeId: data.schemeId,
        scopeType: data.scopeType,
        scopeId: data.scopeType === "ORGANIZATION" ? null : data.scopeId || null,
        startDate: new Date(`${data.startDate}T00:00:00.000Z`).toISOString(),
        endDate: data.endDate
          ? new Date(`${data.endDate}T00:00:00.000Z`).toISOString()
          : null,
        priority: Number(data.priority || 0),
      };

      await onSubmit(payload);
    } catch (error: unknown) {
      const responseMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : null;
      const errorMsg =
        responseMessage ||
        (error instanceof Error ? error.message : null) ||
        "Failed to create scheme assignment.";
      setConflictError(errorMsg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Incentive Scheme"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Assign Incentive Scheme</h3>
          <p className="text-xs text-muted-foreground">
            Apply an active service commission or verified attendance bonus to a staff member, a branch, or the organization. The most specific active assignment takes precedence.
          </p>
        </div>

        {assignableSchemes.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            No supported active incentive schemes are available to assign.
          </div>
        )}

        {conflictError && (
          <div className="p-2.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{conflictError}</span>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-700" /> Precedence Hierarchy
          </div>
          <div>
            <strong>Staff</strong> (highest) &rarr; <strong>Branch</strong> &rarr; <strong>Organization</strong> (default).
            Overlapping assignments at the same scope tier are strictly rejected.
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Incentive Scheme *</label>
            <Select id="assignment-scheme" disabled={assignableSchemes.length === 0} {...register("schemeId")}>
              {assignableSchemes.length === 0 ? (
                <option value="">No supported active schemes</option>
              ) : (
                assignableSchemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))
              )}
            </Select>
            {errors.schemeId && (
              <p className="text-[11px] text-destructive">{errors.schemeId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="assignment-scope-type" className="text-xs font-medium text-zinc-700">Who does this scheme apply to? *</label>
              <Select
                id="assignment-scope-type"
                {...register("scopeType", {
                  onChange: (event) => {
                    const scopeType = event.target.value;
                    setValue(
                      "scopeId",
                      scopeType === "STAFF"
                        ? staffList[0]?.id || ""
                        : scopeType === "BRANCH"
                          ? branches[0]?.id || ""
                          : "",
                    );
                  },
                })}
              >
                <option value="STAFF">One staff member</option>
                <option value="BRANCH">Everyone in a branch</option>
                <option value="ORGANIZATION">Organization default</option>
              </Select>
            </div>

            {selectedScopeType === "STAFF" && (
              <div className="space-y-1">
                <label htmlFor="assignment-staff" className="text-xs font-medium text-zinc-700">Staff Member *</label>
                <Select id="assignment-staff" {...register("scopeId")}>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.staffCode ? `(${st.staffCode})` : ""}
                    </option>
                  ))}
                </Select>
                {errors.scopeId && (
                  <p className="text-[11px] text-destructive">{errors.scopeId.message}</p>
                )}
              </div>
            )}

            {selectedScopeType === "BRANCH" && (
              <div className="space-y-1">
                <label htmlFor="assignment-branch" className="text-xs font-medium text-zinc-700">Target Branch *</label>
                <Select id="assignment-branch" {...register("scopeId")}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
                {errors.scopeId && (
                  <p className="text-[11px] text-destructive">{errors.scopeId.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="assignment-start-date" className="text-xs font-medium text-zinc-700">Effective Start Date *</label>
              <Input id="assignment-start-date" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-[11px] text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="assignment-end-date" className="text-xs font-medium text-zinc-700">End Date (blank means ongoing)</label>
              <Input id="assignment-end-date" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="assignment-priority" className="text-xs font-medium text-zinc-700">Priority</label>
            <Input
              id="assignment-priority"
              type="number"
              placeholder="0 (higher resolves first)"
              {...register("priority")}
            />
            <p className="text-[11px] text-muted-foreground">
              Effective intervals at the same scope cannot overlap; higher priority does not override an overlap.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || assignableSchemes.length === 0}>
              {isSubmitting ? "Creating Assignment..." : "Confirm Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
