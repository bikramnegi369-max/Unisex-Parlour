"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { CouponStatus } from "../types/coupon.types";

interface CouponStatusBadgeProps {
  status: CouponStatus;
  validUntil: string;
  isExpired?: boolean;
}

/**
 * Visual badge reflecting authoritative backend coupon status and expiry contract.
 * Backend contract:
 * - status: "active" | "inactive" (administrative setting)
 * - isExpired: dynamic virtual derived from (now > validUntil)
 */
export function CouponStatusBadge({ status, validUntil, isExpired }: CouponStatusBadgeProps) {
  const now = new Date();
  const endDate = new Date(validUntil);
  // Authoritative check: use backend virtual boolean if provided, otherwise evaluate against validUntil
  const derivedExpired = isExpired ?? (endDate.getTime() ? now > endDate : false);

  if (derivedExpired) {
    return (
      <Badge variant="warning" className="gap-1 font-medium">
        <Clock className="w-3.5 h-3.5" />
        Expired
      </Badge>
    );
  }

  if (status === "inactive") {
    return (
      <Badge variant="muted" className="gap-1 font-medium">
        <XCircle className="w-3.5 h-3.5" />
        Inactive
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Active
    </Badge>
  );
}
