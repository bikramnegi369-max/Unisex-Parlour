"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
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
import {
  useEmployees,
  useMultipleStaffServices,
} from "@/features/employees/hooks/useEmployees";
import type { Employee } from "@/features/employees/types/employee.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Bell,
  AlertTriangle,
  Search,
  MapPin,
  Loader2,
  Sparkles,
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
    reset,
    formState: { errors },
  } = useForm<CreateAppointmentSchemaType>({
    resolver: zodResolver(
      createAppointmentSchema,
    ) as unknown as Resolver<CreateAppointmentSchemaType>,
    defaultValues: {
      branchId: currentBranchId || "",
      customerId: "",
      services: [],
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

  const bookingType = useWatch({ control, name: "bookingType" });
  const watchedServices = useWatch({ control, name: "services" });
  const selectedServices = useMemo(
    () => watchedServices || [],
    [watchedServices],
  );
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.serviceId),
    [selectedServices],
  );
  const reminderEnabled = useWatch({ control, name: "reminder.enabled" });
  const selectedBranchId = useWatch({ control, name: "branchId" });
  const selectedStaffId = useWatch({ control, name: "staffId" });

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

  const employeeIds = useMemo(
    () => employees.map((e: Employee) => e.id),
    [employees],
  );

  const { staffServicesMap, isLoading: isLoadingStaffServices } =
    useMultipleStaffServices(employeeIds);

  // Filter staff to only those who are assigned ALL selected services
  const qualifiedEmployees = useMemo(() => {
    if (selectedServiceIds.length === 0) {
      return employees;
    }
    return employees.filter((emp: Employee) => {
      const assignedServices = staffServicesMap[emp.id] || [];
      return selectedServiceIds.every((reqServiceId) =>
        assignedServices.includes(reqServiceId),
      );
    });
  }, [employees, selectedServiceIds, staffServicesMap]);

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
    let totalDuration = 0;
    let estimatedSubtotal = 0;

    for (const item of selectedServices) {
      const srv = rawServices.find((s: Service) => s.id === item.serviceId);
      if (srv) {
        totalDuration += srv.duration || 0;
        const price =
          item.customPrice !== undefined && item.customPrice !== null
            ? Number(item.customPrice)
            : (srv.pricing?.basePrice ?? 0);
        estimatedSubtotal += price;
      }
    }
    return { count: selectedServices.length, totalDuration, estimatedSubtotal };
  }, [servicesData?.data, selectedServices]);

  // Reset transient state during render when dialog opens (avoids cascading render warning)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (conflictError !== null) setConflictError(null);
      if (serviceSearch !== "") setServiceSearch("");
    }
  }

  useEffect(() => {
    if (isOpen) {
      reset({
        branchId: currentBranchId || "",
        customerId: "",
        services: [],
        serviceIds: [],
        staffId: null,
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: format(new Date(), "HH:mm"),
        bookingType: defaultBookingType,
        notes: "",
        reminder: {
          enabled: defaultBookingType === "advance",
          channel: "both",
          offsetMinutes: 60,
        },
      });
    }
  }, [isOpen, currentBranchId, defaultBookingType, reset]);

  const handleFormSubmit = async (data: CreateAppointmentSchemaType) => {
    setConflictError(null);

    const formattedServices = (data.services || []).map((s) => ({
      serviceId: s.serviceId,
      customPrice:
        s.customPrice !== undefined && s.customPrice !== null
          ? Number(s.customPrice)
          : undefined,
    }));

    // Enforce production invariants: walk-in appointments are strictly today and require no reminders
    const payload: CreateAppointmentSchemaType =
      data.bookingType === "walk_in"
        ? {
            ...data,
            services: formattedServices,
            serviceIds: formattedServices.map((s) => s.serviceId),
            date: format(new Date(), "yyyy-MM-dd"),
            reminder: {
              enabled: false,
              channel: "both",
              offsetMinutes: 60,
            },
          }
        : {
            ...data,
            services: formattedServices,
            serviceIds: formattedServices.map((s) => s.serviceId),
          };

    try {
      await onSubmit(payload);
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

  const handleServiceToggle = (service: Service) => {
    const isSelected = selectedServices.some((s) => s.serviceId === service.id);
    let updatedSelectedServiceIds: string[] = [];

    if (isSelected) {
      const updated = selectedServices.filter(
        (s) => s.serviceId !== service.id,
      );
      updatedSelectedServiceIds = updated.map((s) => s.serviceId);
      setValue("services", updated, { shouldValidate: true });
      setValue("serviceIds", updatedSelectedServiceIds);
    } else {
      const defaultPrice = service.pricing?.basePrice ?? 0;
      const updated = [
        ...selectedServices,
        { serviceId: service.id, customPrice: defaultPrice },
      ];
      updatedSelectedServiceIds = updated.map((s) => s.serviceId);
      setValue("services", updated, { shouldValidate: true });
      setValue("serviceIds", updatedSelectedServiceIds);
    }

    // If a staff member is currently selected, verify they still offer all chosen services
    if (selectedStaffId && updatedSelectedServiceIds.length > 0) {
      const staffServices = staffServicesMap[selectedStaffId] || [];
      const isStillQualified = updatedSelectedServiceIds.every((srvId) =>
        staffServices.includes(srvId),
      );
      if (!isStillQualified) {
        setValue("staffId", null);
        const assignedStaffObj = employees.find(
          (e: Employee) => e.id === selectedStaffId,
        );
        toast.info(
          `${assignedStaffObj?.name || "Selected staff"} was unassigned because they do not offer all selected services.`,
        );
      }
    }
  };

  const handleCustomPriceChange = (serviceId: string, customPrice: number) => {
    const updated = selectedServices.map((s) =>
      s.serviceId === serviceId ? { ...s, customPrice } : s,
    );
    setValue("services", updated, { shouldValidate: true });
  };

  const dialogTitle =
    bookingType === "walk_in"
      ? "New Walk-In Appointment"
      : "New Advance Appointment";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle}>
      <div className="space-y-4 text-left">
        {conflictError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Scheduling Conflict: </span>
                {conflictError}
              </div>
            </div>
            {selectedStaffId && (
              <div className="flex items-center gap-2 pt-1 border-t border-destructive/20 text-[11px]">
                <span>Stylist busy?</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue("staffId", null);
                    setConflictError(null);
                  }}
                  className="font-semibold text-primary underline hover:text-primary/80"
                >
                  Switch to &quot;Unassigned (Floor Queue)&quot;
                </button>
              </div>
            )}
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
                  onClick={() => {
                    setValue("bookingType", "advance", {
                      shouldValidate: true,
                    });
                    setValue("reminder.enabled", true);
                  }}
                  className="text-xs h-7 px-3"
                >
                  Advance Booking
                </Button>
                <Button
                  type="button"
                  variant={bookingType === "walk_in" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setValue("bookingType", "walk_in", {
                      shouldValidate: true,
                    });
                    setValue("date", format(new Date(), "yyyy-MM-dd"), {
                      shouldValidate: true,
                    });
                    setValue("startTime", format(new Date(), "HH:mm"), {
                      shouldValidate: true,
                    });
                    setValue("reminder.enabled", false);
                  }}
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
                  branchId={selectedBranchId || undefined}
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
              <div className="p-4 text-center text-xs text-muted-foreground border border-input rounded-md bg-background flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Loading services...</span>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-input rounded-md bg-background">
                {serviceSearch.trim()
                  ? "No services found matching your search."
                  : "No services available in catalog."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-input rounded-md bg-background">
                {filteredServices.map((srv: Service) => {
                  const isChecked = selectedServiceIds.includes(srv.id);
                  const basePrice = srv.pricing?.basePrice ?? 0;
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
                        onChange={() => handleServiceToggle(srv)}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <div className="flex-1 truncate">
                        <div className="font-semibold">{srv.name}</div>
                        <div className="text-[10px] opacity-75">
                          {srv.duration} mins • Catalog:{" "}
                          {formatCurrency(basePrice)}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Appointment Pricing Per Service
                  </span>
                  <span className="text-[10px] text-muted-foreground italic">
                    Custom price applies only to this appointment
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedServices.map((selectedItem) => {
                    const srv = services.find(
                      (s: Service) => s.id === selectedItem.serviceId,
                    );
                    const catalogPrice = srv?.pricing?.basePrice ?? 0;
                    return (
                      <div
                        key={selectedItem.serviceId}
                        className="flex items-center justify-between gap-3 p-2 bg-muted/40 rounded-md border border-border text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground truncate">
                            {srv?.name || "Selected Service"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Base: {formatCurrency(catalogPrice)} •{" "}
                            {srv?.duration || 0} mins
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label
                            htmlFor={`appt-price-${selectedItem.serviceId}`}
                            className="text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                          >
                            Appointment Price:
                          </label>
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1.5 text-[11px] text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              id={`appt-price-${selectedItem.serviceId}`}
                              type="number"
                              min="0"
                              step="1"
                              value={selectedItem.customPrice ?? catalogPrice}
                              onChange={(e) =>
                                handleCustomPriceChange(
                                  selectedItem.serviceId,
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              className="h-7 text-xs pl-5 py-0 font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(errors.services || errors.serviceIds) && (
              <span className="text-[11px] text-destructive block">
                {errors.services?.message || errors.serviceIds?.message}
              </span>
            )}
          </div>

          {/* Staff Selection (Filtered by service capabilities) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Assign Staff</span>
                {selectedServiceIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] normal-case font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                    <Sparkles className="h-3 w-3" />
                    {qualifiedEmployees.length}{" "}
                    {qualifiedEmployees.length === 1
                      ? "stylist offers"
                      : "stylists offer"}{" "}
                    chosen service(s)
                  </span>
                )}
                {selectedServiceIds.length === 0 && (
                  <span className="text-muted-foreground font-normal normal-case">
                    (Optional / Unassigned)
                  </span>
                )}
              </label>
              {bookingType === "walk_in" && !selectedStaffId && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Floor Queue Mode
                </span>
              )}
            </div>
            <Select
              value={selectedStaffId || ""}
              onChange={(e) =>
                setValue("staffId", e.target.value ? e.target.value : null)
              }
              className="w-full h-9 text-xs"
              disabled={isLoadingEmployees || isLoadingStaffServices}
            >
              <option value="">
                {selectedServiceIds.length > 0 &&
                qualifiedEmployees.length === 0
                  ? "-- No staff available for selected services (Floor Queue) --"
                  : "-- Unassigned (Floor Queue) --"}
              </option>
              {qualifiedEmployees.map((e: Employee) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.designation ? `(${e.designation})` : ""}
                </option>
              ))}
            </Select>
            {selectedServiceIds.length > 0 &&
            qualifiedEmployees.length === 0 ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ None of the active branch staff are currently assigned to all
                selected services. Keep unassigned to queue or adjust selected
                services.
              </p>
            ) : bookingType === "walk_in" ? (
              <p className="text-[10px] text-muted-foreground">
                {selectedStaffId
                  ? "Assigned to specific staff. If they are busy right now, choose 'Unassigned' to place client in the floor queue."
                  : "💡 Recommended if all stylists are busy: client is queued and can be assigned as soon as any stylist finishes."}
              </p>
            ) : null}
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date <span className="text-destructive">*</span>
                </label>
                {bookingType === "walk_in" && (
                  <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                    Today (Walk-in)
                  </span>
                )}
              </div>
              <Input
                type="date"
                {...register("date")}
                disabled={bookingType === "walk_in"}
                className={`h-9 text-xs ${bookingType === "walk_in" ? "opacity-75 bg-muted/50 cursor-not-allowed" : ""}`}
              />
              {bookingType === "walk_in" ? (
                <p className="text-[10px] text-muted-foreground">
                  Walk-ins are strictly registered for today&apos;s floor
                  roster.
                </p>
              ) : null}
              {errors.date && (
                <span className="text-[11px] text-destructive">
                  {errors.date.message}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Start Time <span className="text-destructive">*</span>
                </label>
                {bookingType === "walk_in" && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setValue("startTime", format(new Date(), "HH:mm"), {
                          shouldValidate: true,
                        })
                      }
                      className="text-[10px] text-primary hover:underline"
                    >
                      Now
                    </button>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSlot = new Date();
                        nextSlot.setMinutes(nextSlot.getMinutes() + 15);
                        setValue("startTime", format(nextSlot, "HH:mm"), {
                          shouldValidate: true,
                        });
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      +15m
                    </button>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSlot = new Date();
                        nextSlot.setMinutes(nextSlot.getMinutes() + 30);
                        setValue("startTime", format(nextSlot, "HH:mm"), {
                          shouldValidate: true,
                        });
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      +30m
                    </button>
                  </div>
                )}
              </div>
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

          {/* Reminder Section (Only applicable for Advance Bookings) */}
          {bookingType === "advance" ? (
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
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
          ) : (
            <div className="p-2.5 bg-purple-500/5 rounded-lg border border-purple-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Bell className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[11px]">
                  Reminders are disabled for walk-in visits (client is present
                  in salon).
                </span>
              </div>
            </div>
          )}

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
