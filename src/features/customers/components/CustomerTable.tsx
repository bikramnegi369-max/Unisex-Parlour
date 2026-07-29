"use client";

import React, { useMemo, useCallback } from "react";
import type { Customer } from "../types/customer.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/DataTable";

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  isLoading: boolean;
  isAllBranches: boolean;
}

export default function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
  isLoading,
  isAllBranches,
}: CustomerTableProps) {
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");

  const getHomeBranchName = useCallback((id: string) => {
    return availableBranches.find((b) => b.id === id)?.name || id;
  }, [availableBranches]);

  const columnHelper = createColumnHelper<Customer>();

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("name", {
        header: "Customer",
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{customer.name}</p>
                {customer.gender && (
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {customer.gender}
                  </p>
                )}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const val = info.getValue();
          return (
            <a href={`tel:${val}`} className="font-medium text-foreground hover:underline">
              {val}
            </a>
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <a href={`mailto:${val}`} className="text-muted-foreground hover:underline">
              {val}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      }),
      isAllBranches
        ? columnHelper.accessor("homeBranchId", {
            header: "Home Branch",
            cell: (info) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10">
                {getHomeBranchName(info.getValue())}
              </span>
            ),
          })
        : null,
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => {
          const active = info.getValue();
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                active
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
      }),
      columnHelper.accessor("loyaltyPoints", {
        header: "Loyalty",
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {info.getValue() ?? 0} pts
          </span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Registered",
        cell: (info) => {
          const dateStr = info.getValue();
          if (!dateStr) return "—";
          const date = new Date(dateStr);
          return (
            <span className="text-muted-foreground text-xs font-medium">
              {isNaN(date.getTime()) ? dateStr : date.toLocaleDateString()}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onView(customer)}
                className="cursor-pointer h-9 w-9"
                title="View Details"
                aria-label={`View details of ${customer.name}`}
              >
                <Eye size={15} className="text-muted-foreground hover:text-foreground" />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(customer)}
                  className="cursor-pointer h-9 w-9"
                  title="Edit Profile"
                  aria-label={`Edit profile of ${customer.name}`}
                >
                  <Edit size={15} className="text-muted-foreground hover:text-foreground" />
                </Button>
              )}
              {canDelete && customer.isActive && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(customer)}
                  className="cursor-pointer hover:bg-destructive/10 h-9 w-9"
                  title="Deactivate Customer"
                  aria-label={`Deactivate profile of ${customer.name}`}
                >
                  <Trash2 size={15} className="text-destructive" />
                </Button>
              )}
            </div>
          );
        },
      }),
    ].filter((col): col is Exclude<typeof col, null> => col !== null);
  }, [
    isAllBranches,
    canEdit,
    canDelete,
    onView,
    onEdit,
    onDelete,
    columnHelper,
    getHomeBranchName,
  ]);

  const renderMobileRow = (customer: Customer) => (
    <div
      key={customer.id}
      className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">{customer.name}</h4>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${
                  customer.isActive
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {customer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {customer.gender && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                {customer.gender}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Actions with touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 flex items-center justify-center cursor-pointer"
            onClick={() => onView(customer)}
            aria-label={`View details of ${customer.name}`}
          >
            <Eye size={15} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={() => onEdit(customer)}
              aria-label={`Edit profile of ${customer.name}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && customer.isActive && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={() => onDelete(customer)}
              aria-label={`Deactivate profile of ${customer.name}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Phone:</span>
          <a href={`tel:${customer.phone}`} className="font-semibold text-foreground hover:underline">
            {customer.phone}
          </a>
        </div>
        {customer.email && (
          <div className="flex justify-between">
            <span>Email:</span>
            <a href={`mailto:${customer.email}`} className="font-medium text-foreground hover:underline">
              {customer.email}
            </a>
          </div>
        )}
        {customer.loyaltyPoints !== undefined && (
          <div className="flex justify-between">
            <span>Loyalty Points:</span>
            <span className="font-semibold text-foreground">{customer.loyaltyPoints} pts</span>
          </div>
        )}
        {isAllBranches && (
          <div className="flex justify-between items-center">
            <span>Home Branch:</span>
            <span className="text-[10px] font-semibold text-primary">
              {getHomeBranchName(customer.homeBranchId)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DataTable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columns={columns as ColumnDef<Customer, any>[]}
      data={customers}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
    />
  );
}

