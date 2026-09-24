import React from "react";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionStatus } from "../types/subscription.types";

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus | string;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[11px] capitalize">
          Active
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[11px] capitalize">
          Expired
        </Badge>
      );
    case "exhausted":
      return (
        <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-semibold text-[11px] capitalize">
          Exhausted
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold text-[11px] capitalize">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground font-semibold text-[11px] capitalize">
          {status}
        </Badge>
      );
  }
}
