import React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Eye, Edit, Ban, Gift, Building2, User } from "lucide-react";
import type { Subscription } from "../types/subscription.types";
import { SubscriptionStatusBadge } from "../components/SubscriptionStatusBadge";

interface SubscriptionColumnsOptions {
  onView: (subscription: Subscription) => void;
  onEdit: (subscription: Subscription) => void;
  onCancel: (subscription: Subscription) => void;
  onRedeem: (subscription: Subscription) => void;
  canView: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canRedeem: boolean;
  getBranchName: (branchId: string) => string;
}

export const getSubscriptionColumns = ({
  onView,
  onEdit,
  onCancel,
  onRedeem,
  canView,
  canEdit,
  canCancel,
  canRedeem,
  getBranchName,
}: SubscriptionColumnsOptions): ColumnDef<Subscription>[] => [
  {
    accessorKey: "subscriptionCode",
    header: "Code",
    cell: ({ row }) => {
      const sub = row.original;
      return (
        <div className="flex flex-col">
          <span
            className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={() => onView(sub)}
          >
            {sub.subscriptionCode || sub.id}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Created {formatDate(sub.createdAt)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "customerId",
    header: "Customer",
    cell: ({ row }) => {
      const sub = row.original;
      const customer = sub.customer;
      return (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            {customer ? (
              <>
                <Link
                  href={`/customers/${customer.id || (typeof sub.customerId === "string" ? sub.customerId : "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-xs text-foreground hover:text-primary truncate underline-offset-2 hover:underline"
                >
                  {customer.name}
                </Link>
                <span className="text-[10px] text-muted-foreground truncate">
                  {customer.phone}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground truncate">
                ID: {typeof sub.customerId === "string" ? sub.customerId : (sub.customerId as { _id?: string; id?: string })?._id || (sub.customerId as { _id?: string; id?: string })?.id || "N/A"}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="font-semibold text-xs text-foreground">
        {formatCurrency(row.original.price)}
      </span>
    ),
  },
  {
    id: "validity",
    header: "Validity",
    cell: ({ row }) => {
      const { startDate, endDate } = row.original;
      return (
        <div className="text-xs flex flex-col text-muted-foreground">
          <span className="text-foreground">{formatDate(startDate)}</span>
          <span className="text-[10px]">to {formatDate(endDate)}</span>
        </div>
      );
    },
  },
  {
    id: "entitlements",
    header: "Entitlements",
    cell: ({ row }) => {
      const entitlements = row.original.entitlements || [];
      const totalServices = entitlements.length;
      const totalRemaining = entitlements.reduce(
        (sum, e) => sum + e.remainingQuantity,
        0,
      );
      const totalAllocated = entitlements.reduce(
        (sum, e) => sum + e.totalQuantity,
        0,
      );

      return (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-foreground">
            {totalRemaining} / {totalAllocated} left
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-45">
            {totalServices} {totalServices === 1 ? "service" : "services"}{" "}
            included
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "permittedBranchIds",
    header: "Permitted Branches",
    cell: ({ row }) => {
      const branchIds = row.original.permittedBranchIds || [];
      if (branchIds.length === 0) {
        return (
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" /> All Branches
          </span>
        );
      }
      return (
        <div className="flex items-center gap-1 flex-wrap max-w-45">
          {branchIds.map((bId) => (
            <span
              key={bId}
              className="text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded"
            >
              {getBranchName(bId)}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <SubscriptionStatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const sub = row.original;
      const isActive = sub.status === "active";

      return (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {canView && (
            <button
              type="button"
              onClick={() => onView(sub)}
              className="cursor-pointer h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground"
              title="View Subscription"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {canRedeem && isActive && (
            <button
              type="button"
              onClick={() => onRedeem(sub)}
              className="cursor-pointer h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 flex items-center justify-center transition-colors text-emerald-600 dark:text-emerald-400"
              title="Redeem Entitlements"
            >
              <Gift className="h-4 w-4" />
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(sub)}
              className="cursor-pointer h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground"
              title="Edit Subscription"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}

          {canCancel && isActive && (
            <button
              type="button"
              onClick={() => onCancel(sub)}
              className="cursor-pointer h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-destructive"
              title="Cancel Subscription"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    },
  },
];
