import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Building, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { InvoiceStatusBadge, PaymentStatusBadge } from "../components/InvoiceStatusBadge";
import type { Invoice } from "../types/billing.types";

interface InvoiceColumnsOptions {
  onView: (invoice: Invoice) => void;
  getBranchName: (branchId: string) => string;
  isAllBranchesSelected: boolean;
  onDownloadPdf?: (invoice: Invoice) => void;
  onPrintReceipt?: (invoice: Invoice) => void;
  onQuickPay?: (invoice: Invoice) => void;
}

export const getInvoiceColumns = ({
  onView,
  getBranchName,
  isAllBranchesSelected,
  onDownloadPdf,
  onPrintReceipt,
  onQuickPay,
}: InvoiceColumnsOptions): ColumnDef<Invoice>[] => [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-xs hover:text-primary cursor-pointer" onClick={() => onView(inv)}>
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
      const canPay = inv.status === "finalized" && inv.amountDue > 0;
      return (
        <div className="flex items-center justify-end gap-1">
          {canPay && onQuickPay && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickPay(inv)}
              className="h-7 px-2 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1"
              title="Record Payment"
            >
              Pay
            </Button>
          )}
          {onPrintReceipt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrintReceipt(inv)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Quick Print Receipt"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDownloadPdf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownloadPdf(inv)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Official PDF"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(inv)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="View Invoice Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    },
  },
];
