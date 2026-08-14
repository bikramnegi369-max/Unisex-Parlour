"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import {
  createAppointmentSchema,
  type CreateAppointmentSchemaType,
} from "../schemas/appointment.schema";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { useServices } from "@/features/services/hooks/services/useServices";
import type { Service } from "@/features/services/types/service.types";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import type { Employee } from "@/features/employees/types/employee.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Calendar,
  Bell,
  AlertTriangle,
  Search,
  Scissors,
  User,
  MapPin,
} from "lucide-react";

const EMPTY_SERVICES: Service[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];


interface CreateAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAppointmentSchemaType) => Promise<void>;
  isLoading: boolean;
  defaultBookingType?: "advance" | "walk_in";
}

export function CreateAppointmentDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  defaultBookingType = "advance",
}: CreateAppointmentDialogProps) {
  const {
    currentBranchId,
    currentBranch,
    isAllBranchesSelected,
    availableBranches,
  } = useBranchContext();
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  const activeBranches = availableBranches.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
  }));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAppointmentSchemaType>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      branchId: currentBranchId || "",
      customerId: "",
      serviceIds: [],
      staffId: null,
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "10:00",
      bookingType: defaultBookingType,
      notes: "",
      reminder: {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
      },
    },
  });

  const bookingType = watch("bookingType");
  const selectedServiceIds = watch("serviceIds") || [];
  const reminderEnabled = watch("reminder.enabled");
  const selectedBranchId = watch("branchId");

  const effectiveBranchTimezone = useMemo(() => {
    if (selectedBranchId) {
      const match = availableBranches.find((b) => b.id === selectedBranchId);
      if (match?.timezone) return match.timezone;
    }
    return currentBranch?.timezone || "Asia/Kolkata";
  }, [selectedBranchId, availableBranches, currentBranch]);

  // Fetch dropdown data
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: 100,
  });
  const employeeParams = useMemo(() => {
    return {
      limit: 100,
      branchId:
        selectedBranchId ||
        (currentBranchId !== "all" ? currentBranchId || undefined : undefined),
    };
  }, [selectedBranchId, currentBranchId]);

  const { data: employeesData, isLoading: isLoadingEmployees } =
    useEmployees(employeeParams);

  const services = useMemo(
    () => servicesData?.data || EMPTY_SERVICES,
    [servicesData?.data],
  );
  const employees = useMemo(
    () => employeesData?.data || EMPTY_EMPLOYEES,
    [employeesData?.data],
  );

  // Filter services by search term
  const filteredServices = useMemo<Service[]>(() => {
    if (!serviceSearch.trim()) return services;
    const lower = serviceSearch.toLowerCase();
    return services.filter((s: Service) =>
      s.name.toLowerCase().includes(lower),
    );
  }, [services, serviceSearch]);

  // Display-only estimation totals (authoritative pricing is computed by backend!)
  const selectedServicesSummary = useMemo(() => {
    const rawServices = servicesData?.data || [];
    const selected = rawServices.filter((s: Service) =>
      selectedServiceIds.includes(s.id),
    );
    const totalDuration = selected.reduce(
      (sum: number, s: Service) => sum + (s.duration || 0),
      0,
    );
    const estimatedSubtotal = selected.reduce(
      (sum: number, s: Service) => sum + (s.pricing?.basePrice ?? 0),
      0,
    );
    return { count: selected.length, totalDuration, estimatedSubtotal };
  }, [servicesData?.data, selectedServiceIds]);

  useEffect(() => {
    if (isOpen) {
      setConflictError(null);
      setServiceSearch("");
      reset({
        branchId: currentBranchId || "",

        customerId: "",
        serviceIds: [],
        staffId: null,
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: format(new Date(), "HH:mm"),
        bookingType: defaultBookingType,
        notes: "",
        reminder: {
          enabled: true,
          channel: "both",
          offsetMinutes: 60,
        },
      });
    }
  }, [isOpen, currentBranchId, defaultBookingType, reset]);

  const handleFormSubmit = async (data: CreateAppointmentSchemaType) => {
    setConflictError(null);
    try {
      await onSubmit(data);
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 409) {
        const msg =
          axiosError.response.data?.message ||
          "Scheduling conflict: The selected staff or time slot is unavailable.";
        setConflictError(msg);
        toast.error(msg);
      } else {
        toast.error(
          axiosError.response?.data?.message || "Failed to create appointment.",
        );
      }
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setValue(
        "serviceIds",
        selectedServiceIds.filter((id) => id !== serviceId),
        { shouldValidate: true },
      );
    } else {
      setValue("serviceIds", [...selectedServiceIds, serviceId], {
        shouldValidate: true,
      });
    }
  };

  const dialogTitle =
    bookingType === "walk_in"
      ? "New Walk-In Appointment"
      : "New Advance Appointment";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle}>
      <div className="space-y-4 text-left">
        {conflictError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Scheduling Conflict (409): </span>
              {conflictError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Booking Type Switcher */}
          <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Booking Type:
              </label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={bookingType === "advance" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setValue("bookingType", "advance")}
                  className="text-xs h-7 px-3"
                >
                  Advance Booking
                </Button>
                <Button
                  type="button"
                  variant={bookingType === "walk_in" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setValue("bookingType", "walk_in")}
                  className="text-xs h-7 px-3"
                >
                  Walk-In
                </Button>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" />
              Timezone: {effectiveBranchTimezone}
            </div>
          </div>

          {/* Branch Selection (Required when All Branches is selected) */}
          {isAllBranchesSelected ? (
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <MutationBranchSelector
                  value={field.value}
                  onChange={field.onChange}
                  branches={activeBranches}
                  error={errors.branchId?.message}
                />
              )}
            />
          ) : (
            <input type="hidden" {...register("branchId")} />
          )}

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer <span className="text-destructive">*</span>
            </label>

            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <CustomerSelector
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  error={errors.customerId?.message}
                  disabled={isLoading}
                />
              )}
            />
          </div>


          {/* Services Selection with Search & Live Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Services <span className="text-destructive">*</span>
              </label>
              {selectedServicesSummary.count > 0 && (
                <span className="text-[11px] font-bold text-primary">
                  {selectedServicesSummary.count} selected (Est.{" "}
                  {selectedServicesSummary.totalDuration} mins •{" "}
                  {formatCurrency(selectedServicesSummary.estimatedSubtotal)})
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="h-8 text-xs pl-8 mb-1.5"
              />
            </div>

            {isLoadingServices ? (
              <div className="text-xs text-muted-foreground">
                Loading services...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-input rounded-md bg-background">
                {filteredServices.map((srv: Service) => {
                  const isChecked = selectedServiceIds.includes(srv.id);
                  const servicePrice = srv.pricing?.basePrice ?? 0;
                  return (
                    <label
                      key={srv.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "bg-primary/10 border-primary text-foreground font-medium"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleServiceToggle(srv.id)}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <div className="flex-1 truncate">
                        <div className="font-semibold">{srv.name}</div>
                        <div className="text-[10px] opacity-75">
                          {srv.duration} mins • {formatCurrency(servicePrice)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {errors.serviceIds && (
              <span className="text-[11px] text-destructive">
                {errors.serviceIds.message}
              </span>
            )}
          </div>

          {/* Staff Selection (Optional / Unassigned) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assign Staff{" "}
              <span className="text-muted-foreground font-normal">
                (Optional / Unassigned)
              </span>
            </label>
            <Select
              value={watch("staffId") || ""}
              onChange={(e) =>
                setValue("staffId", e.target.value ? e.target.value : null)
              }
              className="w-full h-9 text-xs"
              disabled={isLoadingEmployees}
            >
              <option value="">-- Unassigned (Floor Queue) --</option>
              {employees.map((e: Employee) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.designation ? `(${e.designation})` : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                {...register("date")}
                className="h-9 text-xs"
              />
              {errors.date && (
                <span className="text-[11px] text-destructive">
                  {errors.date.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Start Time <span className="text-destructive">*</span>
              </label>
              <Input
                type="time"
                {...register("startTime")}
                className="h-9 text-xs"
              />
              {errors.startTime && (
                <span className="text-[11px] text-destructive">
                  {errors.startTime.message}
                </span>
              )}
            </div>
          </div>

          {/* Reminder Section */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <div>
                  <span className="font-semibold text-foreground block">
                    Customer Reminder
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Automated notification before appointment
                  </span>
                </div>
              </div>
              <Controller
                name="reminder.enabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                {/* Channel Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase">
                    Delivery Channel
                  </label>
                  <Controller
                    name="reminder.channel"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "sms" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("sms")}
                          className="text-xs h-8"
                        >
                          📱 SMS
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "email" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("email")}
                          className="text-xs h-8"
                        >
                          ✉️ Email
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "both" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("both")}
                          className="text-xs h-8"
                        >
                          📱 + ✉️ Both
                        </Button>
                      </div>
                    )}
                  />
                </div>

                {/* Timing / Offset Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase">
                    Notification Timing
                  </label>
                  <Controller
                    name="reminder.offsetMinutes"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={String(field.value ?? 60)}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full h-8 text-xs py-0"
                      >
                        <option value="15">15 minutes before</option>
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                        <option value="120">2 hours before</option>
                        <option value="1440">1 day before</option>
                      </Select>
                    )}
                  />
                </div>

                {/* Dynamic Branch Timezone Notice */}
                <div className="p-2 bg-primary/5 rounded border border-primary/20 text-[10px] text-muted-foreground space-y-0.5">
                  <div className="font-semibold text-primary">
                    Server Scheduling Info:
                  </div>
                  <div>
                    Exact reminder time will be calculated by the server using
                    branch timezone:{" "}
                    <span className="font-bold text-foreground">
                      {isAllBranchesSelected && !selectedBranchId
                        ? "Select branch above"
                        : effectiveBranchTimezone}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </label>
            <Textarea
              {...register("notes")}
              placeholder="Add optional internal booking notes..."
              className="text-xs resize-none h-16"
            />
          </div>

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
              {isLoading ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
