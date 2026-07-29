"use client";

import React, { useMemo, useCallback } from "react";
import type { Customer } from "../types/customer.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2 } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { CustomerMobileCard } from "./CustomerMobileCard";

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

  const columns: ColumnDef<Customer>[] = useMemo(() => {
    return [
      {
        accessorKey: "name",
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
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: (info) => {
          const val = info.getValue();
          const phoneStr = typeof val === "string" ? val : info.row.original.phone;
          return (
            <a href={`tel:${phoneStr}`} className="font-medium text-foreground hover:underline">
              {phoneStr}
            </a>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => {
          const val = info.getValue();
          const emailStr = typeof val === "string" ? val : info.row.original.email;
          return emailStr ? (
            <a href={`mailto:${emailStr}`} className="text-muted-foreground hover:underline">
              {emailStr}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      ...(isAllBranches
        ? [
            {
              accessorKey: "homeBranchId",
              header: "Home Branch",
              cell: (info: { getValue: () => unknown; row: { original: Customer } }) => {
                const val = info.getValue();
                const branchId = typeof val === "string" ? val : info.row.original.homeBranchId;
                return (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
                    {getHomeBranchName(branchId)}
                  </Badge>
                );
              },
            },
          ]
        : []),
      {
        accessorKey: "isActive",
        header: "Status",
        cell: (info) => {
          const val = info.getValue();
          const active = typeof val === "boolean" ? val : info.row.original.isActive;
          return (
            <Badge variant={active ? "success" : "muted"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "loyaltyPoints",
        header: "Loyalty",
        cell: (info) => {
          const val = info.getValue();
          const points = typeof val === "number" ? val : (info.row.original.loyaltyPoints ?? 0);
          return (
            <span className="font-semibold text-foreground">
              {points} pts
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Registered",
        cell: (info) => {
          const val = info.getValue();
          const dateStr = typeof val === "string" ? val : info.row.original.createdAt;
          if (!dateStr) return "—";
          const date = new Date(dateStr);
          return (
            <span className="text-muted-foreground text-xs font-medium">
              {isNaN(date.getTime()) ? dateStr : date.toLocaleDateString()}
            </span>
          );
        },
      },
      {
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
      },
    ];
  }, [
    isAllBranches,
    canEdit,
    canDelete,
    onView,
    onEdit,
    onDelete,
    getHomeBranchName,
  ]);

  const renderMobileRow = (customer: Customer) => (
    <CustomerMobileCard
      key={customer.id}
      customer={customer}
      canEdit={canEdit}
      canDelete={canDelete}
      isAllBranches={isAllBranches}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      getHomeBranchName={getHomeBranchName}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={customers}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
    />
  );
}

