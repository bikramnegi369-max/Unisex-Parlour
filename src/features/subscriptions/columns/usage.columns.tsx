import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "@/lib/formatters";
import type { SubscriptionUsageRecord } from "../types/subscription.types";

interface UsageColumnsOptions {
  getBranchName: (branchId: string) => string;
}

export const getSubscriptionUsageColumns = ({
  getBranchName,
}: UsageColumnsOptions): ColumnDef<SubscriptionUsageRecord>[] => [
  {
    accessorKey: "redeemedAt",
    header: "Date & Time",
    cell: ({ row }) => (
      <span className="text-xs font-medium text-foreground">
        {formatDateTime(row.original.redeemedAt)}
      </span>
    ),
  },
  {
    accessorKey: "serviceName",
    header: "Service",
    cell: ({ row }) => {
      const u = row.original;
      const rawService = u.serviceName || (u.serviceId as unknown);
      let displayName = "Service";
      if (typeof rawService === "string") {
        displayName = rawService;
      } else if (typeof rawService === "object" && rawService !== null) {
        displayName =
          (rawService as { name?: string; _id?: string }).name ||
          (rawService as { name?: string; _id?: string })._id ||
          "Service";
      }
      return (
        <span className="text-xs font-semibold text-foreground">
          {displayName}
        </span>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className="text-xs font-bold text-foreground">
        {row.original.quantity}
      </span>
    ),
  },
  {
    accessorKey: "branchId",
    header: "Branch",
    cell: ({ row }) => {
      const u = row.original;
      const rawBranch = (u.branchId as unknown);
      let branchIdStr = "";
      let directName: string | undefined = u.branchName;

      if (typeof rawBranch === "string") {
        branchIdStr = rawBranch;
      } else if (typeof rawBranch === "object" && rawBranch !== null) {
        const bObj = rawBranch as { _id?: string; id?: string; name?: string };
        branchIdStr = bObj._id || bObj.id || "";
        directName = directName || bObj.name;
      }

      return (
        <span className="text-xs text-muted-foreground">
          {directName || getBranchName(branchIdStr)}
        </span>
      );
    },
  },
  {
    accessorKey: "appointmentId",
    header: "Appointment",
    cell: ({ row }) => {
      const apt = row.original.appointmentId as unknown;
      if (!apt) return <span className="text-xs text-muted-foreground">-</span>;
      let displayApt = "-";
      if (typeof apt === "string") {
        displayApt = apt;
      } else if (typeof apt === "object" && apt !== null) {
        displayApt =
          (apt as { appointmentCode?: string; _id?: string; id?: string })
            .appointmentCode ||
          (apt as { appointmentCode?: string; _id?: string; id?: string })
            ._id ||
          (apt as { appointmentCode?: string; _id?: string; id?: string })
            .id ||
          "-";
      }
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {displayApt}
        </span>
      );
    },
  },
  {
    accessorKey: "redeemedBy",
    header: "Redeemed By",
    cell: ({ row }) => {
      const by = row.original.redeemedBy as unknown;
      let label = "Staff";
      if (typeof by === "string") {
        label = by;
      } else if (typeof by === "object" && by !== null) {
        label = (by as { name?: string; _id?: string }).name || "Staff";
      }
      return <span className="text-xs text-muted-foreground">{label}</span>;
    },
  },
];
