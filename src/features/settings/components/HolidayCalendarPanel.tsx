"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Calendar, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/api/errors";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { createHolidaySchema, type CreateHolidayFormValues } from "../schemas/settings.schema";
import { useCreateHoliday, useDeleteHoliday, useHolidays } from "../hooks/useSettings";
import type { CalendarEventType, HolidayMutationResult } from "../types/settings.types";

const EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; variant: "default" | "secondary" | "warning" | "destructive" | "success" }
> = {
  public_holiday: { label: "Public Holiday", variant: "secondary" },
  org_holiday: { label: "Org Holiday", variant: "secondary" },
  branch_holiday: { label: "Branch Holiday", variant: "warning" },
  branch_closure: { label: "Branch Closure", variant: "destructive" },
  special_working_day: { label: "Special Working Day", variant: "success" },
};

export function HolidayCalendarPanel() {
  const { user } = useAuth();
  const { currentBranchId, currentBranch } = useBranchContext();
  const canEdit = hasPermission(user, "settings.update");
  const { data, isLoading, isError, refetch } = useHolidays(currentBranchId);
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictSummary, setConflictSummary] = useState<HolidayMutationResult["conflicts"] | null>(
    null
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateHolidayFormValues>({
    resolver: zodResolver(createHolidaySchema),
    defaultValues: {
      eventType: "public_holiday",
      date: "",
      endDate: null,
      name: "",
      description: "",
      isPaid: false,
      branchId: currentBranchId || null,
    },
  });

  const onSubmit = async (values: CreateHolidayFormValues) => {
    try {
      const result = await createMutation.mutateAsync({
        ...values,
        branchId:
          values.eventType === "branch_holiday" || values.eventType === "branch_closure"
            ? currentBranchId
            : values.branchId || null,
        endDate: values.endDate || null,
      });
      toast.success(`Calendar entry '${result.holiday.name}' created`);
      setIsCreateOpen(false);
      reset();
      if (result.conflicts.count > 0) {
        setConflictSummary(result.conflicts);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create calendar entry"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      toast.success("Calendar entry deactivated");
      setDeleteTargetId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to deactivate calendar entry"));
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load holiday calendar"
        description="Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Holiday & Operational Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Manage public holidays, organization/branch holidays, temporary closures, and special working days.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Calendar Event
          </Button>
        )}
      </div>

      {conflictSummary && conflictSummary.count > 0 && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4" />
              {conflictSummary.count} Existing Appointment Conflict(s) Detected
            </div>
            <Button size="sm" variant="ghost" onClick={() => setConflictSummary(null)}>
              Dismiss
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Existing appointments were <strong>not</strong> automatically cancelled or reassigned. Please review and reconcile them with affected customers.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {conflictSummary.appointments.slice(0, 6).map((apt) => (
              <Badge key={apt.id} variant="warning">
                {apt.appointmentCode} ({apt.appointmentDate} {apt.startTime})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No calendar events configured"
          description="Add public holidays, branch closures, or special working days to govern scheduling and attendance."
        />
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const meta = EVENT_TYPE_META[item.eventType];
            return (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{item.name}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <Badge variant="outline">
                      {item.branchId ? currentBranch?.name || "Branch-Specific" : "Organization-Wide"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.date}
                    {item.endDate && item.endDate !== item.date ? ` to ${item.endDate}` : ""}
                    {item.description ? ` — ${item.description}` : ""}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTargetId(item.id)}
                    aria-label={`Deactivate ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Calendar Event">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="cal-name" className="text-xs font-medium">
              Event Name <span className="text-destructive">*</span>
            </label>
            <Input id="cal-name" {...register("name")} placeholder="e.g. Diwali Holiday" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="cal-type" className="text-xs font-medium">
                Event Type
              </label>
              <select
                id="cal-type"
                {...register("eventType")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="public_holiday">Public Holiday</option>
                <option value="org_holiday">Organization Holiday</option>
                <option value="branch_holiday">Branch Holiday</option>
                <option value="branch_closure">Branch Closure</option>
                <option value="special_working_day">Special Working Day</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cal-date" className="text-xs font-medium">
                Date <span className="text-destructive">*</span>
              </label>
              <Input id="cal-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cal-desc" className="text-xs font-medium">
              Description
            </label>
            <Input id="cal-desc" {...register("description")} placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Create Event"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        title="Deactivate Calendar Event"
      >
        <p className="text-sm text-muted-foreground pt-2">
          Deactivating this calendar event will stop it from affecting future scheduling and attendance resolution. Historical records remain preserved.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
