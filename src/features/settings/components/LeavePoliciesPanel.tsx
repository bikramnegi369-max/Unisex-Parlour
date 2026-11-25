"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/api/errors";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { createLeavePolicySchema, type CreateLeavePolicyFormValues } from "../schemas/settings.schema";
import {
  useCreateLeavePolicy,
  useDeactivateLeavePolicy,
  useLeavePolicies,
} from "../hooks/useSettings";

export function LeavePoliciesPanel() {
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canEdit = hasPermission(user, "settings.update");
  const { data, isLoading, isError, refetch } = useLeavePolicies(currentBranchId);
  const createMutation = useCreateLeavePolicy();
  const deactivateMutation = useDeactivateLeavePolicy();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLeavePolicyFormValues>({
    resolver: zodResolver(createLeavePolicySchema),
    defaultValues: {
      code: "",
      name: "",
      isPaid: true,
      annualEntitlement: 12,
      carryForwardLimit: 0,
      allowHalfDay: true,
      excludeHolidays: true,
      excludeWeeklyOffs: true,
      excessBehavior: "reject",
      allowNegativeBalance: false,
      negativeBalancePayrollTreatment: "unpaid_deduction",
    },
  });

  const isPaid = watch("isPaid");
  const allowHalfDay = watch("allowHalfDay");
  const excludeHolidays = watch("excludeHolidays");
  const excludeWeeklyOffs = watch("excludeWeeklyOffs");
  const allowNegativeBalance = watch("allowNegativeBalance");

  const onSubmit = async (values: CreateLeavePolicyFormValues) => {
    try {
      await createMutation.mutateAsync({
        ...values,
        branchId: null,
      });
      toast.success(`Leave policy '${values.code.toUpperCase()}' created`);
      setIsCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create leave policy"));
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTargetId) return;
    try {
      await deactivateMutation.mutateAsync(deactivateTargetId);
      toast.success("Leave policy deactivated");
      setDeactivateTargetId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to deactivate leave policy"));
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load leave policies"
        description="Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Policies</h2>
          <p className="text-sm text-muted-foreground">
            Authoritative leave entitlement rules, holiday/weekly-off exclusions, and excess-leave behavior.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Leave Policy
          </Button>
        )}
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No central leave policies configured"
          description="Employees without a central policy fall back to their SalaryStructure paid leave configuration."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((policy) => (
            <Card key={policy.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{policy.name}</span>
                    <Badge variant="outline">{policy.code}</Badge>
                    <Badge variant={policy.isPaid ? "success" : "muted"}>
                      {policy.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entitlement: {policy.annualEntitlement} days/year • Excess:{" "}
                    {policy.excessBehavior === "convert_to_unpaid"
                      ? "Convert to Unpaid (Manager Confirm)"
                      : "Reject"}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeactivateTargetId(policy.id)}
                    aria-label={`Deactivate ${policy.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {policy.allowHalfDay && <Badge variant="secondary">Half-day allowed</Badge>}
                {policy.excludeHolidays && <Badge variant="secondary">Excludes holidays</Badge>}
                {policy.excludeWeeklyOffs && <Badge variant="secondary">Excludes weekly offs</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Leave Policy">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="lp-code" className="text-xs font-medium">
                Policy Code <span className="text-destructive">*</span>
              </label>
              <Input id="lp-code" {...register("code")} placeholder="e.g. CASUAL" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-name" className="text-xs font-medium">
                Display Name <span className="text-destructive">*</span>
              </label>
              <Input id="lp-name" {...register("name")} placeholder="e.g. Casual Leave" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="lp-entitlement" className="text-xs font-medium">
                Annual Entitlement (days)
              </label>
              <Input id="lp-entitlement" type="number" min={0} {...register("annualEntitlement", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-carry-forward" className="text-xs font-medium">
                Carry Forward Limit (days)
              </label>
              <Input id="lp-carry-forward" type="number" min={0} {...register("carryForwardLimit", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="lp-excess" className="text-xs font-medium">
                Excess Leave Behavior
              </label>
              <select
                id="lp-excess"
                {...register("excessBehavior")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="reject">Reject when balance insufficient</option>
                <option value="convert_to_unpaid">Convert excess to Unpaid (requires confirmation)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lp-neg-treatment" className="text-xs font-medium">
                Negative Balance Payroll Treatment
              </label>
              <select
                id="lp-neg-treatment"
                {...register("negativeBalancePayrollTreatment")}
                disabled={!allowNegativeBalance}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
              >
                <option value="unpaid_deduction">Unpaid Deduction</option>
                <option value="carry_deficit">Carry Deficit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Paid Leave Policy</span>
              <Switch
                checked={Boolean(isPaid)}
                onCheckedChange={(v) => setValue("isPaid", v)}
                aria-label="Paid Leave Policy"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Allow Half-Day</span>
              <Switch
                checked={Boolean(allowHalfDay)}
                onCheckedChange={(v) => setValue("allowHalfDay", v)}
                aria-label="Allow Half-Day"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Exclude Holidays</span>
              <Switch
                checked={Boolean(excludeHolidays)}
                onCheckedChange={(v) => setValue("excludeHolidays", v)}
                aria-label="Exclude Holidays"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Exclude Weekly Offs</span>
              <Switch
                checked={Boolean(excludeWeeklyOffs)}
                onCheckedChange={(v) => setValue("excludeWeeklyOffs", v)}
                aria-label="Exclude Weekly Offs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow Negative Balance</p>
              <p className="text-xs text-muted-foreground">Permit leave approval even when balance is 0</p>
            </div>
            <Switch
              checked={Boolean(allowNegativeBalance)}
              onCheckedChange={(v) => setValue("allowNegativeBalance", v)}
              aria-label="Allow Negative Balance"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Policy"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(deactivateTargetId)}
        onClose={() => setDeactivateTargetId(null)}
        title="Deactivate Leave Policy"
      >
        <p className="text-sm text-muted-foreground pt-2">
          Deactivating this policy prevents it from applying to new leave approvals. Historical leave records and balance ledger entries remain intact.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setDeactivateTargetId(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDeactivate} disabled={deactivateMutation.isPending}>
            {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
