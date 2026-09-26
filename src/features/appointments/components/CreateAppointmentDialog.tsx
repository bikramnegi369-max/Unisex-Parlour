"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import type { Customer } from "@/features/customers/types/customer.types";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import type { Service } from "@/features/services/types/service.types";
import type { ServiceCategory } from "@/features/services/types/category.types";
import {
  useEmployees,
  useMultipleStaffServices,
} from "@/features/employees/hooks/useEmployees";
import type { Employee } from "@/features/employees/types/employee.types";
import { useAppointments } from "../hooks/useAppointments";
import type { Appointment } from "../types/appointment.types";
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
  Layers,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Scissors,
  Check,
  ShieldCheck,
  X,
  Trash2,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import type { Subscription } from "@/features/subscriptions/types/subscription.types";

const EMPTY_SERVICES: Service[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];
const EMPTY_APPOINTMENTS: Appointment[] = [];

// Pre-defined quick start time chips for high-velocity front desk booking
const POPULAR_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

// Helper to convert "HH:mm" to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper to convert minutes from midnight to "HH:mm"
function minutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

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
  const watchedCustomerId = useWatch({ control, name: "customerId" });
  const watchedServices = useWatch({ control, name: "services" });
  const selectedStartTime = useWatch({ control, name: "startTime" });
  const selectedDate = useWatch({ control, name: "date" });
  const reminderEnabled = useWatch({ control, name: "reminder.enabled" });
  const selectedBranchId = useWatch({ control, name: "branchId" });
  const selectedStaffId = useWatch({ control, name: "staffId" });

  const effectiveBranchId = useMemo(() => {
    if (selectedBranchId) return selectedBranchId;
    if (currentBranchId && currentBranchId !== "all") return currentBranchId;
    return undefined;
  }, [selectedBranchId, currentBranchId]);

  // True if user is in "All Branches" mode and has not picked a branch yet
  const isBranchSelectionRequired = isAllBranchesSelected && !selectedBranchId;

  const selectedServices = useMemo(
    () => watchedServices || [],
    [watchedServices],
  );
  const selectedServiceIds = useMemo(
    () => selectedServices.map((s) => s.serviceId),
    [selectedServices],
  );

  // Store selected customer summary directly from CustomerSelector
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Fetch customer subscriptions if customer is selected
  const { data: customerSubsData } = useSubscriptions(
    { customerId: watchedCustomerId, status: "active" },
    { enabled: Boolean(watchedCustomerId) },
  );
  const activeSubscriptions: Subscription[] = useMemo(
    () => customerSubsData?.data || [],
    [customerSubsData?.data],
  );

  // Map of serviceId -> available remaining subscription quota across active subscriptions
  const subscriptionQuotaByService = useMemo(() => {
    const map = new Map<
      string,
      {
        subscriptionId: string;
        subscriptionCode: string;
        remaining: number;
        total: number;
        endDate?: string;
      }
    >();
    for (const sub of activeSubscriptions) {
      for (const ent of sub.entitlements || []) {
        if (ent.remainingQuantity > 0) {
          const existing = map.get(ent.serviceId);
          map.set(ent.serviceId, {
            subscriptionId: sub.id,
            subscriptionCode: sub.subscriptionCode,
            remaining: (existing?.remaining || 0) + ent.remainingQuantity,
            total: (existing?.total || 0) + ent.totalQuantity,
            endDate: sub.endDate,
          });
        }
      }
    }
    return map;
  }, [activeSubscriptions]);

  const effectiveBranchTimezone = useMemo(() => {
    if (selectedBranchId) {
      const match = availableBranches.find((b) => b.id === selectedBranchId);
      if (match?.timezone) return match.timezone;
    }
    return currentBranch?.timezone || "Asia/Kolkata";
  }, [selectedBranchId, availableBranches, currentBranch]);

  // Fetch services catalog & categories (all records for booking dialog)
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const { data: categoriesData } = useServiceCategories({ limit: "all" });
  const categories: ServiceCategory[] = useMemo(
    () => categoriesData?.data || [],
    [categoriesData?.data],
  );

  // Filter staff by selected branch
  const employeeParams = useMemo(() => {
    return {
      limit: 100,
      branchId: effectiveBranchId,
    };
  }, [effectiveBranchId]);

  const { data: employeesData, isLoading: isLoadingEmployees } =
    useEmployees(employeeParams);

  const services: Service[] = useMemo(
    () => servicesData?.data || EMPTY_SERVICES,
    [servicesData?.data],
  );
  const employees: Employee[] = useMemo(
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

  // Fetch that day's scheduled/in-progress appointments to calculate real-time staff availability
  const { data: dayAppointmentsData } = useAppointments({
    branchId: effectiveBranchId,
    date: selectedDate || format(new Date(), "yyyy-MM-dd"),
    limit: 200,
  });

  const dayAppointments: Appointment[] = useMemo(() => {
    const list = dayAppointmentsData?.data || EMPTY_APPOINTMENTS;
    return list.filter(
      (app: Appointment) =>
        app.status === "scheduled" || app.status === "in_progress",
    );
  }, [dayAppointmentsData?.data]);

  // Calculate requested total duration
  const requestedDuration = useMemo(() => {
    return selectedServices.reduce((acc, item) => {
      const srv = services.find((s) => s.id === item.serviceId);
      return acc + (srv?.duration || 0);
    }, 0);
  }, [selectedServices, services]);

  // Map of staffId -> availability info for the chosen slot & duration
  const staffAvailabilityMap = useMemo(() => {
    const map = new Map<
      string,
      { isAvailable: boolean; conflictSlot?: string }
    >();
    if (!selectedStartTime) return map;

    const requestedStart = timeToMinutes(selectedStartTime);
    const duration = requestedDuration > 0 ? requestedDuration : 30;
    const requestedEnd = requestedStart + duration;

    for (const emp of employees) {
      // Find any overlapping appointment for this employee
      const conflict = dayAppointments.find((app) => {
        if (!app.staffId || app.staffId !== emp.id) return false;
        const appStart = timeToMinutes(app.startTime);
        const appDuration = app.totalDuration || 30;
        const appEnd = app.endTime
          ? timeToMinutes(app.endTime)
          : appStart + appDuration;

        // Overlap test: [requestedStart, requestedEnd) overlaps with [appStart, appEnd)
        return (
          Math.max(requestedStart, appStart) < Math.min(requestedEnd, appEnd)
        );
      });

      if (conflict) {
        const appStart = conflict.startTime;
        const appDuration = conflict.totalDuration || 30;
        const appEnd =
          conflict.endTime ||
          minutesToTime(timeToMinutes(appStart) + appDuration);
        map.set(emp.id, {
          isAvailable: false,
          conflictSlot: `${appStart} - ${appEnd}`,
        });
      } else {
        map.set(emp.id, { isAvailable: true });
      }
    }

    return map;
  }, [employees, dayAppointments, selectedStartTime, requestedDuration]);

  // Filter services by category pill + search text + selected filter
  const filteredServices = useMemo<Service[]>(() => {
    let result = services;
    if (selectedCategoryId === "selected") {
      result = result.filter((s: Service) => selectedServiceIds.includes(s.id));
    } else if (selectedCategoryId !== "all") {
      result = result.filter((s: Service) => {
        const catId =
          typeof s.categoryId === "object" ? s.categoryId?._id : s.categoryId;
        return catId === selectedCategoryId;
      });
    }
    if (serviceSearch.trim()) {
      const lower = serviceSearch.toLowerCase();
      result = result.filter((s: Service) =>
        s.name.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [services, selectedCategoryId, serviceSearch, selectedServiceIds]);

  // Pricing & duration totals with accurate subscription coverage deductions
  const selectedServicesSummary = useMemo(() => {
    let totalDuration = 0;
    let grossSubtotal = 0;
    let subscriptionDeduction = 0;
    let coveredCount = 0;

    for (const item of selectedServices) {
      const srv = services.find((s: Service) => s.id === item.serviceId);
      if (srv) {
        totalDuration += srv.duration || 0;
        const itemPrice =
          item.customPrice !== undefined && item.customPrice !== null
            ? Number(item.customPrice)
            : (srv.pricing?.basePrice ?? 0);

        grossSubtotal += itemPrice;

        if (item.appliedSubscriptionId) {
          coveredCount += 1;
          subscriptionDeduction += itemPrice;
        }
      }
    }

    const netTotal = Math.max(0, grossSubtotal - subscriptionDeduction);

    return {
      count: selectedServices.length,
      totalDuration,
      grossSubtotal,
      subscriptionDeduction,
      netTotal,
      coveredCount,
    };
  }, [services, selectedServices]);

  // Group filtered services by category for clean accordion navigation when 100s of services exist
  const categorizedServices = useMemo(() => {
    const groups: {
      categoryId: string;
      categoryName: string;
      services: Service[];
    }[] = [];
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.name);
    }

    const groupedMap = new Map<string, Service[]>();

    for (const srv of filteredServices) {
      const rawCatId =
        typeof srv.categoryId === "object"
          ? srv.categoryId?._id
          : srv.categoryId;
      const catId = rawCatId || "uncategorized";
      if (!groupedMap.has(catId)) {
        groupedMap.set(catId, []);
      }
      groupedMap.get(catId)!.push(srv);
    }

    // Preserve category order as given by categories query
    for (const cat of categories) {
      const list = groupedMap.get(cat.id);
      if (list && list.length > 0) {
        groups.push({
          categoryId: cat.id,
          categoryName: cat.name,
          services: list,
        });
        groupedMap.delete(cat.id);
      }
    }

    // Append any remaining categories
    for (const [catId, list] of groupedMap.entries()) {
      if (list.length > 0) {
        groups.push({
          categoryId: catId,
          categoryName:
            categoryMap.get(catId) ||
            (catId === "uncategorized" ? "General / Other" : "Category"),
          services: list,
        });
      }
    }

    return groups;
  }, [filteredServices, categories]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const isCurrentlyOpen = prev[catId] === false;
      return {
        ...prev,
        [catId]: isCurrentlyOpen ? true : false,
      };
    });
  };

  // Synchronize dialog open/reset
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setConflictError(null);
      setServiceSearch("");
      setSelectedCategoryId("all");
      setCollapsedCategories({});
      setSelectedCustomer(null);
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
    prevIsOpen.current = isOpen;
  }, [isOpen, currentBranchId, defaultBookingType, reset]);

  // Synchronize branch changes while dialog is open:
  // If staff was assigned for branch A, but target branch changes to B, reset staffId to prevent cross-branch leaks.
  const prevBranchIdRef = useRef(effectiveBranchId);
  useEffect(() => {
    if (!isOpen) {
      prevBranchIdRef.current = effectiveBranchId;
      return;
    }

    if (
      prevBranchIdRef.current !== undefined &&
      prevBranchIdRef.current !== effectiveBranchId
    ) {
      // Branch changed while dialog open
      if (selectedStaffId) {
        setValue("staffId", null);
        toast.info(
          "Assigned staff was cleared because the target branch changed.",
        );
      }
    }
    prevBranchIdRef.current = effectiveBranchId;
  }, [effectiveBranchId, selectedStaffId, setValue, isOpen]);

  // Use a callback ref so that the wheel listener is reliably attached to Quick Slots
  const setQuickSlotsRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const onWheelHandler = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          e.stopPropagation();
          node.scrollLeft += e.deltaY;
        }
      };

      node.addEventListener("wheel", onWheelHandler, { passive: false });
      (node as unknown as { _cleanupWheel?: () => void })._cleanupWheel =
        () => {
          node.removeEventListener("wheel", onWheelHandler);
        };
    }
  }, []);

  // Use a callback ref so that horizontal mouse wheel scrolling works seamlessly on Category Filter Tabs
  const setCategoryTabsRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const onWheelHandler = (e: WheelEvent) => {
          if (e.deltaY !== 0) {
            e.preventDefault();
            e.stopPropagation();
            node.scrollLeft += e.deltaY;
          }
        };

        node.addEventListener("wheel", onWheelHandler, { passive: false });
        (node as unknown as { _cleanupWheel?: () => void })._cleanupWheel =
          () => {
            node.removeEventListener("wheel", onWheelHandler);
          };
      }
    },
    [],
  );

  const handleFormSubmit = async (data: CreateAppointmentSchemaType) => {
    setConflictError(null);

    const formattedServices = (data.services || []).map((s) => ({
      serviceId: s.serviceId,
      customPrice:
        s.customPrice !== undefined && s.customPrice !== null
          ? Number(s.customPrice)
          : undefined,
      appliedSubscriptionId: s.appliedSubscriptionId || undefined,
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

    // Validate that the appointment does not spill past calendar midnight (1440 minutes)
    if (data.startTime && selectedServicesSummary.totalDuration > 0) {
      const startMin = timeToMinutes(data.startTime);
      const endMin = startMin + selectedServicesSummary.totalDuration;
      if (endMin > 1440) {
        toast.error(
          `Overnight appointments across calendar midnight are not supported. This booking starts at ${data.startTime} and takes ${selectedServicesSummary.totalDuration} mins (ends past midnight at ${minutesToTime(endMin)}). Please adjust the start time or split into multiple appointments.`
        );
        return;
      }
    }

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

  // Measure available height inside the Summary Card so the services list fills the entire card down to the action buttons before scrolling
  const summaryCardRef = useRef<HTMLDivElement>(null);
  const [servicesMaxHeight, setServicesMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cardEl = summaryCardRef.current;
    if (!cardEl) return;

    const measureCardSpace = () => {
      // The card's rendered height (stretched by flex-1 to fill the column)
      const cardHeight = cardEl.clientHeight;
      if (cardHeight > 100) {
        // Find header and discount elements inside the card to compute exact remaining height
        const headerEl = cardEl.querySelector(".booking-summary-header");
        const discountEl = cardEl.querySelector(".booking-summary-discount");
        const headerHeight = headerEl ? (headerEl as HTMLElement).offsetHeight : 60;
        const discountHeight = discountEl ? (discountEl as HTMLElement).offsetHeight : 0;
        // Total internal padding (p-4 is 16px top + 16px bottom = 32px) + flex gap (gap-3 is 12px)
        const innerPaddingAndGaps = 32 + 16;
        const exactAvailable = cardHeight - headerHeight - discountHeight - innerPaddingAndGaps;
        setServicesMaxHeight(Math.max(160, exactAvailable));
      }
    };

    // Run initial measurement
    measureCardSpace();

    const observer = new ResizeObserver(() => {
      measureCardSpace();
    });

    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [isOpen, selectedServicesSummary.coveredCount]);

  const handleRemoveService = (serviceId: string) => {
    const updated = selectedServices.filter((s) => s.serviceId !== serviceId);
    const updatedSelectedServiceIds = updated.map((s) => s.serviceId);
    setValue("services", updated, { shouldValidate: true });
    setValue("serviceIds", updatedSelectedServiceIds);

    // Verify assigned staff capability
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

  const handleServiceToggle = (service: Service) => {
    const isSelected = selectedServices.some((s) => s.serviceId === service.id);

    if (isSelected) {
      handleRemoveService(service.id);
    } else {
      const defaultPrice = service.pricing?.basePrice ?? 0;
      // Auto-attach active subscription entitlement if available for this customer
      const subQuota = subscriptionQuotaByService.get(service.id);
      const appliedSubscriptionId =
        subQuota && subQuota.remaining > 0 ? subQuota.subscriptionId : null;

      const updated = [
        ...selectedServices,
        {
          serviceId: service.id,
          customPrice: defaultPrice,
          appliedSubscriptionId,
        },
      ];
      const updatedSelectedServiceIds = updated.map((s) => s.serviceId);
      setValue("services", updated, { shouldValidate: true });
      setValue("serviceIds", updatedSelectedServiceIds);

      // Verify assigned staff capability
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
    }
  };

  const handleCustomPriceChange = (serviceId: string, rawPrice: string) => {
    const updated = selectedServices.map((s) => {
      if (s.serviceId !== serviceId) return s;
      if (rawPrice.trim() === "") {
        return { ...s, customPrice: undefined };
      }
      const parsed = parseFloat(rawPrice);
      return {
        ...s,
        customPrice: isNaN(parsed) ? 0 : Math.max(0, parsed),
      };
    });
    setValue("services", updated, { shouldValidate: true });
  };

  const handleToggleSubscriptionCoverage = (
    serviceId: string,
    subId: string | null,
  ) => {
    const updated = selectedServices.map((s) => {
      if (s.serviceId !== serviceId) return s;
      const currentlyApplied = s.appliedSubscriptionId === subId;
      return {
        ...s,
        appliedSubscriptionId: currentlyApplied ? null : subId,
      };
    });
    setValue("services", updated, { shouldValidate: true });
  };

  const dialogTitle =
    bookingType === "walk_in"
      ? "New Walk-In Appointment"
      : "New Advance Booking";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      maxWidth="4xl"
      className="h-[92vh] max-h-[92vh] w-full flex flex-col p-0 overflow-hidden"
    >
      <div className="flex flex-col h-full min-h-0 text-left">
        {/* Top Control Bar: Booking Type Selector & Branch / Timezone Context */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border border-border">
            <button
              type="button"
              onClick={() => {
                setValue("bookingType", "advance", { shouldValidate: true });
                setValue("reminder.enabled", true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                bookingType === "advance"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Advance Booking
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("bookingType", "walk_in", { shouldValidate: true });
                setValue("date", format(new Date(), "yyyy-MM-dd"), {
                  shouldValidate: true,
                });
                setValue("startTime", format(new Date(), "HH:mm"), {
                  shouldValidate: true,
                });
                setValue("reminder.enabled", false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                bookingType === "walk_in"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-purple-600" />
              Walk-In (Now)
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {isAllBranchesSelected && (
              <div className="w-56">
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
              </div>
            )}
            {!isAllBranchesSelected && (
              <div className="flex items-center gap-1 font-medium text-foreground text-xs">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{currentBranch?.name || "Active Branch"}</span>
              </div>
            )}
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              ({effectiveBranchTimezone})
            </span>
          </div>
        </div>

        {/* Global Branch Requirement Banner if in "All Branches" mode */}
        {isBranchSelectionRequired && (
          <div className="mx-6 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Please select a specific <strong>Target Branch</strong> in the
              top-right before scheduling to view branch-specific staff
              availability and localized slots.
            </span>
          </div>
        )}

        {/* Conflict Notice Alert */}
        {conflictError && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl space-y-1.5 text-xs text-destructive animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Scheduling Conflict: </span>
                {conflictError}
              </div>
            </div>
            {selectedStaffId && (
              <div className="flex items-center gap-2 pt-1 border-t border-destructive/20 text-[11px] text-foreground">
                <span>Stylist occupied?</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue("staffId", null);
                    setConflictError(null);
                  }}
                  className="font-semibold text-primary underline hover:text-primary/80 cursor-pointer"
                >
                  Place into &quot;Unassigned Floor Queue&quot;
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2-Column Responsive Body with balanced 6/6 width ratio */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch"
        >
          {/* LEFT COLUMN: Customer Selection, Catalog Browser & Scheduling (6 Cols) */}
          <div className="lg:col-span-6 space-y-5 flex flex-col justify-start lg:overflow-y-auto lg:pr-2 min-h-0">
            {/* Step 1: Customer Card & Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  1. Customer Details{" "}
                  <span className="text-destructive">*</span>
                </label>
                {watchedCustomerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("customerId", "", { shouldValidate: true });
                      setSelectedCustomer(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Change Customer
                  </button>
                )}
              </div>

              {!watchedCustomerId ? (
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <CustomerSelector
                      value={field.value}
                      onChange={(id, customer) => {
                        field.onChange(id);
                        if (customer) {
                          setSelectedCustomer(customer);
                        }
                      }}
                      branchId={selectedBranchId || undefined}
                      error={errors.customerId?.message}
                      disabled={isLoading}
                    />
                  )}
                />
              ) : (
                <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                      {selectedCustomer?.name
                        ? selectedCustomer.name.slice(0, 2).toUpperCase()
                        : "CU"}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-xs flex items-center gap-2">
                        {selectedCustomer?.name || "Selected Customer"}
                        {activeSubscriptions.length > 0 && (
                          <span className="text-[10px] bg-primary/15 text-primary font-bold px-1.5 py-0.5 rounded border border-primary/25 flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {activeSubscriptions.length}{" "}
                            {activeSubscriptions.length === 1
                              ? "Active Plan"
                              : "Active Plans"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedCustomer?.phone || "No phone registered"}{" "}
                        {selectedCustomer?.email
                          ? `• ${selectedCustomer.email}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedCustomer?.homeBranchId && effectiveBranchId && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          selectedCustomer.homeBranchId === effectiveBranchId
                            ? "text-blue-600 bg-blue-500/10 border-blue-500/20"
                            : "text-amber-600 bg-amber-500/10 border-amber-500/20"
                        }`}
                        title={
                          selectedCustomer.homeBranchId === effectiveBranchId
                            ? "This branch is the customer's home branch"
                            : "Visiting client from another branch in your organization"
                        }
                      >
                        {selectedCustomer.homeBranchId === effectiveBranchId
                          ? "Home Client"
                          : "Visiting Client"}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Service Catalog Selector (Production-Grade High-Density Master-Detail UX) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-primary" />
                  2. Select Services <span className="text-destructive">*</span>
                </label>
                {selectedServicesSummary.count > 0 && (
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {selectedServicesSummary.count} selected (
                    {selectedServicesSummary.totalDuration} mins)
                  </span>
                )}
              </div>

              {/* Search + Category Filter Tabs */}
              <div className="space-y-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-1">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search all services by name..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="h-9 text-xs pl-9 pr-8 rounded-lg bg-card border-border shadow-xs"
                  />
                  {serviceSearch && (
                    <button
                      type="button"
                      onClick={() => setServiceSearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Horizontal Category Pill Carousel with Dedicated 'Selected' Quick Filter & Wheel Scroll */}
                <div
                  ref={setCategoryTabsRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth scrollbar-none overscroll-x-contain overscroll-y-contain text-xs"
                >
                  {selectedServiceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId("selected")}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1 shrink-0 ${
                        selectedCategoryId === "selected"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-3" />
                      Selected ({selectedServiceIds.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId("all")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border shrink-0 ${
                      selectedCategoryId === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    All Services ({services.length})
                  </button>

                  {categories.map((cat: ServiceCategory) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border shrink-0 ${
                        selectedCategoryId === cat.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Cards Grid - Upgraded High-Density Rows with Zero Truncation */}
              {isLoadingServices ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading services catalog...</span>
                </div>
              ) : categorizedServices.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                  {selectedCategoryId === "selected"
                    ? "No services selected yet. Pick from the catalog to see them here."
                    : "No services found matching your filter."}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-95 overflow-y-auto pr-1 rounded-lg">
                  {categorizedServices.map((group) => {
                    // Default behavior: All categories are CLOSED on start.
                    // Active search or explicit click opens them.
                    const isSearchingActively = Boolean(serviceSearch.trim());
                    // When un-collapsed explicitly, collapsedCategories[id] === false.
                    // By default (undefined), categories remain closed.
                    const isExplicitlyOpen =
                      collapsedCategories[group.categoryId] === false;
                    const isCollapsed = isSearchingActively
                      ? false
                      : !isExplicitlyOpen;

                    const selectedCountInGroup = group.services.filter((s) =>
                      selectedServiceIds.includes(s.id),
                    ).length;

                    return (
                      <div
                        key={group.categoryId}
                        className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
                      >
                        {/* Category Header */}
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          aria-label={`Toggle category ${group.categoryName}`}
                          onClick={() =>
                            toggleCategoryCollapse(group.categoryId)
                          }
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="font-bold">
                              {group.categoryName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({group.services.length})
                            </span>
                          </div>
                          {selectedCountInGroup > 0 && (
                            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">
                              {selectedCountInGroup} selected
                            </span>
                          )}
                        </button>

                        {/* High-Density Service List Rows with Full Text Visibility (No Truncation) */}
                        {!isCollapsed && (
                          <div className="divide-y divide-border/40">
                            {group.services.map((srv: Service) => {
                              const isChecked = selectedServiceIds.includes(
                                srv.id,
                              );
                              const basePrice = srv.pricing?.basePrice ?? 0;
                              const subQuota = subscriptionQuotaByService.get(
                                srv.id,
                              );
                              const isCovered = Boolean(
                                subQuota && subQuota.remaining > 0,
                              );

                              return (
                                <div
                                  key={srv.id}
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  tabIndex={0}
                                  aria-label={srv.name}
                                  onClick={() => handleServiceToggle(srv)}
                                  onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                      e.preventDefault();
                                      handleServiceToggle(srv);
                                    }
                                  }}
                                  className={`px-3.5 py-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between gap-3 select-none focus-visible:outline-none focus-visible:bg-accent/40 ${
                                    isChecked
                                      ? "bg-primary/5 hover:bg-primary/10"
                                      : "hover:bg-muted/40"
                                  }`}
                                >
                                  {/* Left: Checkbox + Full Name (No Truncation) + Badges */}
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <div
                                      aria-hidden="true"
                                      className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                        isChecked
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "border-muted-foreground/40 bg-background"
                                      }`}
                                    >
                                      {isChecked && (
                                        <Check className="h-3 w-3 stroke-3" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className={`font-semibold leading-snug wrap-break-word ${
                                            isChecked
                                              ? "text-primary"
                                              : "text-foreground"
                                          }`}
                                        >
                                          {srv.name}
                                        </span>
                                        {isCovered && (
                                          <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                                            Plan Quota
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground block pt-0.5">
                                        {srv.duration} mins • Standard:{" "}
                                        {formatCurrency(basePrice)}
                                      </span>
                                      {srv.description && (
                                        <p className="text-[10px] text-muted-foreground/80 pt-0.5 leading-normal wrap-break-word whitespace-normal">
                                          {srv.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Base Price + Quick Action Indicator */}
                                  <div className="flex items-center gap-2.5 shrink-0 text-right pl-2">
                                    <span className="font-extrabold text-foreground text-xs">
                                      {formatCurrency(basePrice)}
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                                        isChecked
                                          ? "bg-primary text-primary-foreground shadow-2xs"
                                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                      }`}
                                    >
                                      {isChecked ? "Added" : "+ Add"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {(errors.services || errors.serviceIds) && (
                <span className="text-[11px] text-destructive font-medium block">
                  {errors.services?.message || errors.serviceIds?.message}
                </span>
              )}
            </div>

            {/* Step 3: Schedule Time (Date, Time, Quick Slots) */}
            <div className="p-3.5 bg-card rounded-xl border border-border space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                3. Schedule Time
              </label>

              {/* Date Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Date
                  </span>
                  {bookingType === "walk_in" && (
                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      Today Only
                    </span>
                  )}
                </div>
                <Input
                  type="date"
                  {...register("date")}
                  disabled={bookingType === "walk_in"}
                  className={`h-8 text-xs ${
                    bookingType === "walk_in"
                      ? "opacity-75 bg-muted/50 cursor-not-allowed"
                      : "bg-background"
                  }`}
                />
                {errors.date && (
                  <span className="text-[11px] text-destructive">
                    {errors.date.message}
                  </span>
                )}
              </div>

              {/* Time Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Start Time
                  </span>
                  {bookingType === "walk_in" && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setValue("startTime", format(new Date(), "HH:mm"), {
                            shouldValidate: true,
                          })
                        }
                        className="text-primary hover:underline font-bold"
                      >
                        Now
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setMinutes(d.getMinutes() + 15);
                          setValue("startTime", format(d, "HH:mm"), {
                            shouldValidate: true,
                          });
                        }}
                        className="text-primary hover:underline font-bold"
                      >
                        +15m
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  type="time"
                  {...register("startTime")}
                  className="h-8 text-xs bg-background"
                />
                {/* Calculated End Time & Midnight Spillage Warning */}
                {selectedStartTime && selectedServicesSummary.totalDuration > 0 && (() => {
                  const startMin = timeToMinutes(selectedStartTime);
                  const endMin = startMin + selectedServicesSummary.totalDuration;
                  const isPastMidnight = endMin > 1440;
                  return isPastMidnight ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-medium leading-tight">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Ends at {minutesToTime(endMin)} (+1 day). Salons cannot book across midnight. Please pick an earlier time or fewer services.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Est. End Time:</span>
                      <span className="font-semibold text-foreground">
                        {minutesToTime(endMin)} ({selectedServicesSummary.totalDuration} mins)
                      </span>
                    </div>
                  );
                })()}
                {errors.startTime && (
                  <span className="text-[11px] text-destructive">
                    {errors.startTime.message}
                  </span>
                )}
              </div>

              {/* Quick Start Time Chips with Mouse-Wheel Horizontal Scroll & Container Lock */}
              {bookingType === "advance" && (
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold uppercase">
                    <span>Quick Slots</span>
                    <span className="text-[9px] lowercase font-normal opacity-70">
                      scroll horizontally ↔
                    </span>
                  </div>
                  <div
                    ref={setQuickSlotsRef}
                    onWheel={(e) => {
                      if (e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth scrollbar-none overscroll-x-contain overscroll-y-contain"
                  >
                    {POPULAR_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setValue("startTime", slot, {
                            shouldValidate: true,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border cursor-pointer whitespace-nowrap transition-colors ${
                          selectedStartTime === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Staff Assignment (With real-time slot conflict tags evaluated for the chosen time above) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  4. Assign Stylist / Staff
                </label>
                {selectedServiceIds.length > 0 && (
                  <span className="text-[11px] text-primary font-medium">
                    {qualifiedEmployees.length}{" "}
                    {qualifiedEmployees.length === 1
                      ? "staff qualified"
                      : "staff qualified"}
                  </span>
                )}
              </div>

              {isBranchSelectionRequired ? (
                <div className="p-2.5 border border-dashed border-border rounded-lg bg-muted/20 text-xs text-muted-foreground">
                  Select a branch first to inspect employee availability.
                </div>
              ) : (
                <Select
                  value={selectedStaffId || ""}
                  onChange={(e) =>
                    setValue("staffId", e.target.value ? e.target.value : null)
                  }
                  className="w-full h-9 text-xs bg-card"
                  disabled={isLoadingEmployees || isLoadingStaffServices}
                >
                  <option value="">
                    {selectedServiceIds.length > 0 &&
                    qualifiedEmployees.length === 0
                      ? "-- No staff assigned to chosen services (Floor Queue) --"
                      : "-- Unassigned (Floor Queue) --"}
                  </option>
                  {qualifiedEmployees.map((e: Employee) => {
                    const avail = staffAvailabilityMap.get(e.id);
                    const isBusy = avail ? !avail.isAvailable : false;
                    const busyTag = isBusy
                      ? ` [Busy: ${avail?.conflictSlot || "Conflict"}]`
                      : "";

                    return (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.designation ? `(${e.designation})` : ""}
                        {busyTag}
                      </option>
                    );
                  })}
                </Select>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Reminders & Live Ledger Summary (6 Cols) */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0">
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Step 5: Notification Reminders */}
              {bookingType === "advance" ? (
                <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-2.5 text-xs shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-bold text-foreground block">
                          Customer Reminder
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Automated multi-channel notification
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
                    <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Channel
                        </label>
                        <Controller
                          name="reminder.channel"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value as "sms" | "email" | "both",
                                )
                              }
                              className="h-8 text-xs bg-background py-0"
                            >
                              <option value="both">📱 + ✉️ Both</option>
                              <option value="sms">📱 SMS</option>
                              <option value="email">✉️ Email</option>
                            </Select>
                          )}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Timing
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
                              className="h-8 text-xs bg-background py-0"
                            >
                              <option value="30">30 mins before</option>
                              <option value="60">1 hour before</option>
                              <option value="120">2 hours before</option>
                              <option value="1440">1 day before</option>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Step 6: Notes */}
              <div className="space-y-1 shrink-0">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Internal Notes
                </label>
                <Textarea
                  {...register("notes")}
                  placeholder="Preferences, allergy cautions, requests..."
                  className="text-xs resize-none h-14 bg-card rounded-lg"
                />
              </div>

              {/* Order Ledger & Summary Card - Takes Full Height Available Matching Left Column */}
              <div
                ref={summaryCardRef}
                className="flex-1 min-h-0 p-4 bg-card rounded-xl border border-border shadow-xs flex flex-col gap-3 text-xs"
              >
                {/* Header: Net Payable & Duration Overview */}
                <div className="booking-summary-header flex items-center justify-between pb-3 border-b border-border shrink-0">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Booking Summary
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedServicesSummary.count} service(s) •{" "}
                      {selectedServicesSummary.totalDuration} mins total
                      duration
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Net Payable
                    </span>
                    <span className="text-base font-extrabold text-primary">
                      {formatCurrency(selectedServicesSummary.netTotal)}
                    </span>
                    {selectedServicesSummary.subscriptionDeduction > 0 && (
                      <span className="block text-[10px] text-muted-foreground line-through font-normal">
                        Gross:{" "}
                        {formatCurrency(selectedServicesSummary.grossSubtotal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Itemized Service Lines - Stretches to Fill Available Card Height, Then Scrolls */}
                {selectedServices.length === 0 ? (
                  <div className="flex-1 min-h-35 flex items-center justify-center p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">
                    No services selected yet. Pick services from the left
                    catalog to itemize pricing and plan coverage.
                  </div>
                ) : (
                  <div
                    style={
                      servicesMaxHeight
                        ? { maxHeight: `${servicesMaxHeight}px` }
                        : undefined
                    }
                    className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1"
                  >
                    {selectedServices.map((item) => {
                      const srv = services.find(
                        (s: Service) => s.id === item.serviceId,
                      );
                      const srvName = srv?.name || item.serviceId;
                      const basePrice = srv?.pricing?.basePrice ?? 0;
                      const currentEffectivePrice =
                        item.customPrice !== undefined &&
                        item.customPrice !== null
                          ? item.customPrice
                          : basePrice;
                      const hasSub = Boolean(item.appliedSubscriptionId);
                      const subQuota = subscriptionQuotaByService.get(
                        item.serviceId,
                      );
                      const canRedeemPlan = Boolean(
                        subQuota && subQuota.remaining > 0,
                      );

                      return (
                        <div
                          key={item.serviceId}
                          className={`rounded-xl px-3.5 py-2.5 border transition-all text-xs ${
                            hasSub
                              ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20"
                              : "bg-muted/20 border-border hover:border-border/80"
                          }`}
                        >
                          {/* Row 1: Name, Duration & Custom Price Input */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground text-xs leading-snug wrap-break-word">
                                  {srvName}
                                </span>
                                {hasSub && (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0 whitespace-nowrap">
                                    Covered by Plan
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block pt-0.5">
                                {srv?.duration || 0} mins • Standard:{" "}
                                {formatCurrency(basePrice)}
                              </span>
                            </div>

                            {/* Compact Custom Price Input & Remove Action */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-0.5 shadow-2xs">
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.customPrice ?? ""}
                                  placeholder={String(basePrice)}
                                  onChange={(e) =>
                                    handleCustomPriceChange(
                                      item.serviceId,
                                      e.target.value,
                                    )
                                  }
                                  className="w-18 text-xs font-bold text-right bg-transparent text-foreground focus:outline-none"
                                  title="Custom price for this appointment"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveService(item.serviceId)
                                }
                                className="h-7 w-7 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors cursor-pointer"
                                title="Remove service from booking"
                                aria-label={`Remove ${srvName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Customer Plan Quota Row or Standard Billing */}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40 text-[11px]">
                            {canRedeemPlan ? (
                              <div className="flex flex-col items-start gap-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleSubscriptionCoverage(
                                      item.serviceId,
                                      subQuota!.subscriptionId,
                                    )
                                  }
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                                    hasSub
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700"
                                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                  }`}
                                >
                                  {hasSub ? (
                                    <>
                                      <Check className="h-3 w-3 stroke-3" />
                                      <span>
                                        Covered ({subQuota!.subscriptionCode})
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      <span>Apply Plan Quota</span>
                                    </>
                                  )}
                                </button>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 pl-0.5">
                                  <span>
                                    (
                                    {hasSub
                                      ? Math.max(0, subQuota!.remaining - 1)
                                      : subQuota!.remaining}{" "}
                                    of {subQuota!.total} left
                                    {hasSub ? " after this booking" : ""})
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Standard Billing
                              </span>
                            )}

                            {/* Final Effective Line Amount */}
                            <div className="text-right shrink-0 flex flex-col items-end">
                              {hasSub ? (
                                <>
                                  <span className="line-through text-muted-foreground text-[10px] font-normal leading-tight">
                                    {formatCurrency(currentEffectivePrice)}
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs leading-tight">
                                    ₹0.00
                                  </span>
                                </>
                              ) : (
                                <span className="font-extrabold text-foreground text-xs leading-tight">
                                  {formatCurrency(currentEffectivePrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Plan Total Discount Callout - Upgraded Savings Card UI/UX */}
                {selectedServicesSummary.coveredCount > 0 && (
                  <div className="booking-summary-discount relative overflow-hidden p-3 rounded-xl bg-linear-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/10 border border-emerald-500/30 shadow-xs shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-foreground">
                            Subscription Plan Applied
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0">
                              {selectedServicesSummary.coveredCount} covered
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">
                          Total Waived
                        </span>
                        <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 tracking-tight">
                          -
                          {formatCurrency(
                            selectedServicesSummary.subscriptionDeduction,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              {/* Midnight boundary spill validation flag */}
              {(() => {
                const startMin = selectedStartTime ? timeToMinutes(selectedStartTime) : 0;
                const endMin = startMin + selectedServicesSummary.totalDuration;
                const isOvernightSpill = Boolean(
                  selectedStartTime &&
                  selectedServicesSummary.totalDuration > 0 &&
                  endMin > 1440
                );

                return (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isLoading ||
                      selectedServices.length === 0 ||
                      isOvernightSpill
                    }
                    className="text-xs h-8 px-4 gap-1.5 font-bold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Creating Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Book Appointment
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
