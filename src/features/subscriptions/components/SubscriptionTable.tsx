import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/DataTable";
import type { Subscription } from "../types/subscription.types";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Eye, Edit, Ban, Gift, Building2, User } from "lucide-react";

interface SubscriptionTableProps {
  columns: ColumnDef<Subscription>[];
  data: Subscription[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
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

export function SubscriptionTable({
  columns,
  data,
  isLoading,
  emptyState,
  onView,
  onEdit,
  onCancel,
  onRedeem,
  canView,
  canEdit,
  canCancel,
  canRedeem,
  getBranchName,
}: SubscriptionTableProps) {
  const renderMobileRow = (sub: Subscription) => {
    const isActive = sub.status === "active";
    const entitlements = sub.entitlements || [];
    const totalRemaining = entitlements.reduce((sum, e) => sum + e.remainingQuantity, 0);
    const totalAllocated = entitlements.reduce((sum, e) => sum + e.totalQuantity, 0);

    return (
      <div
        key={sub.id}
        onClick={() => onView(sub)}
        className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-2xs cursor-pointer hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-foreground">
              {sub.subscriptionCode || sub.id}
            </span>
            <SubscriptionStatusBadge status={sub.status} />
          </div>
          <span className="font-bold text-xs text-foreground">
            {formatCurrency(sub.price)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {sub.customer?.name || (typeof sub.customerId === "string" ? `Customer ID: ${sub.customerId}` : "Customer Details")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/60">
          <div>
            <span className="text-muted-foreground block">Validity:</span>
            <span className="font-medium text-foreground">
              {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Remaining:</span>
            <span className="font-semibold text-primary">
              {totalRemaining} / {totalAllocated} units
            </span>
          </div>
        </div>

        {sub.permittedBranchIds && sub.permittedBranchIds.length > 0 ? (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
            <Building2 className="h-3 w-3" />
            {sub.permittedBranchIds.map((bId) => (
              <span key={bId} className="bg-muted px-1.5 py-0.5 rounded">
                {getBranchName(bId)}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> All Branches
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
          {canView && (
            <button
              type="button"
              onClick={() => onView(sub)}
              className="p-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
          )}
          {canRedeem && isActive && (
            <button
              type="button"
              onClick={() => onRedeem(sub)}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Gift className="h-3.5 w-3.5" /> Redeem
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(sub)}
              className="p-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {canCancel && isActive && (
            <button
              type="button"
              onClick={() => onCancel(sub)}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyState={emptyState}
      renderMobileRow={renderMobileRow}
    />
  );
}
