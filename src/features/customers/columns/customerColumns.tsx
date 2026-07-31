import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Customer } from "../types/customer.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { CUSTOMERS_CONFIG } from "../config/customers.config";

interface CustomerColumnOptions {
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onReactivate: (customer: Customer) => void;
  getHomeBranchName: (id: string) => string;
  isAllBranches: boolean;
}

export const buildCustomerColumns = ({
  onView,
  onEdit,
  onDelete,
  onReactivate,
  getHomeBranchName,
  isAllBranches,
}: CustomerColumnOptions): ColumnDef<Customer>[] => [
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
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const status = (info.getValue() as string) || info.row.original.status || "active";
      return (
        <Badge variant={status === "active" ? "success" : status === "blocked" ? "destructive" : "muted"}>
          <span className="capitalize">{status}</span>
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
        <span suppressHydrationWarning className="text-muted-foreground text-xs font-medium">
          {isNaN(date.getTime())
            ? dateStr
            : date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
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
        <EntityActionMenu
          onView={() => onView(customer)}
          onEdit={() => onEdit(customer)}
          onDelete={() => onDelete(customer)}
          onReactivate={() => onReactivate(customer)}
          status={customer.status}
          permissions={{
            edit: CUSTOMERS_CONFIG.permissions.edit,
            delete: CUSTOMERS_CONFIG.permissions.delete,
          }}
        />
      );
    },
  },
];
