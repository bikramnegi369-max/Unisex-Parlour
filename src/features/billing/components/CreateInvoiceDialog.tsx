"use client";

import React, { useMemo } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Receipt, ShieldCheck, User, Calendar, Scissors } from "lucide-react";
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
  const createInvoiceMutation = useCreateInvoice();

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

  const initialDiscount = appointment?.pricing?.discount || 0;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema) as unknown as Resolver<CreateInvoiceFormValues>,
    defaultValues: {
      branchId: appointment?.branchId || "",
      appointmentId: appointment?.id || "",
      discountTotal: initialDiscount,
      notes: appointment?.notes || "",
    },
    values: appointment
      ? {
          branchId: appointment.branchId,
          appointmentId: appointment.id,
          discountTotal: initialDiscount,
          notes: appointment.notes || "",
        }
      : undefined,
  });

  const enteredDiscount = useWatch({
    control,
    name: "discountTotal",
    defaultValue: initialDiscount,
  }) || 0;
  const grossPayable = Math.max(0, subtotal - (Number(enteredDiscount) || 0));
  const estimatedPayable = Math.max(0, grossPayable - subscriptionCoveredAmount);

  const onSubmit = async (values: CreateInvoiceFormValues) => {
    if (!appointment) return;
    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        branchId: appointment.branchId,
        appointmentId: appointment.id,
        discountTotal: values.discountTotal,
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  key={item.serviceId || idx}
                  className="p-3 flex items-center justify-between text-xs gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      {item.duration && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.duration}m
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

          {/* Discount Input */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-foreground block">
                  Invoice Discount (₹)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Applied to draft invoice
                </p>
              </div>
              <div className="w-36">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  {...register("discountTotal")}
                  className="h-8 text-right font-medium text-xs"
                />
                {errors.discountTotal && (
                  <p className="text-[10px] text-destructive mt-0.5 text-right">
                    {errors.discountTotal.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Gross Payable (Subtotal - Discount)</span>
            <span className="font-medium text-foreground">
              {formatCurrency(grossPayable)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/80 font-bold text-sm text-foreground">
            <span>Final Customer Payable</span>
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
