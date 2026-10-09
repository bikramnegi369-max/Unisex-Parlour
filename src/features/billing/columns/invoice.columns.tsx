import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { InvoiceStatusBadge, PaymentStatusBadge } from "../components/InvoiceStatusBadge";
import type { Invoice } from "../types/billing.types";

interface InvoiceColumnsOptions {
  onView: (invoice: Invoice) => void;
  getBranchName: (branchId: string) => string;
  isAllBranchesSelected: boolean;
}

export const getInvoiceColumns = ({
  onView,
  getBranchName,
  isAllBranchesSelected,
}: InvoiceColumnsOptions): ColumnDef<Invoice>[] => [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-xs">
            {inv.invoiceNumber}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDate(inv.createdAt, "dd MMM yyyy, hh:mm a")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const cust = row.original.customer;
      return (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">
            {cust?.name || "Customer"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {cust?.phone || "—"}
          </span>
        </div>
      );
    },
  },
  ...(isAllBranchesSelected
    ? [
        {
          accessorKey: "branchId",
          header: "Branch",
          cell: ({ row }: { row: { original: Invoice } }) => {
            return (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" />
                {getBranchName(row.original.branchId)}
              </span>
            );
          },
        },
      ]
    : []),
  {
    accessorKey: "payableAmount",
    header: "Payable Total",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <div className="flex flex-col text-xs">
          <span className="font-bold text-foreground">
            {formatCurrency(inv.payableAmount)}
          </span>
          {inv.subscriptionCoveredAmount > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Plan waived: {formatCurrency(inv.subscriptionCoveredAmount)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "amountDue",
    header: "Due / Paid",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <div className="flex flex-col text-xs">
          <span
            className={`font-semibold ${inv.amountDue > 0 ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            Due: {formatCurrency(inv.amountDue)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Paid: {formatCurrency(inv.amountPaid)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Lifecycle",
    cell: ({ row }) => {
      return <InvoiceStatusBadge status={row.original.status} />;
    },
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => {
      return <PaymentStatusBadge status={row.original.paymentStatus} />;
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(inv)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="View Invoice"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
