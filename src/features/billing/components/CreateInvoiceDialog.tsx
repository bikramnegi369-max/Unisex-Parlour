"use client";

import React, { useMemo } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Receipt, ShieldCheck, User, Calendar, Scissors, Award, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCreateInvoice } from "../hooks/useBillingMutations";
import {
  createInvoiceSchema,
  type CreateInvoiceFormValues,
} from "../schemas/billing.schema";
import type { Appointment, AppointmentServiceSnapshot } from "@/features/appointments/types/appointment.types";
import { useCustomer } from "@/features/customers/hooks/useCustomer";
import { useRedemptionPreview } from "@/features/loyalty/hooks/useLoyaltyQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { useBranchContext } from "@/hooks/useBranchContext";

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess?: (invoiceId: string) => void;
}

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { currentBranchId } = useBranchContext();
  const createInvoiceMutation = useCreateInvoice();

  const customerId = appointment?.customerId || appointment?.customer?.id;
  const { data: customer } = useCustomer(customerId || null);

  const services = useMemo(() => {
    return appointment?.services || [];
  }, [appointment]);

  // Pricing calculations based on appointment's resolved snapshot
  const subtotal = useMemo(() => {
    return services.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [services]);

  const subscriptionCoveredAmount = useMemo(() => {
    return services.reduce((sum, s) => {
      return sum + (s.appliedSubscriptionId ? s.price || 0 : 0);
    }, 0);
  }, [services]);

  const effectiveBranchId =
    appointment?.branchId ||
    appointment?.branch?.id ||
    currentBranchId ||
    "";

  const effectiveAppointmentId = appointment?.id || "";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema) as unknown as Resolver<CreateInvoiceFormValues>,
    defaultValues: {
      branchId: effectiveBranchId,
      appointmentId: effectiveAppointmentId,
      redeemLoyaltyPoints: 0,
      notes: appointment?.notes || "",
    },
    values: appointment
      ? {
          branchId: effectiveBranchId,
          appointmentId: effectiveAppointmentId,
          redeemLoyaltyPoints: 0,
          notes: appointment.notes || "",
        }
      : undefined,
  });

  const enteredLoyaltyPoints =
    Number(
      useWatch({
        control,
        name: "redeemLoyaltyPoints",
        defaultValue: 0,
      })
    ) || 0;

  // Debounce requested points to prevent racing API queries
  const debouncedLoyaltyPoints = useDebounce(enteredLoyaltyPoints, 350);

  // Bill amount for pre-creation preview: gross uncovered amount
  const preliminaryBillAmount = Math.max(0, subtotal - subscriptionCoveredAmount);

  // Read-only server-authoritative redemption preview using supported billAmount parameter
  const { data: previewData, isLoading: isPreviewLoading } = useRedemptionPreview(
    customerId && debouncedLoyaltyPoints > 0
      ? {
          customerId,
          billAmount: preliminaryBillAmount,
          pointsRequested: debouncedLoyaltyPoints,
        }
      : null,
    { enabled: Boolean(isOpen && customerId && debouncedLoyaltyPoints > 0) }
  );

  const grossPayable = subtotal;
  const estimatedPayable = previewData?.effectivePayable ?? Math.max(0, grossPayable - subscriptionCoveredAmount - (previewData?.appliedDiscount || 0));

  const onSubmit = async (values: CreateInvoiceFormValues) => {
    if (!appointment) return;
    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        branchId: values.branchId || effectiveBranchId,
        appointmentId: values.appointmentId || effectiveAppointmentId,
        redeemLoyaltyPoints: values.redeemLoyaltyPoints && values.redeemLoyaltyPoints > 0 ? values.redeemLoyaltyPoints : undefined,
        notes: values.notes,
      });

      toast.success(`Draft invoice ${invoice.invoiceNumber || ""} created successfully.`);
      reset();
      onClose();
      if (onSuccess) {
        onSuccess(invoice.id);
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to generate invoice.";
      toast.error(msg);
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    const firstErrorMessage =
      formErrors.branchId?.message ||
      formErrors.appointmentId?.message ||
      formErrors.redeemLoyaltyPoints?.message ||
      "Please check the invoice form fields.";
    toast.error(firstErrorMessage);
  };

  if (!appointment) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Invoice from Appointment"
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Create a billable invoice record for Appointment {appointment.appointmentCode || `#${appointment.id.slice(-6)}`}
        </p>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
        {/* Customer & Appointment Info Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/30 border border-border/80 rounded-xl text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <User className="h-3.5 w-3.5" /> Customer Details
            </span>
            <p className="font-semibold text-foreground text-sm">
              {appointment.customer?.name || "Customer"}
            </p>
            <p className="text-muted-foreground">
              {appointment.customer?.phone || "No phone"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" /> Appointment Details
            </span>
            <p className="font-semibold text-foreground">
              {formatDate(appointment.date, "dd MMM yyyy")} at {appointment.startTime || "—"}
            </p>
            <p className="text-muted-foreground capitalize">
              Type: {appointment.bookingType.replace("_", " ")} • Status: {appointment.status}
            </p>
          </div>
        </div>

        {/* Resolved Line Items (Read-only) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-primary" />
              Service Line Items (Resolved Pricing)
            </label>
            <span className="text-[11px] text-muted-foreground">
              Line prices are fixed from appointment
            </span>
          </div>

          <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
            {services.map((item: AppointmentServiceSnapshot, idx: number) => {
              const isCovered = Boolean(item.appliedSubscriptionId);
              return (
                <div
                  key={item.serviceId || item._id || item.id || `invoice-srv-${idx}`}
                  className="p-3 flex items-center justify-between text-xs gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      {item.duration && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.duration}m
                        </span>
                      )}
                      {(item.isCustom || item.serviceType === "custom" || !item.serviceId) && (
                        <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                      {isCovered && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Subscription Redeemed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.price || 0)}
                    </span>
                    {isCovered && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Covered: -{formatCurrency(item.price || 0)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary & Inputs */}
        <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal (Sum of line items)</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {subscriptionCoveredAmount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Subscription Coverage Total
              </span>
              <span className="font-semibold">
                -{formatCurrency(subscriptionCoveredAmount)}
              </span>
            </div>
          )}

          {previewData && previewData.appliedDiscount > 0 && (
            <div className="flex items-center justify-between text-xs text-primary font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Loyalty Discount ({enteredLoyaltyPoints} pts)
              </span>
              <span className="font-semibold">
                -{formatCurrency(previewData.appliedDiscount)}
              </span>
            </div>
          )}

          {/* Loyalty Redemption Section */}
          {customer && (customer.loyaltyPoints ?? 0) > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Redeem Loyalty Points (Optional)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Available: <strong>{customer.loyaltyPoints ?? 0} pts</strong>
                </span>
              </div>

              {(customer.loyaltyPointsDebt ?? 0) > 0 && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Customer has {customer.loyaltyPointsDebt} pts debt from previous reversals.
                </p>
              )}

              <div className="space-y-1">
                <Input
                  type="number"
                  min="0"
                  max={customer.loyaltyPoints ?? 0}
                  step="1"
                  placeholder="Enter points to redeem..."
                  {...register("redeemLoyaltyPoints")}
                  className="text-xs h-8"
                />
                {errors.redeemLoyaltyPoints && (
                  <p className="text-[10px] text-destructive">
                    {errors.redeemLoyaltyPoints.message}
                  </p>
                )}
              </div>

              {/* Server-authoritative preview feedback */}
              {isPreviewLoading && (
                <p className="text-[10px] text-muted-foreground italic">
                  Calculating server redemption preview...
                </p>
              )}
              {previewData && !previewData.isEligible && (
                <p className="text-[10px] text-destructive font-medium">
                  {previewData.reason || "Points cannot be redeemed for this bill amount."}
                </p>
              )}
              {previewData && previewData.isEligible && previewData.maxRedeemablePoints < debouncedLoyaltyPoints && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Notice: Program cap limits redemption to max {previewData.maxRedeemablePoints} points ({formatCurrency(previewData.maxRedemptionDiscount)} max discount).
                </p>
              )}
            </div>
          )}

          {/* Customer Payable */}
          <div className="flex items-center justify-between pt-2 border-t border-border/80 font-bold text-sm text-foreground">
            <span>Customer Payable</span>
            <span className="text-base text-primary font-black">
              {formatCurrency(estimatedPayable)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Invoice Notes (Optional)
          </label>
          <Textarea
            rows={2}
            placeholder="Add any internal or billing notes..."
            {...register("notes")}
            className="text-xs resize-none"
          />
          {errors.notes && (
            <p className="text-[10px] text-destructive">
              {errors.notes.message}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || createInvoiceMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || createInvoiceMutation.isPending}
            className="text-xs font-semibold gap-1.5"
          >
            <Receipt className="h-3.5 w-3.5" />
            {isSubmitting || createInvoiceMutation.isPending
              ? "Generating..."
              : "Generate Draft Invoice"}
          </Button>
        </div>
      </form>
    </div>
    </Dialog>
  );
}
