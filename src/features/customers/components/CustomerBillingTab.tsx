"use client";

import React, { useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Receipt,
  Search,
  Eye,
  Building,
  CreditCard,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranchContext } from "@/hooks/useBranchContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useInvoices } from "@/features/billing/hooks/useBillingQueries";
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
} from "@/features/billing/components/InvoiceStatusBadge";
import type {
  Invoice,
  InvoiceStatus,
  PaymentStatus,
} from "@/features/billing/types/billing.types";
import { useCustomer } from "../hooks/useCustomer";

interface CustomerBillingTabProps {
  customerId: string;
}

export function CustomerBillingTab({ customerId }: CustomerBillingTabProps) {
  const { isAllBranchesSelected, getBranchName } = useBranchContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: customer } = useCustomer(customerId);

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInvoices({
    customerId,
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
    paymentStatus:
      paymentStatusFilter !== "all"
        ? (paymentStatusFilter as PaymentStatus)
        : undefined,
  });

  const invoices = response?.data || [];
  const meta = response?.meta;
  const totalPages =
    meta?.totalPages ??
    (meta ? Math.ceil(Number(meta.total) / limit) : 1);

  // Authoritative database aggregate from backend
  const backendSummary = meta?.summary;

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
      accessorKey: "payableAmount",
      header: "Payable Total",
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground">
          {formatCurrency(row.original.payableAmount)}
        </span>
      ),
    },
    {
      accessorKey: "amountPaid",
      header: "Paid / Due",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex flex-col text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Paid: {formatCurrency(inv.amountPaid)}
            </span>
            {inv.amountDue > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                Due: {formatCurrency(inv.amountDue)}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">Settled</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Invoice Status",
      cell: ({ row }) => (
        <InvoiceStatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => (
        <PaymentStatusBadge status={row.original.paymentStatus} />
      ),
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
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/billing/${inv.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                View Bill
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="border border-border/80 shadow-sm bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/60 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-20 bg-muted/60 animate-pulse rounded" />
                    <div className="h-5 w-28 bg-muted/60 animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : backendSummary ? (
          <>
            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Lifetime Invoices
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {backendSummary.totalInvoices}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Total Billed
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(backendSummary.totalBilled)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Lifetime Paid
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(backendSummary.totalPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Outstanding Balance
                  </p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(backendSummary.totalOutstanding)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Lifetime Invoices
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {meta?.total ?? invoices.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Loyalty Points
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {customer?.loyaltyPoints ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-sm bg-card sm:col-span-2 lg:col-span-2">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground">
                    Account Status
                  </p>
                  <p className="text-lg font-bold capitalize text-emerald-600 dark:text-emerald-400">
                    {customer?.status || "Active"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter and Actions Bar */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt size={16} className="text-primary" />
            Billing & Invoices History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs w-full sm:w-36"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="finalized">Finalized</option>
                <option value="cancelled">Cancelled</option>
              </Select>

              <Select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs w-full sm:w-36"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </div>
          </div>

          {/* Table Data States */}
          {isLoading ? (
            <div className="space-y-2 py-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-muted/60 animate-pulse rounded-md" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Unable to load invoices"
              description="Could not retrieve billing records for this customer. Please try again."
              retryAction={{
                label: "Retry",
                onClick: () => refetch(),
              }}
            />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Invoices Found"
              description={
                search || statusFilter !== "all" || paymentStatusFilter !== "all"
                  ? "No invoices matched the active filters."
                  : "This customer has no recorded invoices or billing transactions."
              }
            />
          ) : (
            <>
              <div className="rounded-md border border-border/80 overflow-hidden">
                <DataTable columns={columns} data={invoices} />
              </div>
              <div className="pt-2">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={meta?.total ?? invoices.length}
                  itemLabel="invoices"
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
