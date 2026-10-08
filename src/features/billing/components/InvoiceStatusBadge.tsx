import React from "react";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus, PaymentStatus, PaymentRecordStatus } from "../types/billing.types";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  switch (status) {
    case "draft":
      return (
        <Badge
          variant="outline"
          className={`border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold ${className || ""}`}
        >
          Draft
        </Badge>
      );
    case "finalized":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold ${className || ""}`}
        >
          Finalized
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className={`border-destructive/40 bg-destructive/10 text-destructive font-semibold ${className || ""}`}
        >
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  switch (status) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-600/40 bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 font-bold ${className || ""}`}
        >
          Paid
        </Badge>
      );
    case "partially_paid":
      return (
        <Badge
          variant="outline"
          className={`border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold ${className || ""}`}
        >
          Partially Paid
        </Badge>
      );
    case "unpaid":
      return (
        <Badge
          variant="outline"
          className={`border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold ${className || ""}`}
        >
          Unpaid
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}

interface PaymentRecordStatusBadgeProps {
  status: PaymentRecordStatus;
  className?: string;
}

export function PaymentRecordStatusBadge({ status, className }: PaymentRecordStatusBadgeProps) {
  switch (status) {
    case "recorded":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium ${className || ""}`}
        >
          Recorded
        </Badge>
      );
    case "voided":
      return (
        <Badge
          variant="outline"
          className={`border-destructive/40 bg-destructive/10 text-destructive font-semibold line-through ${className || ""}`}
        >
          Voided
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}
