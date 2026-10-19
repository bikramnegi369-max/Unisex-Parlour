"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Scissors,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Search,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Info,
  Calendar,
  User,
} from "lucide-react";
import { useServices } from "@/features/services/hooks/services/useServices";
import {
  usePreviewAppointmentServices,
  useCommitAppointmentServices,
} from "../hooks/useAppointments";
import type {
  Appointment,
  ServiceModificationItem,
  ServiceModificationPreviewData,
} from "../types/appointment.types";
import type { Service } from "@/features/services/types/service.types";

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
    limit: 100,
  });
  const allServices: Service[] = useMemo(
    () => servicesData?.data || [],
    [servicesData?.data]
  );

  // 2. Local state for proposed service lines
  const [selectedLines, setSelectedLines] = useState<
    Array<{
      serviceId: string;
      name: string;
      duration: number;
      basePrice: number;
      price: number;
      customPrice?: number;
      appliedSubscriptionId?: string | null;
      isRedeemedViaSubscription?: boolean;
    }>
  >([]);

  // 3. Staged preview state
  const [previewData, setPreviewData] =
    useState<ServiceModificationPreviewData | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [managerOverrideReason, setManagerOverrideReason] = useState<string>("");

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
        (appointment.services || []).map((s) => ({
          serviceId: s.serviceId,
          name: s.name,
          duration: s.duration,
          basePrice: s.price,
          price: s.price,
          customPrice: s.price, // Preserve customer-agreed price snapshot
          appliedSubscriptionId: s.appliedSubscriptionId,
          isRedeemedViaSubscription: s.isRedeemedViaSubscription,
        }))
      );
      setPreviewData(null);
      setServiceSearchQuery("");
      setIsServiceDropdownOpen(false);
      setManagerOverrideReason("");
    } else {
      setSelectedLines([]);
      setPreviewData(null);
      setServiceSearchQuery("");
      setIsServiceDropdownOpen(false);
      setManagerOverrideReason("");
    }
  }

  // Filter available services for quick search
  const filteredAvailableServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return allServices;
    const q = serviceSearchQuery.toLowerCase();
    return allServices.filter((s) => {
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
  }, [allServices, serviceSearchQuery]);

  // Original totals from the appointment
  const originalDuration = useMemo(
    () =>
      (appointment?.services || []).reduce(
        (sum, s) => sum + (s.duration || 0),
        0
      ),
    [appointment?.services]
  );
  const originalTotalPrice = appointment?.pricing?.total ?? 0;

  // Current proposed draft totals (before preview)
  const draftDuration = useMemo(
    () => selectedLines.reduce((sum, l) => sum + (l.duration || 0), 0),
    [selectedLines]
  );
  const draftTotalPrice = useMemo(
    () => selectedLines.reduce((sum, l) => sum + (l.customPrice ?? l.price ?? 0), 0),
    [selectedLines]
  );

  if (!appointment) return null;

  const handleSelectServiceToAdd = (srv: Service) => {
    setSelectedLines((prev) => [
      ...prev,
      {
        serviceId: srv.id,
        name: srv.name,
        duration: srv.duration,
        basePrice: srv.pricing?.basePrice ?? 0,
        price: srv.pricing?.basePrice ?? 0,
        customPrice: srv.pricing?.basePrice ?? 0,
      },
    ]);
    setServiceSearchQuery("");
    setIsServiceDropdownOpen(false);
    setPreviewData(null); // Invalidate any computed preview
  };

  const handleRemoveService = (index: number) => {
    setSelectedLines((prev) => prev.filter((_, i) => i !== index));
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
          : line
      )
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
          : line
      )
    );
    setPreviewData(null);
  };

  // Stage 1: Request Preview
  const handleRequestPreview = async () => {
    if (!appointment.branchId) {
      toast.error("Authoritative branch ID is missing.");
      return;
    }
    if (selectedLines.length === 0) {
      toast.error("An appointment must have at least one service.");
      return;
    }

    const payloadServices: ServiceModificationItem[] = selectedLines.map((l) => {
      const item: ServiceModificationItem = {
        serviceId: l.serviceId,
        customPrice: l.customPrice,
      };
      // Forward appliedSubscriptionId only if explicitly present and valid
      if (l.appliedSubscriptionId) {
        item.appliedSubscriptionId = l.appliedSubscriptionId;
      }
      return item;
    });

    try {
      const discount = appointment.pricing?.discount || 0;
      const data = await previewMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          services: payloadServices,
          discount,
        },
      });
      setPreviewData(data);
      toast.success("Schedule cascade computed successfully.");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      toast.error(
        axiosError.response?.data?.message || "Failed to preview schedule modifications."
      );
    }
  };

  // Stage 2: Confirm & Commit Preview
  const handleCommitModification = async () => {
    if (!previewData?.previewToken) {
      toast.error("No valid preview token found. Please re-run the preview.");
      return;
    }

    const hasBlockingConflict =
      previewData.conflicts?.some((c) => c.isBlocking) ?? false;

    if (!previewData.canCommit || hasBlockingConflict) {
      toast.error("This proposal has blocking scheduling conflicts and cannot be committed.");
      return;
    }

    if (previewData.requiresManagerOverride && !managerOverrideReason.trim()) {
      toast.error("Manager override justification reason is required to proceed.");
      return;
    }

    const payloadServices: ServiceModificationItem[] = selectedLines.map((l) => {
      const item: ServiceModificationItem = {
        serviceId: l.serviceId,
        customPrice: l.customPrice,
      };
      if (l.appliedSubscriptionId) {
        item.appliedSubscriptionId = l.appliedSubscriptionId;
      }
      return item;
    });

    try {
      await commitMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          previewToken: previewData.previewToken,
          services: payloadServices,
          discount: appointment.pricing?.discount || 0,
          managerOverrideReason: managerOverrideReason.trim() || undefined,
        },
      });
      toast.success("Appointment services and schedule updated successfully.");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 409) {
        toast.error(
          "Schedule changed or proposal expired (409 Conflict). Stale confirmation discarded. Please preview again."
        );
        setPreviewData(null); // Discard stale preview token immediately
      } else if (axiosError.response?.status === 403) {
        toast.error("You do not have permission to modify appointment services.");
      } else {
        toast.error(
          axiosError.response?.data?.message ||
            "Failed to commit service modifications."
        );
      }
    }
  };

  const isTerminal = ["completed", "cancelled", "no_show"].includes(
    appointment.status
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh] text-left">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Modify Appointment Services
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {appointment.appointmentCode || `#${appointment.id.slice(-6)}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjust services, negotiate custom pricing, and calculate schedule cascade
              </p>
            </div>
          </div>

          {/* Stepper Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
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
              <span>You do not have permission to edit appointment services.</span>
            </div>
          )}

          {isTerminal && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                This appointment is in a terminal state (<strong>{appointment.status}</strong>) and services cannot be modified.
              </span>
            </div>
          )}

          {/* Customer & Time Context Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-card border border-border/80 shadow-xs text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                  Customer
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {appointment.customer?.name || "Guest Customer"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                  Date & Start
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {appointment.date} @ {appointment.startTime}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0 col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                  Current Duration
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {originalDuration} mins ({formatCurrency(originalTotalPrice)})
                </span>
              </div>
            </div>
          </div>

          {/* Section: Service Line Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Appointment Services ({selectedLines.length})
                </h4>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                  Customizable Pricing
                </Badge>
              </div>

              {previewData && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <Info className="h-3 w-3" />
                  Editing lines will require re-calculating preview
                </span>
              )}
            </div>

            {/* Service Lines List */}
            <div className="border border-border rounded-xl divide-y divide-border bg-card overflow-hidden shadow-xs">
              {selectedLines.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Scissors className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-foreground">No services selected</p>
                  <p className="text-[11px] mt-0.5">Please add at least one service from the catalogue below.</p>
                </div>
              ) : (
                selectedLines.map((line, idx) => {
                  const isCustomized =
                    line.customPrice !== undefined &&
                    line.customPrice !== line.basePrice;

                  return (
                    <div
                      key={`${line.serviceId}-${idx}`}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm truncate">
                            {line.name}
                          </span>
                          {line.appliedSubscriptionId && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold shrink-0"
                            >
                              Subscription Covered
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/80" />
                            {line.duration} mins
                          </span>
                          <span>•</span>
                          <span>Base: {formatCurrency(line.basePrice)}</span>
                          {isCustomized && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              (Modified)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing Control & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground">
                            Agreed Price:
                          </label>
                          <div className="flex items-center gap-1 bg-background border border-border focus-within:border-primary rounded-lg px-2 py-1 shadow-2xs">
                            <span className="text-xs font-semibold text-muted-foreground">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.customPrice ?? line.price}
                              onChange={(e) => handleCustomPriceChange(idx, e.target.value)}
                              className="w-20 text-xs font-bold text-right bg-transparent text-foreground focus:outline-none"
                              disabled={isTerminal || !canEdit}
                              title="Customer Agreed Price"
                            />
                          </div>

                          {isCustomized && !isTerminal && canEdit && (
                            <button
                              type="button"
                              onClick={() => handleResetPriceToBase(idx)}
                              className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Reset to catalog base price"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveService(idx)}
                          disabled={isTerminal || !canEdit || selectedLines.length <= 1}
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

            {/* Quick Add from Catalogue */}
            {!isTerminal && canEdit && (
              <div className="relative pt-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search catalogue to add services (e.g. Haircut, Spa, Beard)..."
                      value={serviceSearchQuery}
                      onChange={(e) => {
                        setServiceSearchQuery(e.target.value);
                        setIsServiceDropdownOpen(true);
                      }}
                      onFocus={() => setIsServiceDropdownOpen(true)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>
                </div>

                {/* Dropdown Menu for Services */}
                {isServiceDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsServiceDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-border/60">
                      {isLoadingServices ? (
                        <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Loading service catalogue...</span>
                        </div>
                      ) : filteredAvailableServices.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No services found matching &ldquo;{serviceSearchQuery}&rdquo;
                        </div>
                      ) : (
                        filteredAvailableServices.map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => handleSelectServiceToAdd(srv)}
                            className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-muted/50 transition-colors text-xs group cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {srv.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {srv.duration} mins
                                </span>
                                {typeof srv.categoryId === "object" && srv.categoryId?.name && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{srv.categoryId.name}</span>
                                  </>
                                )}
                                {srv.code && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[10px]">{srv.code}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-foreground">
                                {formatCurrency(srv.pricing?.basePrice ?? 0)}
                              </span>
                              <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Draft Comparison & Compute Trigger */}
          <div className="p-3.5 bg-muted/30 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Proposed Summary
              </span>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {draftDuration} mins
                  {draftDuration !== originalDuration && (
                    <span
                      className={`text-[10px] font-bold ml-1 ${
                        draftDuration > originalDuration
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      ({draftDuration > originalDuration ? `+${draftDuration - originalDuration}` : draftDuration - originalDuration}m)
                    </span>
                  )}
                </span>
                <span>•</span>
                <span className="text-foreground">
                  Total: {formatCurrency(draftTotalPrice)}
                </span>
              </div>
            </div>

            {!previewData && !isTerminal && canEdit && (
              <Button
                type="button"
                onClick={handleRequestPreview}
                disabled={previewMutation.isPending || selectedLines.length === 0}
                className="text-xs font-bold h-9 bg-primary text-primary-foreground gap-1.5 shadow-xs shrink-0"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Computing Cascade...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Calculate Schedule Cascade</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Stage 2: Staged Preview & Schedule Cascade Section */}
          {previewData && (
            <div className="p-4 bg-muted/40 border-2 border-primary/40 rounded-2xl space-y-4 text-xs animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-foreground text-sm">
                      Schedule Modification Proposal
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Authoritative cascade evaluation from scheduling engine
                    </p>
                  </div>
                </div>

                <Badge
                  variant={previewData.canCommit ? "success" : "destructive"}
                  className="text-xs px-2.5 py-0.5 font-bold"
                >
                  {previewData.canCommit ? "Commit Authorized" : "Action Required"}
                </Badge>
              </div>

              {/* Timing & Financial Metric Cards */}
              {(() => {
                const proposedDuration =
                  previewData.initiatingAppointment?.totalDuration ??
                  previewData.duration ??
                  draftDuration;
                const proposedEndTime =
                  previewData.initiatingAppointment?.proposedEndTime ??
                  previewData.endTime ??
                  "—";
                const revisedTotal =
                  previewData.initiatingAppointment?.pricing?.total ??
                  previewData.pricing?.total ??
                  draftTotalPrice;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-card rounded-xl border border-border/90 shadow-2xs">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        New Time Window
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-foreground text-sm">
                          {appointment.startTime} → {proposedEndTime}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted font-semibold text-muted-foreground">
                          {proposedDuration} mins
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-card rounded-xl border border-border/90 shadow-2xs">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        Authoritative Total
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-primary text-base">
                          {formatCurrency(revisedTotal)}
                        </span>
                        {revisedTotal !== originalTotalPrice && (
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            Diff: {revisedTotal > originalTotalPrice ? "+" : ""}
                            {formatCurrency(revisedTotal - originalTotalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Affected Bookings in Cascade */}
              {(() => {
                const affectedList = previewData.affectedAppointments || previewData.shiftedAppointments;
                if (!affectedList || affectedList.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Cascaded Bookings ({affectedList.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Subsequent slots automatically shifted
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {affectedList.map((aff) => (
                        <div
                          key={aff.id}
                          className="p-2.5 bg-card rounded-xl border border-border flex items-center justify-between text-xs shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground truncate block">
                              {aff.customerName || `Booking #${aff.appointmentCode || aff.id.slice(-6)}`}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              Stylist: {aff.staffName || "Assigned Stylist"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold bg-muted/60 px-2 py-1 rounded-lg shrink-0">
                            <span className="line-through text-muted-foreground">{aff.originalStartTime}</span>
                            <ArrowRight className="h-3 w-3 text-primary" />
                            <span className="text-primary font-bold">{aff.proposedStartTime}</span>
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
                  <span className="text-[11px] font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Detected Scheduling Conflicts
                  </span>
                  <div className="space-y-1.5">
                    {previewData.conflicts.map((conf, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-destructive/10 border border-destructive/25 text-destructive text-xs rounded-xl flex items-start gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-semibold">
                            {conf.message || conf.reason || conf.details || "Scheduling collision detected."}
                          </div>
                          {(conf.actionRequired || conf.code || conf.field) && (
                            <div className="text-[10px] text-destructive/80">
                              {conf.actionRequired && <span>Action: {conf.actionRequired}</span>}
                              {conf.code && <span className="ml-2 font-mono">[{conf.code}]</span>}
                            </div>
                          )}
                        </div>
                        {conf.isBlocking && (
                          <Badge variant="destructive" className="text-[9px] uppercase tracking-wider px-1.5 py-0 shrink-0">
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
                    This modification pushes beyond buffer thresholds or schedule bounds. A mandatory override reason must be logged.
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
                  className="text-xs h-9"
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
                    (previewData.conflicts?.some((c) => c.isBlocking) ?? false) ||
                    (Boolean(previewData.requiresManagerOverride) && !managerOverrideReason.trim())
                  }
                  className="text-xs h-9 font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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
            className="text-xs h-8"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
