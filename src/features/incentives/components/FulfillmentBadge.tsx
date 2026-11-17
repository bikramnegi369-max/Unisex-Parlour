import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Ban, AlertTriangle } from "lucide-react";

interface FulfillmentBadgeProps {
  status: "pending" | "confirmed" | "corrected" | "cancelled" | string;
}

export const FulfillmentBadge: React.FC<FulfillmentBadgeProps> = ({ status }) => {
  switch (status) {
    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-semibold text-[11px] py-0.5"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fulfilled
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-semibold text-[11px] py-0.5"
        >
          <Clock className="w-3 h-3 text-amber-600" /> Pending Gate
        </Badge>
      );
    case "corrected":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-semibold text-[11px] py-0.5"
        >
          <AlertTriangle className="w-3 h-3 text-blue-600" /> Corrected
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-zinc-100 text-zinc-600 border-zinc-200 flex items-center gap-1 font-semibold text-[11px] py-0.5"
        >
          <Ban className="w-3 h-3 text-zinc-500" /> Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-zinc-600 font-semibold text-[11px] py-0.5">
          {status}
        </Badge>
      );
  }
};
