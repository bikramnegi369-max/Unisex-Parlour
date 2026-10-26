"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Scissors,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Check,
  Sparkles,
  Search,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  User,
  Layers,
  LayoutGrid,
  X,
  Phone,
  Tag,
  BookOpen,
} from "lucide-react";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import {
  usePreviewAppointmentServices,
  useCommitAppointmentServices,
} from "../hooks/useAppointments";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import type { Subscription } from "@/features/subscriptions/types/subscription.types";
import type {
  Appointment,
  ServiceModificationItem,
  ServiceModificationPreviewData,
} from "../types/appointment.types";
import type { Service } from "@/features/services/types/service.types";
import type { ServiceCategory } from "@/features/services/types/category.types";

interface EditAppointmentServicesDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  canEdit: boolean;
}

export function EditAppointmentServicesDialog({
  appointment,
  isOpen,
  onClose,
  onSuccess,
  canEdit,
}: EditAppointmentServicesDialogProps) {
  // 1. Fetch available services for the target branch
  const { data: servicesData, isLoading: isLoadingServices } = useServices({
    limit: "all",
  });
  const allServices: Service[] = useMemo(
    () => servicesData?.data || [],
    [servicesData?.data],
  );

  // 1b. Fetch categories for grouping
  const { data: categoriesData } = useServiceCategories({ limit: "all" });
  const allCategories: ServiceCategory[] = useMemo(
    () => categoriesData?.data || [],
    [categoriesData?.data],
  );

  // 1c. Fetch active & pending_payment customer subscriptions for automatic/suggested plan coverage
  const customerId = appointment?.customerId;
  const { data: customerSubscriptionsData, isLoading: isLoadingCustomerSubs } =
    useSubscriptions(
      { customerId: customerId || "", limit: 50 },
      { enabled: Boolean(isOpen && customerId) },
    );

  const activeCustomerSubscriptions: Subscription[] = useMemo(
    () =>
      (customerSubscriptionsData?.data || []).filter((s: Subscription) => {
        return s.status === "active" || s.status === "pending_payment";
      }),
    [customerSubscriptionsData?.data],
  );

  // Build remaining quota map per serviceId across active customer subscriptions
  const subscriptionQuotaByService = useMemo(() => {
    const map = new Map<
      string,
      {
        subscriptionId: string;
        subscriptionCode: string;
        planName?: string;
        total: number;
        used: number;
        remaining: number;
        paymentStatus?: string;
        amountDue?: number;
        isRedeemable: boolean;
      }
    >();

    for (const sub of activeCustomerSubscriptions) {
      const planName =
        sub.planId && typeof sub.planId === "object"
          ? sub.planId.name
          : undefined;

      for (const ent of sub.entitlements || []) {
        const isRedeemable = ent.isRedeemable !== false;
        const remaining = ent.totalQuantity - (ent.usedQuantity || 0);
        if (remaining > 0 && isRedeemable) {
          const current = map.get(ent.serviceId);
          if (!current || remaining > current.remaining) {
            map.set(ent.serviceId, {
              subscriptionId: sub.id,
              subscriptionCode: sub.subscriptionCode,
              planName,
              total: ent.totalQuantity,
              used: ent.usedQuantity || 0,
              remaining,
              paymentStatus: sub.paymentStatus,
              amountDue: sub.amountDue,
              isRedeemable,
            });
          }
        }
      }
    }
    return map;
  }, [activeCustomerSubscriptions]);

  // 2. Local state for proposed service lines
  const [selectedLines, setSelectedLines] = useState<
    Array<{
      serviceId?: string | null;
      name: string;
      duration: number;
      basePrice: number;
      price: number;
      customPrice?: number;
      appliedSubscriptionId?: string | null;
      isRedeemedViaSubscription?: boolean;
      serviceType?: "registered" | "custom";
      isCustom?: boolean;
      _id?: string;
      id?: string;
    }>
  >([]);

  // 2b. Add custom service modal state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customServiceName, setCustomServiceName] = useState("");
  const [customServiceDuration, setCustomServiceDuration] = useState("30");
  const [customServicePrice, setCustomServicePrice] = useState("");
  const [customServiceError, setCustomServiceError] = useState<string | null>(null);

  // 3. Staged preview state
  const [previewData, setPreviewData] =
    useState<ServiceModificationPreviewData | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [isCatalogueExpanded, setIsCatalogueExpanded] = useState<boolean>(true); // Default open for seamless discoverability
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [managerOverrideReason, setManagerOverrideReason] =
    useState<string>("");

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const previewMutation = usePreviewAppointmentServices();
  const commitMutation = useCommitAppointmentServices();

  // Reset dialog state during render when appointment or isOpen session changes
  const [prevSessionKey, setPrevSessionKey] = useState<string | null>(null);
  const currentSessionKey =
    isOpen && appointment ? `${appointment.id}-${isOpen}` : null;

  if (currentSessionKey !== prevSessionKey) {
    setPrevSessionKey(currentSessionKey);
    if (isOpen && appointment) {
      setSelectedLines(
        (appointment.services || []).map((s) => {
          const isCustom = Boolean(s.isCustom || s.serviceType === "custom" || !s.serviceId);
          return {
            serviceId: s.serviceId || null,
            name: s.name,
            duration: s.duration,
            basePrice: s.price,
            price: s.price,
            customPrice: s.price, // Preserve customer-agreed price snapshot
            appliedSubscriptionId: isCustom ? null : s.appliedSubscriptionId,
            isRedeemedViaSubscription: isCustom ? false : s.isRedeemedViaSubscription,
            serviceType: isCustom ? ("custom" as const) : ("registered" as const),
            isCustom,
            _id: s._id,
            id: s.id,
          };
        }),
      );
      setPreviewData(null);
      setServiceSearchQuery("");
      setSelectedCategoryFilter("all");
      setIsCatalogueExpanded(true);
      setExpandedCategories({});
      setManagerOverrideReason("");
      setShowAddCustomModal(false);
      setCustomServiceName("");
      setCustomServiceDuration("30");
      setCustomServicePrice("");
      setCustomServiceError(null);
    } else {
      setSelectedLines([]);
      setPreviewData(null);
      setServiceSearchQuery("");
      setSelectedCategoryFilter("all");
      setIsCatalogueExpanded(true);
      setExpandedCategories({});
      setManagerOverrideReason("");
      setShowAddCustomModal(false);
      setCustomServiceName("");
      setCustomServiceDuration("30");
      setCustomServicePrice("");
      setCustomServiceError(null);
    }
  }

  // Filter available services for quick search & categories
  const filteredAvailableServices = useMemo(() => {
    let result = allServices;

    if (selectedCategoryFilter !== "all") {
      result = result.filter((s) => {
        const catId =
          typeof s.categoryId === "object" && s.categoryId !== null
            ? (s.categoryId as { _id?: string; id?: string })._id ||
              (s.categoryId as { _id?: string; id?: string }).id
            : s.categoryId;
        return catId === selectedCategoryFilter;
      });
    }

    if (serviceSearchQuery.trim()) {
      const q = serviceSearchQuery.toLowerCase();
      result = result.filter((s) => {
        const catName =
          typeof s.categoryId === "object" && s.categoryId?.name
            ? s.categoryId.name.toLowerCase()
            : "";
        const codeStr = s.code ? s.code.toLowerCase() : "";
        return (
          s.name.toLowerCase().includes(q) ||
          catName.includes(q) ||
          codeStr.includes(q)
        );
      });
    }

    return result;
  }, [allServices, serviceSearchQuery, selectedCategoryFilter]);

  // Group services by category for clean, non-truncated catalog browsing
  const categorizedServices = useMemo(() => {
    const map = new Map<
      string,
      { categoryId: string; categoryName: string; services: Service[] }
    >();

    for (const s of filteredAvailableServices) {
      const catId =
        typeof s.categoryId === "object" && s.categoryId !== null
          ? (s.categoryId as { _id?: string; id?: string })._id ||
            (s.categoryId as { _id?: string; id?: string }).id ||
            "uncategorized"
          : (s.categoryId as string) || "uncategorized";

      const catName =
        typeof s.categoryId === "object" && s.categoryId?.name
          ? s.categoryId.name
          : allCategories.find((c) => c._id === catId || c.id === catId)
              ?.name || "General Services";

      if (!map.has(catId)) {
        map.set(catId, {
          categoryId: catId,
          categoryName: catName,
          services: [],
        });
      }
      map.get(catId)!.services.push(s);
    }

    return Array.from(map.values());
  }, [filteredAvailableServices, allCategories]);

  // Original totals from the appointment
  const originalDuration = useMemo(
    () =>
      (appointment?.services || []).reduce(
        (sum, s) => sum + (s.duration || 0),
        0,
      ),
    [appointment?.services],
  );
  const originalTotalPrice = appointment?.pricing?.total ?? 0;

  // Current proposed draft totals (accounting for subscription coverage)
  const draftDuration = useMemo(
    () => selectedLines.reduce((sum, l) => sum + (l.duration || 0), 0),
    [selectedLines],
  );

  const draftTotals = useMemo(() => {
    let gross = 0;
    let subscriptionDeduction = 0;
    let coveredCount = 0;

    for (const l of selectedLines) {
      const lineCost = l.customPrice ?? l.price ?? 0;
      gross += lineCost;
      if (l.appliedSubscriptionId || l.isRedeemedViaSubscription) {
        subscriptionDeduction += lineCost;
        coveredCount += 1;
      }
    }

    return {
      gross,
      subscriptionDeduction,
      netPayable: Math.max(0, gross - subscriptionDeduction),
      coveredCount,
    };
  }, [selectedLines]);

  const draftTotalPrice = draftTotals.netPayable;

  if (!appointment) return null;

  const handleSelectServiceToAdd = (srv: Service) => {
    // Disallow adding duplicate services
    const isAlreadyPresent = selectedLines.some((l) => l.serviceId === srv.id);
    if (isAlreadyPresent) {
      toast.info(`"${srv.name}" is already included in this appointment.`);
      return;
    }

    // If customer has an active subscription covering this service, auto-link it
    const subQuota = subscriptionQuotaByService.get(srv.id);
    const defaultSubId =
      subQuota && subQuota.remaining > 0 ? subQuota.subscriptionId : undefined;

    setSelectedLines((prev) => [
      ...prev,
      {
        serviceId: srv.id,
        name: srv.name,
        duration: srv.duration,
        basePrice: srv.pricing?.basePrice ?? 0,
        price: srv.pricing?.basePrice ?? 0,
        customPrice: srv.pricing?.basePrice ?? 0,
        appliedSubscriptionId: defaultSubId || null,
        isRedeemedViaSubscription: false,
      },
    ]);
    setPreviewData(null); // Invalidate any computed preview
    toast.success(`Added "${srv.name}" to appointment`);
  };

  const handleRemoveService = (index: number) => {
    setSelectedLines((prev) => prev.filter((_, i) => i !== index));
    setPreviewData(null);
  };

  const handleToggleSubscriptionCoverage = (index: number) => {
    setSelectedLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (!line.serviceId) return line;
        const subQuota = subscriptionQuotaByService.get(line.serviceId);
        // Only toggle coverage intent (appliedSubscriptionId). Historical consumed redemption is preserved.
        const hasCoverage = Boolean(line.appliedSubscriptionId);

        if (hasCoverage) {
          return {
            ...line,
            appliedSubscriptionId: null,
          };
        } else if (subQuota) {
          return {
            ...line,
            appliedSubscriptionId: subQuota.subscriptionId,
          };
        }
        return line;
      }),
    );
    setPreviewData(null);
  };

  const handleCustomPriceChange = (index: number, val: string) => {
    const num = parseFloat(val);
    setSelectedLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              customPrice: isNaN(num) ? 0 : Math.max(0, num),
            }
          : line,
      ),
    );
    setPreviewData(null);
  };

  const handleResetPriceToBase = (index: number) => {
    setSelectedLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              customPrice: line.basePrice,
            }
          : line,
      ),
    );
    setPreviewData(null);
  };

  const handleAddCustomService = () => {
    const trimmedName = customServiceName.trim();
    if (!trimmedName) {
      setCustomServiceError("Service name is required.");
      return;
    }
    if (trimmedName.length > 120) {
      setCustomServiceError("Service name cannot exceed 120 characters.");
      return;
    }
    const durationNum = parseInt(customServiceDuration, 10);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 720) {
      setCustomServiceError("Duration must be between 1 and 720 minutes.");
      return;
    }
    const priceNum = customServicePrice === "" ? 0 : parseFloat(customServicePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setCustomServiceError("Agreed price must be 0 or higher.");
      return;
    }

    const newCustomLine = {
      serviceType: "custom" as const,
      isCustom: true,
      name: trimmedName,
      duration: durationNum,
      basePrice: priceNum,
      price: priceNum,
      customPrice: priceNum,
      appliedSubscriptionId: null,
      isRedeemedViaSubscription: false,
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    setSelectedLines((prev) => [...prev, newCustomLine]);
    setPreviewData(null);
    toast.success(`Added custom service "${trimmedName}"`);

    setCustomServiceName("");
    setCustomServiceDuration("30");
    setCustomServicePrice("");
    setCustomServiceError(null);
    setShowAddCustomModal(false);
  };

  const buildModificationPayload = (): ServiceModificationItem[] => {
    return selectedLines.map((l) => {
      const isCustom = Boolean(l.isCustom || l.serviceType === "custom" || !l.serviceId);
      if (isCustom) {
        return {
          serviceType: "custom" as const,
          name: l.name.trim(),
          duration: Math.max(1, Math.min(720, Math.round(Number(l.duration) || 1))),
          price: Math.max(0, Number(l.customPrice ?? l.price) || 0),
          _id: l._id,
          id: l.id,
        };
      }
      return {
        serviceType: "registered" as const,
        serviceId: l.serviceId!,
        customPrice: l.customPrice !== undefined ? l.customPrice : l.basePrice,
        appliedSubscriptionId: l.appliedSubscriptionId || undefined,
      };
    });
  };

  // Phase 1: Request Preview Computation
  const handleRequestPreview = async () => {
    if (selectedLines.length === 0) {
      toast.error("Please add at least one service to the appointment.");
      return;
    }

    const payload = buildModificationPayload();

    try {
      const result = await previewMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          services: payload,
        },
      });
      setPreviewData(result);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError.response?.data?.message ||
          "Failed to calculate service modification preview.",
      );
    }
  };

  // Phase 2: Confirm & Commit Schedule
  const handleCommitModification = async () => {
    if (!previewData) {
      toast.error("Please calculate preview before committing.");
      return;
    }

    if (previewData.requiresManagerOverride && !managerOverrideReason.trim()) {
      toast.error(
        "A manager override reason is mandatory to commit this change.",
      );
      return;
    }

    const payload = buildModificationPayload();

    try {
      await commitMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          previewToken: previewData.previewToken,
          services: payload,
          managerOverrideReason: previewData.requiresManagerOverride
            ? managerOverrideReason.trim()
            : undefined,
        },
      });

      toast.success("Appointment services updated successfully.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 409) {
        toast.error(
          "Schedule changed or proposal expired (409 Conflict). Stale confirmation discarded. Please preview again.",
        );
        setPreviewData(null); // Discard stale preview token immediately
      } else if (axiosError.response?.status === 403) {
        toast.error(
          "You do not have permission to modify appointment services.",
        );
      } else {
        toast.error(
          axiosError.response?.data?.message ||
            "Failed to commit service modifications.",
        );
      }
    }
  };

  const isTerminal = ["completed", "cancelled", "no_show"].includes(
    appointment.status,
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="3xl"
      className="p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]"
    >
      <div className="flex flex-col h-full min-h-0 text-left">
        {/* Header Bar - Aligned & Non-truncated */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 pr-8 sm:pr-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs mt-0.5">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Modify Appointment Services
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {appointment.appointmentCode ||
                    `#${appointment.id.slice(-6)}`}
                </span>
                <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0">
                  {appointment.bookingType.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Adjust services, negotiate custom pricing, and calculate
                schedule cascade
              </p>
            </div>
          </div>

          {/* Stepper Status Pill */}
          <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0 self-start sm:self-center">
            <span
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
                !previewData
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>1</span>
              <span>Services</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
                previewData
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>2</span>
              <span>Review Cascade</span>
            </span>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {!canEdit && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                You do not have permission to edit appointment services.
              </span>
            </div>
          )}

          {isTerminal && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                This appointment is in a terminal state (
                <strong>{appointment.status}</strong>) and services cannot be
                modified.
              </span>
            </div>
          )}

          {/* High-Information Customer, Staff, Time & Venue Context Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-card border border-border/80 shadow-xs text-xs">
            {/* Customer Details with Phone */}
            <div className="flex items-start gap-2.5 min-w-0 p-1">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                  Customer
                </span>
                <span className="font-bold text-foreground block text-xs wrap-break-word">
                  {appointment.customer?.name || "Guest Customer"}
                </span>
                {appointment.customer?.phone && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono break-all">
                    <Phone className="h-2.5 w-2.5 shrink-0" />
                    {appointment.customer.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Stylist & Staff Lane */}
            <div className="flex items-start gap-2.5 min-w-0 p-1 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-1">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Scissors className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                  Assigned Stylist
                </span>
                <span className="font-bold text-foreground block text-xs wrap-break-word">
                  {appointment.staff?.name || "Unassigned / Any"}
                </span>
                <span className="text-[11px] text-muted-foreground block wrap-break-word mt-0.5">
                  {appointment.staff?.role || "Staff Member"}
                </span>
              </div>
            </div>

            {/* Date, Start Time & Status */}
            <div className="flex items-start gap-2.5 min-w-0 p-1 border-t lg:border-t-0 border-border/50 pt-2 lg:pt-1">
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                  Schedule Slot
                </span>
                <span className="font-bold text-foreground block text-xs wrap-break-word">
                  {formatDate(appointment.date, "EEE, dd MMM yyyy")}
                </span>
                <span className="text-[11px] text-primary font-semibold block wrap-break-word mt-0.5">
                  {appointment.startTime}{" "}
                  {appointment.endTime ? `- ${appointment.endTime}` : ""}
                </span>
              </div>
            </div>

            {/* Original Total Duration & Financial Baseline */}
            <div className="flex items-start gap-2.5 min-w-0 p-1 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-1">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                  Current Booking
                </span>
                <span className="font-bold text-foreground block text-xs wrap-break-word">
                  {originalDuration} mins duration
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold block wrap-break-word mt-0.5">
                  Original: {formatCurrency(originalTotalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Subscriptions Hub (Production-Grade UI/UX) */}
          {activeCustomerSubscriptions.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-b from-emerald-500/10 via-card to-card p-4 shadow-xs space-y-3.5">
              {/* Header Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Active Customer Subscriptions
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 text-[10px] font-bold px-2 py-0.2"
                      >
                        {activeCustomerSubscriptions.length} Active{" "}
                        {activeCustomerSubscriptions.length === 1
                          ? "Plan"
                          : "Plans"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30 text-[10px] font-bold px-2 py-0.2"
                      >
                        {subscriptionQuotaByService.size} Covered{" "}
                        {subscriptionQuotaByService.size === 1
                          ? "Service"
                          : "Services"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Eligible service lines can be covered with prepaid quota
                      at 100% discount.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {isLoadingCustomerSubs && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                      Syncing plans...
                    </span>
                  )}
                </div>
              </div>

              {/* Individual Subscription Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCustomerSubscriptions.map((sub) => {
                  const planTitle =
                    sub.planId && typeof sub.planId === "object"
                      ? sub.planId.name
                      : "Subscription Plan";
                  const totalEntitlements = (sub.entitlements || []).reduce(
                    (sum, e) => sum + e.totalQuantity,
                    0,
                  );
                  const usedEntitlements = (sub.entitlements || []).reduce(
                    (sum, e) => sum + (e.usedQuantity || 0),
                    0,
                  );
                  const remainingEntitlements = Math.max(
                    0,
                    totalEntitlements - usedEntitlements,
                  );
                  const progressPct =
                    totalEntitlements > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (remainingEntitlements / totalEntitlements) * 100,
                          ),
                        )
                      : 0;

                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-border/80 bg-background/80 dark:bg-card p-3.5 space-y-3 shadow-2xs hover:border-emerald-500/40 transition-colors"
                    >
                      {/* Plan Title & Code Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-foreground block wrap-break-word">
                            {planTitle}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                            Code: <strong>{sub.subscriptionCode}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                          {remainingEntitlements} Quota Left
                        </span>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                          <span>Entitlements Balance</span>
                          <span>
                            {remainingEntitlements} / {totalEntitlements}{" "}
                            available ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Date Validity */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        {sub.startDate && (
                          <span>
                            Started: {formatDate(sub.startDate)}
                          </span>
                        )}
                        {sub.endDate && (
                          <>
                            <span>•</span>
                            <span className="text-foreground font-medium">
                              Valid until: {formatDate(sub.endDate)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Entitlements in this plan */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Included Services & Quotas
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(sub.entitlements || []).map((ent, eIdx) => {
                            const rem =
                              ent.totalQuantity - (ent.usedQuantity || 0);
                            const srv = allServices.find(
                              (s) => s.id === ent.serviceId,
                            );
                            const name =
                              ent.serviceName || srv?.name || "Service";

                            return (
                              <span
                                key={`${ent.serviceId}-${eIdx}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${
                                  rem > 0
                                    ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 border-emerald-500/30 font-semibold"
                                    : "bg-muted text-muted-foreground border-border/60 line-through opacity-60"
                                }`}
                              >
                                <span>{name}</span>
                                <span className="font-bold">
                                  ({rem}/{ent.totalQuantity})
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Service Line Items */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-primary" />
                  Appointment Services ({selectedLines.length})
                </h4>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-2 h-4.5 font-semibold text-muted-foreground"
                >
                  Customizable Pricing
                </Badge>
              </div>

              {previewData && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Info className="h-3 w-3 shrink-0" />
                  Modifying lines invalidates preview. Recalculation required.
                </span>
              )}
            </div>

            {/* Service Lines List (Natural Non-Scrollable Container) */}
            <div className="border border-border rounded-xl divide-y divide-border bg-card shadow-xs">
              {selectedLines.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Scissors className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-foreground">
                    No services selected
                  </p>
                  <p className="text-[11px] mt-0.5">
                    Please add at least one service from the catalogue below.
                  </p>
                </div>
              ) : (
                selectedLines.map((line, idx) => {
                  const isCustomized =
                    line.customPrice !== undefined &&
                    line.customPrice !== line.basePrice;
                  const isCovered = Boolean(
                    line.appliedSubscriptionId ||
                    line.isRedeemedViaSubscription,
                  );
                  const subQuota = line.serviceId
                    ? subscriptionQuotaByService.get(line.serviceId)
                    : undefined;

                  const isCustomLine = Boolean(line.isCustom || line.serviceType === "custom" || !line.serviceId);
                  const lineKey = line.serviceId || line._id || line.id || `custom-line-${idx}`;

                  return (
                    <div
                      key={lineKey}
                      className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors ${
                        isCustomLine
                          ? "bg-purple-500/5 hover:bg-purple-500/10 border-l-2 border-l-purple-500"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground text-sm wrap-break-word">
                            {line.name}
                          </span>

                          {isCustomLine && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-2 h-4.5 font-bold bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 flex items-center gap-1"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                              Custom Service
                            </Badge>
                          )}

                          {!isCustomLine && (line.isRedeemedViaSubscription ? (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-[10px] py-0.5 px-2.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 rounded-full font-bold shadow-2xs">
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-3" />
                                <span>Redeemed via Plan</span>
                                {subQuota?.subscriptionCode && (
                                  <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                                    [{subQuota.subscriptionCode}]
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : isCovered ? (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-[10px] py-0.5 px-2.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 rounded-full font-bold shadow-2xs">
                                <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Plan Covered (Draft)</span>
                                {subQuota && (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold border-l border-emerald-500/30 pl-1.5">
                                    {subQuota.remaining - 1} left after this
                                  </span>
                                )}
                                {subQuota?.subscriptionCode && (
                                  <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                                    [{subQuota.subscriptionCode}]
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleSubscriptionCoverage(idx)
                                }
                                className="inline-flex items-center gap-1 text-[10px] py-0.5 px-2 bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border rounded-full font-semibold cursor-pointer transition-colors"
                                title="Remove subscription coverage and revert to normal price"
                              >
                                <X className="h-2.5 w-2.5" />
                                Remove Plan
                              </button>
                            </div>
                          ) : subQuota ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleSubscriptionCoverage(idx)
                              }
                              className="inline-flex items-center gap-1.5 text-[10px] py-0.5 px-2.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 rounded-full font-semibold cursor-pointer hover:bg-purple-500/20 transition-colors shadow-2xs"
                              title={`Apply customer plan credit (${subQuota.remaining} of ${subQuota.total} available) • Payment: ${subQuota.paymentStatus || "paid"}`}
                            >
                              <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                              <span>Apply Plan</span>
                              <span className="font-bold bg-purple-500/20 px-1.5 py-0.2 rounded-full text-purple-900 dark:text-purple-100">
                                {subQuota.remaining} of {subQuota.total}{" "}
                                available
                              </span>
                              <span className="font-mono text-[9px] opacity-75">
                                [{subQuota.subscriptionCode}]
                              </span>
                              {subQuota.paymentStatus === "unpaid" || subQuota.paymentStatus === "pending_payment" ? (
                                <span className="text-[8.5px] bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                                  Pending Payment{subQuota.amountDue != null && subQuota.amountDue > 0 ? ` (₹${subQuota.amountDue})` : ""}
                                </span>
                              ) : subQuota.paymentStatus === "partially_paid" ? (
                                <span className="text-[8.5px] bg-orange-500/25 text-orange-800 dark:text-orange-200 border border-orange-500/40 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                                  Partially Paid{subQuota.amountDue != null && subQuota.amountDue > 0 ? ` (Due: ₹${subQuota.amountDue})` : ""}
                                </span>
                              ) : null}
                            </button>
                          ) : null)}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/80" />
                            {line.duration} mins
                          </span>
                          <span>•</span>
                          <span>Base: {formatCurrency(line.basePrice)}</span>
                          {isCustomLine && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              (Appointment-only custom service)
                            </span>
                          )}
                          {isCustomized && !isCovered && !isCustomLine && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Tag className="h-2.5 w-2.5" />
                              Negotiated Price
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Control & Action */}
                      <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">
                            Agreed Price:
                          </label>
                          <div
                            className={`flex items-center gap-1 border rounded-lg px-2 py-1 shadow-2xs transition-colors ${
                              isCovered
                                ? "bg-muted/50 border-border/60 opacity-70"
                                : "bg-background border-border focus-within:border-primary"
                            }`}
                          >
                            <span className="text-xs font-semibold text-muted-foreground">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                isCovered ? 0 : (line.customPrice ?? line.price)
                              }
                              onChange={(e) =>
                                handleCustomPriceChange(idx, e.target.value)
                              }
                              className="w-20 text-xs font-bold text-right bg-transparent text-foreground focus:outline-none"
                              disabled={isTerminal || !canEdit || isCovered}
                              title={
                                isCovered
                                  ? "Price covered by customer subscription"
                                  : "Customer Agreed Price"
                              }
                            />
                          </div>

                          {isCustomized &&
                            !isCovered &&
                            !isTerminal &&
                            canEdit && (
                              <button
                                type="button"
                                onClick={() => handleResetPriceToBase(idx)}
                                className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title="Reset to catalog base price"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveService(idx)}
                          disabled={
                            isTerminal || !canEdit || selectedLines.length <= 1
                          }
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          title={
                            selectedLines.length <= 1
                              ? "Appointments must have at least one service"
                              : "Remove service"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Production-Grade Integrated Service Catalogue Hub */}
            {!isTerminal && canEdit && (
              <div className="flex-1 min-h-0 flex flex-col border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
                {/* Hub Header & Status Bar */}
                <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-xs font-bold text-foreground">
                          Add Services from Catalogue
                        </h5>
                        <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded-full border border-border/60">
                          {filteredAvailableServices.length} available
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate sm:whitespace-normal">
                        Browse categories, search, or add a custom service
                      </p>
                    </div>
                  </div>

                  {/* Aligned Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomServiceName("");
                        setCustomServiceDuration("30");
                        setCustomServicePrice("");
                        setCustomServiceError(null);
                        setShowAddCustomModal(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer shadow-2xs"
                      title="Add a custom one-off service for this appointment"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-3 text-purple-600 dark:text-purple-400" />
                      <span>Custom Service</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCatalogueExpanded((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer shadow-2xs"
                      title={isCatalogueExpanded ? "Collapse catalogue view" : "Expand catalogue view"}
                    >
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>{isCatalogueExpanded ? "Collapse" : "Catalogue"}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                          isCatalogueExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isCatalogueExpanded && (
                  <div className="p-3 flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                    {/* Search & Filter Bar */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search catalogue by service name, code, or description (e.g. Haircut, Keratin, Spa)..."
                          value={serviceSearchQuery}
                          onChange={(e) =>
                            setServiceSearchQuery(e.target.value)
                          }
                          className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                        {serviceSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setServiceSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Clean Filter Tabs Bar */}
                      {allCategories.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                              selectedCategoryFilter === "all"
                                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <LayoutGrid className="h-3 w-3" />
                            <span>All Categories</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                selectedCategoryFilter === "all"
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-background text-muted-foreground border border-border/50"
                              }`}
                            >
                              {allServices.length}
                            </span>
                          </button>
                          {allCategories.map((cat) => {
                            const catId = cat._id || cat.id;
                            const isSelected = selectedCategoryFilter === catId;
                            const countInCat = allServices.filter((s) => {
                              const sCatId =
                                typeof s.categoryId === "object" &&
                                s.categoryId !== null
                                  ? (
                                      s.categoryId as {
                                        _id?: string;
                                        id?: string;
                                      }
                                    )._id ||
                                    (
                                      s.categoryId as {
                                        _id?: string;
                                        id?: string;
                                      }
                                    ).id
                                  : s.categoryId;
                              return sCatId === catId;
                            }).length;

                            return (
                              <button
                                key={catId}
                                type="button"
                                onClick={() => setSelectedCategoryFilter(catId)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                              >
                                <span>{cat.name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                    isSelected
                                      ? "bg-primary-foreground/20 text-primary-foreground"
                                      : "bg-background text-muted-foreground border border-border/50"
                                  }`}
                                >
                                  {countInCat}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Catalogue Items List / Category Panels */}
                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 border border-border/70 rounded-xl bg-muted/15 p-2.5 scrollbar-thin">
                      {isLoadingServices ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Loading service catalogue...</span>
                        </div>
                      ) : categorizedServices.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                          <Search className="h-5 w-5 mx-auto opacity-30 mb-1" />
                          <p className="font-semibold text-foreground">
                            No services found
                          </p>
                          <p className="text-[11px]">
                            {serviceSearchQuery
                              ? `No catalogue items match "${serviceSearchQuery}" in the selected filter.`
                              : "No services available in this category."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setServiceSearchQuery("");
                              setSelectedCategoryFilter("all");
                            }}
                            className="mt-2 text-xs text-primary font-semibold hover:underline cursor-pointer"
                          >
                            Reset filters & show all
                          </button>
                        </div>
                      ) : (
                        categorizedServices.map((group) => {
                          const isSearching = Boolean(
                            serviceSearchQuery.trim(),
                          );
                          const isSingleCatSelected =
                            selectedCategoryFilter !== "all";
                          // Closed by default: expand only if user is actively searching, a specific category is filtered, or user clicked to open
                          const isExpanded =
                            isSearching || isSingleCatSelected
                              ? true
                              : Boolean(expandedCategories[group.categoryId]);
                          const addedCountInGroup = group.services.filter((s) =>
                            selectedLines.some((l) => l.serviceId === s.id),
                          ).length;

                          return (
                            <div
                              key={group.categoryId}
                              className="border border-border/70 rounded-xl overflow-hidden bg-card transition-colors shadow-2xs"
                            >
                              {/* Accordion / Category Header */}
                              <div
                                onClick={() => {
                                  if (!isSingleCatSelected && !isSearching) {
                                    toggleCategoryExpand(group.categoryId);
                                  }
                                }}
                                className={`w-full px-3.5 py-2.5 bg-muted/40 flex items-center justify-between gap-2 select-none ${
                                  !isSingleCatSelected && !isSearching
                                    ? "hover:bg-muted/70 transition-colors cursor-pointer group"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {!isSingleCatSelected && !isSearching && (
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                                        isExpanded ? "rotate-0" : "-rotate-90"
                                      }`}
                                    />
                                  )}
                                  <span className="text-xs font-bold uppercase tracking-wider text-foreground wrap-break-word">
                                    {group.categoryName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-semibold px-1.5 py-0.2 bg-muted rounded-full">
                                    {group.services.length} services
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {addedCountInGroup > 0 && (
                                    <span className="text-[10px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.2 rounded-full font-bold">
                                      {addedCountInGroup} selected
                                    </span>
                                  )}
                                  {!isSingleCatSelected && !isSearching && (
                                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                                      {isExpanded ? "Collapse" : "Expand"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Service Grid for this Category */}
                              {isExpanded && (
                                <div className="p-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 border-t border-border/50 bg-background/50">
                                  {group.services.map((srv) => {
                                    const isAlreadyAdded = selectedLines.some(
                                      (l) => l.serviceId === srv.id,
                                    );
                                    const subQuota =
                                      subscriptionQuotaByService.get(srv.id);
                                    const hasPlanCoverage = Boolean(
                                      subQuota && subQuota.remaining > 0,
                                    );

                                    return (
                                      <button
                                        key={srv.id}
                                        type="button"
                                        disabled={isAlreadyAdded}
                                        onClick={() =>
                                          handleSelectServiceToAdd(srv)
                                        }
                                        title={
                                          isAlreadyAdded
                                            ? `"${srv.name}" is already included in this appointment`
                                            : `Add "${srv.name}" to appointment`
                                        }
                                        className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-all ${
                                          isAlreadyAdded
                                            ? "opacity-60 bg-muted/40 border-dashed border-border/80 cursor-not-allowed"
                                            : "border-border/80 bg-card hover:bg-primary/5 hover:border-primary/40 group cursor-pointer shadow-2xs hover:shadow-xs"
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                              className={`font-bold text-xs wrap-break-word ${
                                                isAlreadyAdded
                                                  ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                                  : "text-foreground group-hover:text-primary transition-colors"
                                              }`}
                                            >
                                              {srv.name}
                                            </span>
                                            {hasPlanCoverage && subQuota && (
                                              <span className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-1">
                                                <Sparkles className="h-2.5 w-2.5" />
                                                <span>
                                                  {subQuota.remaining} of{" "}
                                                  {subQuota.total} Left
                                                </span>
                                              </span>
                                            )}
                                            {isAlreadyAdded && (
                                              <span className="text-[9px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-1">
                                                <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                                                Added
                                              </span>
                                            )}
                                          </div>

                                          {srv.description && (
                                            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed wrap-break-word">
                                              {srv.description}
                                            </p>
                                          )}

                                          <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-2 mt-1.5">
                                            <span className="flex items-center gap-1 font-medium">
                                              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                              {srv.duration} mins
                                            </span>
                                            {srv.code && (
                                              <>
                                                <span>•</span>
                                                <span className="font-mono text-[9px] text-muted-foreground/80 bg-muted/60 px-1 py-0.2 rounded border border-border/50">
                                                  #{srv.code}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0 self-center">
                                          <div className="text-right">
                                            <span className="font-bold text-foreground text-xs block">
                                              {formatCurrency(
                                                srv.pricing?.basePrice ?? 0,
                                              )}
                                            </span>
                                            {hasPlanCoverage && subQuota ? (
                                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block">
                                                Free w/ Plan ({subQuota.remaining}/{subQuota.total} left)
                                                {subQuota.paymentStatus === "unpaid" || subQuota.paymentStatus === "pending_payment" ? (
                                                  <span className="text-[8px] text-amber-600 dark:text-amber-400 font-normal block">
                                                    (Payment Pending)
                                                  </span>
                                                ) : subQuota.paymentStatus === "partially_paid" ? (
                                                  <span className="text-[8px] text-orange-600 dark:text-orange-400 font-normal block">
                                                    (Partially Paid)
                                                  </span>
                                                ) : null}
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-muted-foreground block">
                                                standard
                                              </span>
                                            )}
                                          </div>
                                          <div
                                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                              isAlreadyAdded
                                                ? "bg-muted text-muted-foreground/60 border border-border/50"
                                                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs"
                                            }`}
                                          >
                                            {isAlreadyAdded ? (
                                              <CheckCircle2 className="h-4 w-4 text-primary" />
                                            ) : (
                                              <Plus className="h-4 w-4" />
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Draft Comparison & Compute Trigger */}
          <div className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Proposed Financial & Schedule Summary
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{draftDuration} mins total</span>
                  {draftDuration !== originalDuration && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        draftDuration > originalDuration
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      (
                      {draftDuration > originalDuration
                        ? `+${draftDuration - originalDuration}`
                        : draftDuration - originalDuration}
                      m change)
                    </span>
                  )}
                </span>
                <span>•</span>
                <span className="text-foreground">
                  Subtotal: {formatCurrency(draftTotals.gross)}
                </span>
                {draftTotals.subscriptionDeduction > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Plan Saved: -
                      {formatCurrency(draftTotals.subscriptionDeduction)} (
                      {draftTotals.coveredCount})
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="text-primary font-bold text-sm">
                  Payable: {formatCurrency(draftTotalPrice)}
                </span>
              </div>
            </div>

            {!previewData && !isTerminal && canEdit && (
              <Button
                type="button"
                onClick={handleRequestPreview}
                disabled={
                  previewMutation.isPending || selectedLines.length === 0
                }
                className="text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing Cascade...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Calculate Preview</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Staged Preview Section (Cascade Results - Internally scrollable) */}
          {previewData && (
            <div className="space-y-4 pt-2 border-t border-border overflow-y-auto max-h-72 scrollbar-thin pr-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cascade Impact & Feasibility Analysis
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Proposal Token Valid for 5 minutes • Token:{" "}
                    <span className="font-mono text-[10px] text-foreground">
                      {previewData.previewToken.slice(0, 12)}...
                    </span>
                  </p>
                </div>
                <Badge
                  variant={previewData.canCommit ? "success" : "destructive"}
                  className="text-xs px-2.5 py-0.5 font-bold"
                >
                  {previewData.canCommit
                    ? "Commit Authorized"
                    : "Action Required"}
                </Badge>
              </div>

              {/* Time Change Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Appointment Shift
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold">
                    <span className="text-muted-foreground line-through">
                      {appointment.startTime} - {appointment.endTime || "--:--"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-primary">
                      {previewData.initiatingAppointment?.proposedStartTime ||
                        appointment.startTime}{" "}
                      -{" "}
                      {previewData.initiatingAppointment?.proposedEndTime ||
                        "--:--"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <span>Duration:</span>
                    <span className="font-semibold text-foreground">
                      {originalDuration}m → {draftDuration}m
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-card border border-border rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Downstream Cascade Impact
                  </span>
                  <div className="text-xs font-bold text-foreground">
                    {previewData.affectedAppointments?.length ||
                      previewData.shiftedAppointments?.length ||
                      0}{" "}
                    appointments shifted
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {previewData.conflicts &&
                    previewData.conflicts.length > 0 ? (
                      <span className="text-destructive font-semibold">
                        {previewData.conflicts.length} schedule conflict(s)
                        detected
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Zero blocking schedule collisions
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Affected Bookings in Cascade */}
              {(() => {
                const affectedList =
                  previewData.affectedAppointments ||
                  previewData.shiftedAppointments;
                if (!affectedList || affectedList.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Shifted Downstream Bookings ({affectedList.length})
                    </span>
                    <div className="max-h-40 overflow-y-auto divide-y divide-border/60 border border-border rounded-xl bg-card">
                      {affectedList.map((aff) => (
                        <div
                          key={aff.id}
                          className="p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground block wrap-break-word">
                              {aff.customerName ||
                                `Booking #${aff.appointmentCode || aff.id.slice(-6)}`}
                            </span>
                            <span className="text-muted-foreground text-[10px] block wrap-break-word">
                              Stylist: {aff.staffName || "Assigned Stylist"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold bg-muted/60 px-2 py-1 rounded-lg shrink-0">
                            <span className="line-through text-muted-foreground">
                              {aff.originalStartTime}
                            </span>
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span className="text-primary font-bold">
                              {aff.proposedStartTime}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Conflict Warnings */}
              {previewData.conflicts && previewData.conflicts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-destructive block">
                    Detected Conflicts ({previewData.conflicts.length})
                  </span>
                  <div className="space-y-1.5">
                    {previewData.conflicts.map((conf, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-start gap-2.5"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-semibold">
                            {conf.message ||
                              conf.reason ||
                              conf.details ||
                              "Scheduling collision detected."}
                          </div>
                          {(conf.actionRequired || conf.code || conf.field) && (
                            <div className="text-[10px] text-destructive/80">
                              {conf.actionRequired && (
                                <span>Action: {conf.actionRequired}</span>
                              )}
                              {conf.code && (
                                <span className="ml-2 font-mono">
                                  [{conf.code}]
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {conf.isBlocking && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0 shrink-0"
                          >
                            Blocking
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Override Field */}
              {previewData.requiresManagerOverride && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Manager Override Required to Commit</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    This modification pushes beyond buffer thresholds or
                    schedule bounds. A mandatory override reason must be logged.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter authorized manager justification..."
                    value={managerOverrideReason}
                    onChange={(e) => setManagerOverrideReason(e.target.value)}
                    className="w-full text-xs h-9 bg-background border border-amber-500/40 rounded-lg px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Staged Confirmation Actions */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewData(null)}
                  className="text-xs h-9 cursor-pointer"
                >
                  Adjust Services
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleCommitModification}
                  disabled={
                    commitMutation.isPending ||
                    !previewData.canCommit ||
                    (previewData.conflicts?.some((c) => c.isBlocking) ??
                      false) ||
                    (Boolean(previewData.requiresManagerOverride) &&
                      !managerOverrideReason.trim())
                  }
                  className="text-xs h-9 font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  {commitMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Committing Schedule...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Commit Schedule</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Changes will notify affected customers & update stylist queues
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Add Custom Service Sub-Dialog */}
      <Dialog
        isOpen={showAddCustomModal}
        onClose={() => {
          setShowAddCustomModal(false);
          setCustomServiceError(null);
        }}
        title="Add Custom Appointment Service"
        maxWidth="md"
      >
        <div className="p-6 space-y-4 text-xs">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Specify a custom or one-off service strictly for this appointment.
            This service will not be added to the global service catalogue.
          </p>

          {customServiceError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{customServiceError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Service Name *
              </label>
              <Input
                placeholder="e.g. Special Bridal Touchup, Beard Sculpting..."
                value={customServiceName}
                onChange={(e) => {
                  setCustomServiceName(e.target.value);
                  setCustomServiceError(null);
                }}
                maxLength={120}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Max 120 characters
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Duration (minutes) *
              </label>
              <Input
                type="number"
                min="1"
                max="720"
                step="1"
                placeholder="30"
                value={customServiceDuration}
                onChange={(e) => {
                  setCustomServiceDuration(e.target.value);
                  setCustomServiceError(null);
                }}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Allowed range: 1–720 mins
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Customer-Agreed Price (₹) *
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={customServicePrice}
                onChange={(e) => {
                  setCustomServicePrice(e.target.value);
                  setCustomServiceError(null);
                }}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Agreed price (can be 0)
              </span>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border border-border/80 text-[11px] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              Custom Service Characteristics
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li>Never saved to the general services catalogue.</li>
              <li>Cannot consume customer subscription plan entitlements.</li>
              <li>Calculates directly into appointment duration and schedule preview.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddCustomModal(false);
                setCustomServiceError(null);
              }}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCustomService}
              className="text-xs h-8 px-4 font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Service
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
