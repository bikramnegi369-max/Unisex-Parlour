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
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-foreground">
        {row.original.serviceName || row.original.serviceId}
      </span>
    ),
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
      return (
        <span className="text-xs text-muted-foreground">
          {u.branchName || getBranchName(u.branchId)}
        </span>
      );
    },
  },
  {
    accessorKey: "appointmentId",
    header: "Appointment",
    cell: ({ row }) => {
      const aptId = row.original.appointmentId;
      if (!aptId) return <span className="text-xs text-muted-foreground">-</span>;
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {aptId}
        </span>
      );
    },
  },
  {
    accessorKey: "redeemedBy",
    header: "Redeemed By",
    cell: ({ row }) => {
      const by = row.original.redeemedBy;
      const label = typeof by === "object" && by !== null ? by.name : by || "Staff";
      return <span className="text-xs text-muted-foreground">{label}</span>;
    },
  },
];
