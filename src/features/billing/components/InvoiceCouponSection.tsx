"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Ticket, Tag, Trash2, CheckCircle2, AlertCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useApplyCouponToInvoice, useRemoveCouponFromInvoice } from "../hooks/useBillingMutations";
import type { Invoice } from "../types/billing.types";

interface InvoiceCouponSectionProps {
  invoice: Invoice;
  canManageCoupons: boolean;
}

export function InvoiceCouponSection({
  invoice,
  canManageCoupons,
}: InvoiceCouponSectionProps) {
  const [couponCode, setCouponCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyMutation = useApplyCouponToInvoice();
  const removeMutation = useRemoveCouponFromInvoice();

  const isDraft = invoice.status === "draft";
  const appliedCoupon = invoice.coupon;
  const targetBranchId = invoice.branchId || invoice.branch?.id;

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedCode = couponCode.trim();
    if (!trimmedCode) {
      setErrorMessage("Please enter a valid coupon code.");
      return;
    }

    setErrorMessage(null);
    try {
      await applyMutation.mutateAsync({
        invoiceId: invoice.id,
        code: trimmedCode,
        branchId: targetBranchId,
      });
      toast.success(`Coupon ${trimmedCode.toUpperCase()} applied successfully.`);
      setCouponCode("");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to apply coupon.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleRemoveCoupon = async () => {
    setErrorMessage(null);
    try {
      await removeMutation.mutateAsync({
        invoiceId: invoice.id,
        branchId: targetBranchId,
      });
      toast.success("Coupon removed successfully.");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to remove coupon.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  // If there's an applied coupon, render applied banner
  if (appliedCoupon) {
    return (
      <div
        data-testid="invoice-applied-coupon-section"
        className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                Applied Coupon
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold"
                >
                  ACTIVE
                </Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Authoritative campaign discount applied to this invoice
              </p>
            </div>
          </div>

          {/* Remove button: only available on draft invoice when user has both permissions */}
          {isDraft && canManageCoupons && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveCoupon}
              disabled={removeMutation.isPending}
              data-testid="remove-coupon-button"
              className="text-xs h-8 px-3 gap-1.5 font-medium text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Coupon</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Coupon Card Content */}
        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  data-testid="applied-coupon-code"
                  className="font-mono font-bold text-sm text-foreground uppercase tracking-wide"
                >
                  {appliedCoupon.codeUpper || appliedCoupon.code}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({appliedCoupon.discountType === "percentage"
                    ? `${appliedCoupon.discountValue}% OFF`
                    : `${formatCurrency(appliedCoupon.discountValue)} OFF`})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Backend calculated discount applied to gross payable amount
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right pl-12 sm:pl-0 sm:border-l sm:border-border/60 sm:pl-4">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">
              Coupon Deduction
            </span>
            <span
              data-testid="applied-coupon-amount"
              className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono"
            >
              -{formatCurrency(appliedCoupon.calculatedDiscountAmount)}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div
            data-testid="coupon-error-alert"
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs flex items-center gap-2 text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // If no coupon applied, only show the input section if it is draft and user can manage coupons
  if (!isDraft || !canManageCoupons) {
    return null;
  }

  return (
    <div
      data-testid="invoice-coupon-input-section"
      className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Coupon Campaign
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Apply a promotional or referral coupon code to this draft invoice
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Enter coupon code (e.g. SAVE20)"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={applyMutation.isPending}
              data-testid="coupon-code-input"
              className="pl-9 font-mono uppercase text-xs h-9 tracking-wider"
            />
          </div>
          <Button
            type="submit"
            disabled={applyMutation.isPending || !couponCode.trim()}
            data-testid="apply-coupon-button"
            className="text-xs h-9 px-4 font-bold gap-1.5 shadow-xs cursor-pointer"
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                <span>Apply Coupon</span>
              </>
            )}
          </Button>
        </div>

        {errorMessage && (
          <div
            data-testid="coupon-error-alert"
            className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs flex items-center gap-2 text-destructive animate-in fade-in-50"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}

