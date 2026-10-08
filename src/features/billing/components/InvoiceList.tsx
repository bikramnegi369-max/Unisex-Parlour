"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Receipt,
  Search,
  Eye,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useInvoices } from "../hooks/useBillingQueries";
import { InvoiceStatusBadge, PaymentStatusBadge } from "./InvoiceStatusBadge";
import type { Invoice, InvoiceStatus, PaymentStatus } from "../types/billing.types";

export function InvoiceList() {
  const router = useRouter();
  const { isAllBranchesSelected, getBranchName } = useBranchContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data: response, isLoading, isError, refetch } = useInvoices({
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
    paymentStatus:
      paymentStatusFilter !== "all" ? (paymentStatusFilter as PaymentStatus) : undefined,
  });

  const invoices = response?.data || [];
  const meta = response?.meta;
  const totalPages = meta ? Math.ceil(Number(meta.total) / limit) : 1;

  const columns: ColumnDef<Invoice>[] = [
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
            <span className={`font-semibold ${inv.amountDue > 0 ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}`}>
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
              onClick={() => router.push(`/billing/${inv.id}`)}
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Billing & POS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage checkout invoices, record customer payments, and review transaction histories.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice #, customer name, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9"
            >
              <option value="all">All Lifecycle Statuses</option>
              <option value="draft">Draft</option>
              <option value="finalized">Finalized</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <Select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isError ? (
        <ErrorState
          title="Failed to Load Invoices"
          description="Could not load the invoice records. Please check your network connection and try again."
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
          }}
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={invoices}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={Receipt}
                title="No Invoices Found"
                description={
                  search || statusFilter !== "all" || paymentStatusFilter !== "all"
                    ? "No invoices match the applied filters."
                    : "No invoices have been generated for this branch yet. Invoices are generated from billable appointments."
                }
              />
            }
            renderMobileRow={(inv) => (
              <div
                key={inv.id}
                onClick={() => router.push(`/billing/${inv.id}`)}
                className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs cursor-pointer active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {inv.invoiceNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <InvoiceStatusBadge status={inv.status} />
                    <PaymentStatusBadge status={inv.paymentStatus} />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer:</span>
                    <span className="font-medium text-foreground">
                      {inv.customer?.name || "Customer"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payable Amount:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(inv.payableAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount Due:</span>
                    <span className={`font-semibold ${inv.amountDue > 0 ? "text-primary" : "text-emerald-600"}`}>
                      {formatCurrency(inv.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          />

          {meta && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={Number(meta.total) || 0}
              itemLabel="invoices"
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
