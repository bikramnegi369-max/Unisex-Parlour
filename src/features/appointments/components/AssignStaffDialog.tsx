"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  assignStaffSchema,
  type AssignStaffSchemaType,
} from "../schemas/appointment.schema";
import {
  useEmployees,
  useMultipleStaffServices,
} from "@/features/employees/hooks/useEmployees";
import { useRescheduleAppointment } from "../hooks/useAppointments";
import { useBranchContext } from "@/hooks/useBranchContext";
import { toast } from "sonner";
import { AlertTriangle, Clock, Play, Sparkles } from "lucide-react";
import type { Appointment } from "../types/appointment.types";
import type { Employee } from "@/features/employees/types/employee.types";

interface AssignStaffDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: AssignStaffSchemaType) => Promise<void>;
  isLoading: boolean;
}

export function AssignStaffDialog({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AssignStaffDialogProps) {
  const { currentBranch } = useBranchContext();
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [syncTimeToNow, setSyncTimeToNow] = useState(true);
  const [startServiceImmediately, setStartServiceImmediately] = useState(false);
  const rescheduleMutation = useRescheduleAppointment();

  const employeeParams = useMemo(() => {
    return {
      limit: 100,
      branchId: appointment?.branchId || undefined,
    };
  }, [appointment?.branchId]);

  const { data: employeesData, isLoading: isLoadingEmployees } =
    useEmployees(employeeParams);
  const employees = useMemo(
    () => employeesData?.data || [],
    [employeesData?.data],
  );

  const employeeIds = useMemo(
    () => employees.map((e: Employee) => e.id),
    [employees],
  );

  const { staffServicesMap, isLoading: isLoadingStaffServices } =
    useMultipleStaffServices(employeeIds);

  const appointmentServiceIds = useMemo(() => {
    if (!appointment) return [];
    if (appointment.serviceIds && appointment.serviceIds.length > 0) {
      return appointment.serviceIds;
    }
    if (appointment.services && appointment.services.length > 0) {
      return appointment.services.map((s) => s.serviceId);
    }
    return [];
  }, [appointment]);

  // Filter staff to only those who are assigned ALL appointment services
  const qualifiedEmployees = useMemo(() => {
    if (appointmentServiceIds.length === 0) {
      return employees;
    }
    return employees.filter((emp: Employee) => {
      const assignedServices = staffServicesMap[emp.id] || [];
      return appointmentServiceIds.every((reqServiceId) =>
        assignedServices.includes(reqServiceId),
      );
    });
  }, [employees, appointmentServiceIds, staffServicesMap]);
  const { register, handleSubmit, setValue, control, reset } =
    useForm<AssignStaffSchemaType>({
      resolver: zodResolver(assignStaffSchema),
      defaultValues: {
        branchId: appointment?.branchId || "",
        staffId: appointment?.staffId || null,
      },
    });

  const selectedStaffId = useWatch({
    control,
    name: "staffId",
  });

  // Check if the appointment date is today in the branch timezone
  const isTodayAppointment = useMemo(() => {
    if (!appointment?.date) return false;
    const branchTz =
      appointment.branch?.timezone || currentBranch?.timezone || "Asia/Kolkata";
    try {
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: branchTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      return appointment.date === todayStr;
    } catch {
      return false;
    }
  }, [appointment, currentBranch?.timezone]);

  // Detect whether this appointment is scheduled for TODAY and its start time has already elapsed
  const isElapsedAppointmentToday = useMemo(() => {
    if (!appointment || !appointment.startTime || !isTodayAppointment) {
      return false;
    }
    const branchTz =
      appointment.branch?.timezone || currentBranch?.timezone || "Asia/Kolkata";
    try {
      const nowParts = new Intl.DateTimeFormat("en-US", {
        timeZone: branchTz,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(new Date());
      const nowH = parseInt(
        nowParts.find((p) => p.type === "hour")?.value || "0",
        10,
      );
      const nowM = parseInt(
        nowParts.find((p) => p.type === "minute")?.value || "0",
        10,
      );
      const nowMinutes = nowH * 60 + nowM;

      const [apptH, apptM] = appointment.startTime.split(":").map(Number);
      const apptMinutes = (apptH || 0) * 60 + (apptM || 0);

      // If scheduled time was more than 3 minutes ago, it's an elapsed appointment
      return nowMinutes > apptMinutes + 3;
    } catch {
      return false;
    }
  }, [appointment, isTodayAppointment, currentBranch?.timezone]);

  // Compute initial auto-start status
  const shouldAutoStartDefault =
    isTodayAppointment &&
    Boolean(
      appointment &&
      (appointment.bookingType === "walk_in" || isElapsedAppointmentToday),
    );

  // Reset dialog states during render when appointment or open status changes
  const [prevSessionKey, setPrevSessionKey] = useState<string | null>(null);
  const currentSessionKey =
    isOpen && appointment ? `${appointment.id}-${isOpen}` : null;

  if (currentSessionKey !== prevSessionKey) {
    setPrevSessionKey(currentSessionKey);
    if (isOpen && appointment) {
      setConflictError(null);
      setSyncTimeToNow(true);
      setStartServiceImmediately(shouldAutoStartDefault);
    } else {
      setConflictError(null);
      setSyncTimeToNow(true);
      setStartServiceImmediately(false);
    }
  }

  useEffect(() => {
    // When the dialog opens with an active appointment, synchronize react-hook-form values
    if (isOpen && appointment) {
      reset({
        branchId: appointment.branchId,
        staffId: appointment.staffId || null,
      });
    }
  }, [isOpen, appointment, reset]);

  const handleFormSubmit = async (data: AssignStaffSchemaType) => {
    if (!appointment) return;
    setConflictError(null);

    try {
      // If user chose to start service immediately or scheduled time has elapsed with sync enabled,
      // align start time to current time (+1 min buffer to prevent backend clock skew)
      const shouldAlignTimeToNow =
        data.staffId &&
        ((isElapsedAppointmentToday && syncTimeToNow) ||
          (isTodayAppointment && startServiceImmediately));

      if (shouldAlignTimeToNow) {
        const now = new Date();
        const safeCurrentTime = new Date(now.getTime() + 60000);
        const currentTimeStr = format(safeCurrentTime, "HH:mm");
        await rescheduleMutation.mutateAsync({
          id: appointment.id,
          payload: {
            branchId: appointment.branchId,
            date: appointment.date,
            startTime: currentTimeStr,
            reason: startServiceImmediately
              ? "Staff assignment: service started immediately at current time"
              : "Staff assignment: service start time aligned to current time",
          },
        });
      }

      await onSubmit(appointment.id, data);
      toast.success("Staff allocation updated successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 409) {
        const msg =
          axiosError.response.data?.message ||
          "Scheduling conflict: The assigned staff member had an overlapping booking at the original scheduled time.";
        setConflictError(msg);
        toast.error(msg);
      } else {
        toast.error(
          axiosError.response?.data?.message ||
            "Failed to update staff allocation.",
        );
      }
    }
  };

  const handleSyncAndAssignNow = async () => {
    if (!appointment || !selectedStaffId) return;
    setConflictError(null);
    try {
      const safeCurrentTime = new Date(Date.now() + 60000);
      const currentTimeStr = format(safeCurrentTime, "HH:mm");
      await rescheduleMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          date: appointment.date,
          startTime: currentTimeStr,
          reason: "Staff assignment: service started at current time",
        },
      });
      await onSubmit(appointment.id, {
        branchId: appointment.branchId,
        staffId: selectedStaffId,
      });

      toast.success("Start time updated to current time and staff assigned!");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError.response?.data?.message || "Failed to start service now.",
      );
    }
  };

  if (!appointment) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Assign / Reassign Staff">
      <div className="space-y-4 text-left">
        {conflictError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  Scheduling Conflict (409):{" "}
                </span>
                {conflictError}
              </div>
            </div>
            {selectedStaffId && (
              <div className="pt-2 border-t border-destructive/20 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-foreground">
                  Was staff busy earlier? Start service at current time instead:
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={handleSyncAndAssignNow}
                  className="h-7 text-xs gap-1 shrink-0"
                >
                  <Play className="h-3 w-3" />
                  Start Service Now ({format(new Date(), "HH:mm")})
                </Button>
              </div>
            )}
          </div>
        )}

        {isElapsedAppointmentToday && !conflictError && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              <span>Elapsed Schedule Time Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Appointment was originally scheduled for{" "}
              <strong className="font-mono">{appointment.startTime}</strong>,
              which has already passed. Syncing to{" "}
              <strong className="font-mono">
                Now ({format(new Date(), "HH:mm")})
              </strong>{" "}
              ensures the staff member&apos;s current schedule is properly
              blocked on the calendar.
            </p>
            <label className="flex items-center gap-2 cursor-pointer pt-0.5 text-[11px] font-medium text-foreground">
              <input
                type="checkbox"
                checked={syncTimeToNow}
                onChange={(e) => setSyncTimeToNow(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span>
                Automatically update appointment start time to current time (
                {format(new Date(), "HH:mm")})
              </span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target Branch (Originating Branch)
            </label>
            <div className="p-2 bg-muted/50 rounded-md border border-border text-foreground font-semibold flex items-center justify-between">
              <span>{appointment.branch?.name || appointment.branchId}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                Read-Only
              </span>
            </div>
          </div>
          <input type="hidden" {...register("branchId")} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Select Staff Member</span>
                {appointmentServiceIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] normal-case font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                    <Sparkles className="h-3 w-3" />
                    {qualifiedEmployees.length}{" "}
                    {qualifiedEmployees.length === 1
                      ? "stylist qualified"
                      : "stylists qualified"}
                  </span>
                )}
              </label>
            </div>
            <Select
              value={selectedStaffId || ""}
              onChange={(e) => {
                setValue("staffId", e.target.value ? e.target.value : null);
              }}
              className="w-full h-9 text-xs"
              disabled={isLoadingEmployees || isLoadingStaffServices}
            >
              <option value="">
                {appointmentServiceIds.length > 0 &&
                qualifiedEmployees.length === 0
                  ? "-- No staff qualified for appointment services --"
                  : "-- Unassigned --"}
              </option>
              {appointment.staffId &&
                !qualifiedEmployees.some(
                  (e: Employee) => e.id === appointment.staffId,
                ) && (
                  <option value={appointment.staffId}>
                    {appointment.staff?.name ||
                      `Staff #${appointment.staffId.slice(-6)}`}{" "}
                    (Currently Assigned)
                  </option>
                )}
              {qualifiedEmployees.map((e: Employee) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.designation ? `(${e.designation})` : ""}
                </option>
              ))}
            </Select>
            {appointmentServiceIds.length > 0 &&
              qualifiedEmployees.length === 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ None of the active branch staff are assigned to perform all
                  services in this appointment.
                </p>
              )}
          </div>

          {/* Start Service Immediately Option */}
          {selectedStaffId && isTodayAppointment && (
            <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1 text-foreground">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={startServiceImmediately}
                  onChange={(e) => setStartServiceImmediately(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-primary">
                  Start service immediately
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground pl-6">
                Client is seated now. Aligns appointment start time to current
                time ({format(new Date(), "HH:mm")}).
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Staff Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
