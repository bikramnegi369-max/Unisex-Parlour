"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useApplyInvoiceDiscount } from "../hooks/useBillingMutations";
import {
  applyDiscountSchema,
  type ApplyDiscountFormValues,
} from "../schemas/discount.schema";
import type {
  Invoice,
  InvoiceLineItem,
  ApplyDiscountPayload,
} from "../types/billing.types";
import {
  Tag,
  Info,
  Sparkles,
  Percent,
  IndianRupee,
  Layers,
  FileSpreadsheet,
  Check,
  CheckCheck,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Receipt,
  HelpCircle,
} from "lucide-react";

interface ApplyDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  defaultLineId?: string | null;
  onConflictRefresh?: () => void;
}

export function ApplyDiscountDialog({
  isOpen,
  onClose,
  invoice,
  defaultLineId = null,
  onConflictRefresh,
}: ApplyDiscountDialogProps) {
  const { currentBranchId } = useBranchContext();
  const applyMutation = useApplyInvoiceDiscount();

  // Filter lines: subscription-covered lines cannot have discounts applied
  const invoiceItems = invoice?.items;
  const eligibleLines: InvoiceLineItem[] = useMemo(() => {
    if (!invoiceItems) return [];
    return invoiceItems.filter(
      (item) =>
        !item.isCoveredBySubscription &&
        !item.isRedeemedViaSubscription &&
        !item.appliedSubscriptionId,
    );
  }, [invoiceItems]);

  const activeBranchId =
    invoice?.branchId ||
    invoice?.branch?.id ||
    (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplyDiscountFormValues>({
    resolver: zodResolver(
      applyDiscountSchema,
    ) as unknown as Resolver<ApplyDiscountFormValues>,
    mode: "onChange",
    defaultValues: {
      branchId: activeBranchId,
      discountLevel: defaultLineId ? "selected_lines" : "invoice",
      lineId: defaultLineId || undefined,
      lineIds: defaultLineId
        ? [defaultLineId]
        : eligibleLines.map((l) => l.id || "").filter(Boolean),
      name: "",
      discountType: "percentage",
      enteredValue: "" as unknown as number,
      reason: "",
    },
  });

  const watchedLevel = useWatch({ control, name: "discountLevel" });
  const watchedType = useWatch({ control, name: "discountType" });
  const watchedEnteredValue = useWatch({ control, name: "enteredValue" });
  const rawWatchedLineIds = useWatch({ control, name: "lineIds" });
  const watchedLineIds = useMemo(
    () => rawWatchedLineIds || [],
    [rawWatchedLineIds],
  );

  // Derive activePreset from form state (no setState in effect)
  const activePreset = useMemo(() => {
    if (watchedType !== "percentage") return null;
    const num = Number(watchedEnteredValue);
    return [5, 10, 15, 20, 25, 50].includes(num) ? num : null;
  }, [watchedType, watchedEnteredValue]);

  // Reset form when opening or defaultLineId changes
  useEffect(() => {
    if (isOpen && invoice) {
      const initialBranch =
        invoice.branchId ||
        invoice.branch?.id ||
        (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

      const initialLevel = defaultLineId ? "selected_lines" : "invoice";
      const initialSelected = defaultLineId
        ? [defaultLineId]
        : eligibleLines.map((l) => l.id || "").filter(Boolean);

      reset({
        branchId: initialBranch,
        discountLevel: initialLevel,
        lineId: defaultLineId || undefined,
        lineIds: initialSelected,
        name: "",
        discountType: "percentage",
        enteredValue: "" as unknown as number,
        reason: "",
      });
    }
  }, [isOpen, invoice, defaultLineId, currentBranchId, eligibleLines, reset]);

  // Toggle selection for a single service line
  const handleToggleLine = (lineId: string) => {
    const current = new Set(watchedLineIds);
    if (current.has(lineId)) {
      current.delete(lineId);
    } else {
      current.add(lineId);
    }
    const nextArr = Array.from(current);
    setValue("lineIds", nextArr, { shouldValidate: true, shouldDirty: true });
    setValue("lineId", nextArr.length === 1 ? nextArr[0] : undefined);
  };

  const handleSelectAll = () => {
    const allIds = eligibleLines.map((l) => l.id || "").filter(Boolean);
    setValue("lineIds", allIds, { shouldValidate: true, shouldDirty: true });
    setValue("lineId", allIds.length === 1 ? allIds[0] : undefined);
  };

  const handleClearAll = () => {
    setValue("lineIds", [], { shouldValidate: true, shouldDirty: true });
    setValue("lineId", undefined);
  };

  // Quick percentage presets
  const handleQuickPercent = (pct: number) => {
    setValue("discountType", "percentage", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("enteredValue", pct as unknown as number, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Quick preset chips for names
  const handlePresetName = (presetName: string) => {
    setValue("name", presetName, { shouldValidate: true, shouldDirty: true });
  };

  // Calculate live preview
  const livePreview = useMemo(() => {
    const numericVal = Number(watchedEnteredValue) || 0;
    if (numericVal <= 0) return null;

    // Scope services
    const targetLines =
      watchedLevel === "invoice"
        ? eligibleLines
        : eligibleLines.filter((l) => l.id && watchedLineIds.includes(l.id));

    if (targetLines.length === 0) return null;

    const totalEligibleAmount = targetLines.reduce(
      (sum, l) => sum + (l.customerPayable ?? l.lineTotal),
      0,
    );

    let calculatedDiscountTotal = 0;
    let allocations: Array<{
      id: string;
      name: string;
      basePayable: number;
      allocatedDiscount: number;
      finalAmount: number;
    }> = [];

    if (watchedType === "percentage") {
      const pct = Math.min(100, Math.max(0, numericVal));
      allocations = targetLines.map((line) => {
        // Base for percentage is the current remaining payable after prior discounts
        const base = line.customerPayable ?? line.lineTotal;
        const disc = Math.round(((base * pct) / 100) * 100) / 100;
        calculatedDiscountTotal += disc;
        return {
          id: line.id || "",
          name: line.serviceName || line.name || "Service",
          basePayable: base,
          allocatedDiscount: disc,
          finalAmount: Math.max(0, base - disc),
        };
      });
    } else {
      // Fixed discount
      const totalDiscountToAllocate = Math.min(totalEligibleAmount, numericVal);
      calculatedDiscountTotal = totalDiscountToAllocate;

      // Proportional allocation across selected lines based on remaining payable
      let allocatedSoFar = 0;
      allocations = targetLines.map((line, idx) => {
        const base = line.customerPayable ?? line.lineTotal;
        if (totalEligibleAmount === 0) {
          return {
            id: line.id || "",
            name: line.serviceName || line.name || "Service",
            basePayable: base,
            allocatedDiscount: 0,
            finalAmount: base,
          };
        }

        let disc = 0;
        if (idx === targetLines.length - 1) {
          // Last line absorbs remainder to prevent 1 paisa rounding drift
          disc =
            Math.round((totalDiscountToAllocate - allocatedSoFar) * 100) / 100;
        } else {
          disc =
            Math.round(
              (base / totalEligibleAmount) * totalDiscountToAllocate * 100,
            ) / 100;
          allocatedSoFar += disc;
        }

        return {
          id: line.id || "",
          name: line.serviceName || line.name || "Service",
          basePayable: base,
          allocatedDiscount: disc,
          finalAmount: Math.max(0, base - disc),
        };
      });
    }

    const currentPayable = invoice?.payableAmount ?? 0;
    const estimatedNewPayable = Math.max(
      0,
      currentPayable - calculatedDiscountTotal,
    );
    const amountPaid = invoice?.amountPaid ?? 0;
    const estimatedNewDue = Math.max(0, estimatedNewPayable - amountPaid);

    return {
      totalEligibleAmount,
      calculatedDiscountTotal,
      allocations,
      estimatedNewPayable,
      amountPaid,
      estimatedNewDue,
    };
  }, [
    watchedEnteredValue,
    watchedLevel,
    watchedType,
    watchedLineIds,
    eligibleLines,
    invoice,
  ]);

  const onSubmit = async (values: ApplyDiscountFormValues) => {
    if (!invoice?.id) return;

    if (!values.branchId || values.branchId === "all") {
      toast.error("An active branch is required to apply discounts.");
      return;
    }

    try {
      const isSelectedLines = values.discountLevel === "selected_lines";
      const isSingleLine = values.discountLevel === "line";

      const payload: ApplyDiscountPayload = {
        branchId: values.branchId,
        discountLevel: values.discountLevel,
        name: values.name?.trim() ? values.name.trim() : undefined,
        discountType: values.discountType,
        enteredValue: Number(values.enteredValue),
        reason: values.reason.trim(),
      };

      if (isSingleLine && values.lineId) {
        payload.lineId = values.lineId;
      } else if (
        isSelectedLines &&
        values.lineIds &&
        values.lineIds.length > 0
      ) {
        payload.lineIds = values.lineIds;
      }
      // For invoice-level discounts, both lineId and lineIds remain undefined (omitted)

      await applyMutation.mutateAsync({
        invoiceId: invoice.id,
        payload,
      });

      toast.success("Discount applied successfully");
      onClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (error.response?.status === 409) {
        toast.error(
          "Concurrency conflict: The invoice was modified. Refreshing latest data.",
        );
        onConflictRefresh?.();
        onClose();
        return;
      }

      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to apply discount.";
      toast.error(msg);
    }
  };

  const selectedCount = watchedLineIds.length;
  const isAllSelected =
    eligibleLines.length > 0 && selectedCount === eligibleLines.length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Discount"
      maxWidth="2xl"
      className="p-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0"
      >
        <input type="hidden" {...register("branchId")} />

        {/* Dialog Subheader Info Bar */}
        <div className="px-6 py-3 border-b border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Draft Invoice:
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[11px] bg-background"
            >
              {invoice?.invoiceNumber || "Draft Invoice"}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-muted-foreground">
              Current Payable:{" "}
              <strong className="text-foreground font-mono font-bold">
                {formatCurrency(invoice?.payableAmount ?? 0)}
              </strong>
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground">
              Paid:{" "}
              <strong className="text-foreground font-mono">
                {formatCurrency(invoice?.amountPaid ?? 0)}
              </strong>
            </span>
          </div>
        </div>

        {/* Scrollable Dialog Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
          {/* SECTION 1: Scope Selection (Accessible Segmented Toggle Cards) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>1. Discount Scope</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Target specific services or entire bill
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Selected Services Scope Card */}
              <button
                type="button"
                onClick={() => {
                  setValue("discountLevel", "selected_lines", {
                    shouldValidate: true,
                  });
                  if (watchedLineIds.length === 0) {
                    handleSelectAll();
                  }
                }}
                className={`relative group p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                  watchedLevel === "selected_lines" || watchedLevel === "line"
                    ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-card border-border/80 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        watchedLevel === "selected_lines" ||
                        watchedLevel === "line"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Selected Services
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Multi-service targets
                      </span>
                    </div>
                  </div>

                  {(watchedLevel === "selected_lines" ||
                    watchedLevel === "line") && (
                    <Badge
                      variant="default"
                      className="text-[10px] px-2 py-0 h-5"
                    >
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Select specific uncovered services to receive targeted
                  discounts.
                </p>
              </button>

              {/* Entire Invoice Scope Card */}
              <button
                type="button"
                onClick={() => {
                  setValue("discountLevel", "invoice", {
                    shouldValidate: true,
                  });
                }}
                className={`relative group p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                  watchedLevel === "invoice"
                    ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-card border-border/80 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        watchedLevel === "invoice"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Entire Invoice
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Invoice-level allocation
                      </span>
                    </div>
                  </div>

                  {watchedLevel === "invoice" && (
                    <Badge
                      variant="default"
                      className="text-[10px] px-2 py-0 h-5"
                    >
                      Active
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Calculates across the bill and distributes automatically to
                  all eligible lines.
                </p>
              </button>
            </div>
            {errors.discountLevel && (
              <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                <ShieldAlert className="h-3 w-3" />
                <span>{errors.discountLevel.message}</span>
              </p>
            )}
          </div>

          {/* SECTION 2: Service Selection Table (conditionally rendered when scope is selected_lines) */}
          {(watchedLevel === "selected_lines" || watchedLevel === "line") && (
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Eligible Service Lines
                  </span>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] h-5"
                  >
                    {selectedCount} of {eligibleLines.length} selected
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleSelectAll}
                    disabled={isAllSelected}
                    className="h-6 px-2 text-[11px] font-semibold gap-1 rounded-md"
                  >
                    <Check className="h-3 w-3 text-primary" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAll}
                    disabled={selectedCount === 0}
                    className="h-6 px-2 text-[11px] font-medium gap-1 text-muted-foreground hover:text-foreground rounded-md"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear Selection
                  </Button>
                </div>
              </div>

              {eligibleLines.length === 0 ? (
                <div className="p-3 bg-background/80 rounded-xl text-xs text-muted-foreground border border-border/60 flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    All line items in this invoice are covered by subscriptions
                    and cannot receive discounts.
                  </span>
                </div>
              ) : (
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs divide-y divide-border/60 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-12 px-3 py-2 bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="col-span-1 text-center">✓</span>
                    <span className="col-span-6">Service Details</span>
                    <span className="col-span-2 text-right">Original</span>
                    <span className="col-span-3 text-right">
                      Remaining Base
                    </span>
                  </div>

                  {eligibleLines.map((line) => {
                    const lineId = line.id || "";
                    const isChecked = watchedLineIds.includes(lineId);
                    const origPrice = line.lineTotal || line.unitPrice;
                    const currentPayable = line.customerPayable ?? origPrice;
                    const existingDiscount = Math.max(
                      0,
                      origPrice - currentPayable,
                    );

                    return (
                      <div
                        key={lineId}
                        onClick={() => handleToggleLine(lineId)}
                        className={`grid grid-cols-12 px-3 py-2 text-xs items-center gap-1.5 cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleLine(lineId)}
                            className="h-4 w-4 rounded-md border-border text-primary focus:ring-primary/40 cursor-pointer accent-primary"
                          />
                        </div>

                        <div className="col-span-6 pr-2">
                          <span className="font-semibold text-foreground block truncate">
                            {line.serviceName || line.name}
                          </span>
                          {existingDiscount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Prior disc: -{formatCurrency(existingDiscount)}
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 text-right text-muted-foreground font-mono text-[11px]">
                          {formatCurrency(origPrice)}
                        </div>

                        <div className="col-span-3 text-right font-bold text-foreground font-mono text-xs">
                          {formatCurrency(currentPayable)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.lineIds && (
                <p className="text-[11px] text-destructive flex items-center gap-1 pt-0.5">
                  <ShieldAlert className="h-3 w-3" />
                  <span>{errors.lineIds.message}</span>
                </p>
              )}
            </div>
          )}

          {/* SECTION 2 (Alt): Invoice-wide Info Banner */}
          {watchedLevel === "invoice" && (
            <div className="p-3 bg-linear-to-r from-primary/5 to-muted/20 border border-primary/20 rounded-xl flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground">
                  Proportional Allocation Active
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The discount will be proportionally allocated across all{" "}
                  {eligibleLines.length} eligible uncovered services based on
                  their remaining customer payable. Subscription-covered lines
                  remain fully protected.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: Discount Configuration */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>2. Discount Configuration</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Specify calculation type & amount
              </span>
            </div>

            {/* Row 1: Unified Type Toggle + Amount Input Group */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
              {/* Type Switcher (Left side: 5.5 cols for clean nowrap single-line button labels) */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Calculation Mode <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 p-1 bg-muted/70 border border-border rounded-lg gap-1.5 h-10 items-center shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setValue("discountType", "percentage", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    className={`h-8 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      watchedType === "percentage"
                        ? "bg-background text-foreground shadow-xs font-bold border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="whitespace-nowrap">Percentage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("discountType", "fixed", {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    className={`h-8 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      watchedType === "fixed"
                        ? "bg-background text-foreground shadow-xs font-bold border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IndianRupee className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="whitespace-nowrap">Fixed Total</span>
                  </button>
                </div>
              </div>

              {/* Value Input (Right side: 6 cols) */}
              <div className="md:col-span-6 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground block">
                    {watchedType === "percentage"
                      ? "Discount Rate (%)"
                      : "Discount Amount (₹)"}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {watchedType === "percentage"
                      ? "Scale: 0.1% – 100%"
                      : "Proportionally distributed"}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    {watchedType === "percentage" ? (
                      <Percent className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="font-bold text-sm text-primary">₹</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max={watchedType === "percentage" ? 100 : undefined}
                    placeholder={watchedType === "percentage" ? "10" : "150"}
                    {...register("enteredValue", {
                      valueAsNumber: true,
                    })}
                    className="pl-9 pr-12 text-sm h-10 font-bold font-mono bg-background border-border focus:border-primary"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-semibold text-muted-foreground">
                    {watchedType === "percentage" ? "%" : "INR"}
                  </div>
                </div>
                {errors.enteredValue && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    <span>{errors.enteredValue.message}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Percentage Presets Strip (Only shown when percentage is selected) */}
            {watchedType === "percentage" && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                  Quick Rates:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 15, 20, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      className={`h-6 px-2.5 rounded-md border text-xs font-mono font-medium transition-all cursor-pointer ${
                        activePreset === pct
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-background border-border/80 hover:border-primary/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row 2: Discount Name / Label & Dedicated Preset Strip in Next Line */}
            <div className="pt-2.5 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <span>Campaign / Label Name</span>
                  <span className="text-muted-foreground font-normal text-[11px]">
                    (Optional tag for invoice receipt)
                  </span>
                </label>
              </div>

              <Input
                placeholder="e.g. Festival Special, VIP Loyalty, First Visit Promo..."
                {...register("name")}
                className="text-xs h-9 bg-background font-medium"
              />
              {errors.name && (
                <p className="text-[11px] text-destructive">
                  {errors.name.message}
                </p>
              )}

              {/* Dedicated Next-Line Preset Pills */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Common Campaign Presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Festival Promo",
                    "VIP Client",
                    "First Visit",
                    "Manager Courtesy",
                    "Birthday Special",
                    "Bridal Package",
                    "Staff Family",
                  ].map((nameChip) => (
                    <button
                      key={nameChip}
                      type="button"
                      onClick={() => handlePresetName(nameChip)}
                      className="px-2.5 py-1 rounded-lg bg-background border border-border hover:border-primary/60 hover:bg-primary/5 hover:text-primary text-[11px] font-medium text-muted-foreground transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-primary/70 shrink-0" />
                      <span>{nameChip}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Live Breakdown & Financial Impact Preview Card */}
          {livePreview && livePreview.allocations.length > 0 && (
            <div className="space-y-2.5 rounded-2xl border border-primary/25 bg-linear-to-b from-primary/5 via-card to-background p-3.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Live Allocation Breakdown
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Informational preview • authoritatively finalized by
                      server
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Eligible Target Pool
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {formatCurrency(livePreview.totalEligibleAmount)}
                  </span>
                </div>
              </div>

              {/* Service Allocation Table */}
              <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs divide-y divide-border/60 text-xs">
                <div className="grid grid-cols-12 px-3 py-1.5 bg-muted/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-5">Service Target</span>
                  <span className="col-span-2 text-right">Eligible Base</span>
                  <span className="col-span-2 text-right">Discount</span>
                  <span className="col-span-3 text-right">New Payable</span>
                </div>

                {livePreview.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="grid grid-cols-12 px-3 py-1.5 items-center font-mono text-[11px] hover:bg-muted/30 transition-colors"
                  >
                    <span className="col-span-5 truncate text-foreground font-sans font-medium">
                      {alloc.name}
                    </span>
                    <span className="col-span-2 text-right text-muted-foreground">
                      {formatCurrency(alloc.basePayable)}
                    </span>
                    <span className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      -{formatCurrency(alloc.allocatedDiscount)}
                    </span>
                    <span className="col-span-3 text-right font-extrabold text-foreground">
                      {formatCurrency(alloc.finalAmount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* 4-Metric Financial Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-xs">
                <div className="p-2.5 bg-background rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                    Total Discount
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">
                    -{formatCurrency(livePreview.calculatedDiscountTotal)}
                  </strong>
                </div>

                <div className="p-2.5 bg-background rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                    Est. New Payable
                  </span>
                  <strong className="text-foreground font-bold font-mono text-sm">
                    {formatCurrency(livePreview.estimatedNewPayable)}
                  </strong>
                </div>

                <div className="p-2.5 bg-background rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                    Amount Paid
                  </span>
                  <strong className="text-muted-foreground font-bold font-mono text-sm">
                    {formatCurrency(livePreview.amountPaid)}
                  </strong>
                </div>

                <div className="p-2.5 bg-background rounded-xl border border-border/80 shadow-2xs">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold tracking-wider">
                    Remaining Due
                  </span>
                  <strong className="text-primary font-bold font-mono text-sm">
                    {formatCurrency(livePreview.estimatedNewDue)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Operational Reason */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-primary" />
                <span>3. Operational Audit Justification</span>
                <span className="text-destructive">*</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                3 - 500 characters
              </span>
            </div>
            <Textarea
              placeholder="Provide mandatory operational or business justification (e.g., Seasonal campaign, VIP loyalty discount)..."
              rows={2}
              {...register("reason")}
              className="text-xs resize-none bg-background leading-relaxed min-h-15"
            />
            {errors.reason && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                <span>{errors.reason.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <div className="px-6 py-3 border-t border-border/70 bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>
              Discounts can be modified or removed while invoice is in Draft.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting || applyMutation.isPending}
              className="text-xs h-8 px-3.5 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isSubmitting ||
                applyMutation.isPending ||
                ((watchedLevel === "selected_lines" ||
                  watchedLevel === "line") &&
                  selectedCount === 0)
              }
              className="text-xs h-8 px-4 font-bold gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>
                {applyMutation.isPending ? "Applying..." : "Apply Discount"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
