"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Receipt, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/formatters";
import { useInvoices } from "../hooks/useBillingQueries";
import { getInvoiceColumns } from "../columns/invoice.columns";
import { InvoiceStatusBadge, PaymentStatusBadge } from "./InvoiceStatusBadge";
import type {
  Invoice,
  InvoiceStatus,
  PaymentStatus,
} from "../types/billing.types";

export function InvoiceList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isAllBranchesSelected, getBranchName } = useBranchContext();

  // Read URL search parameters
  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const limitParam = searchParams.get("limit");
  const pageSize = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 15;

  const searchQueryParam = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const paymentStatusFilter = searchParams.get("paymentStatus") || "all";

  // Local state for immediate typing responsiveness
  const [search, setSearch] = useState(searchQueryParam);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQueryParam);

  const debouncedSearch = useDebounce(search, 350);

  // Sync state when URL query changes (e.g. Back/Forward browser navigation)
  if (searchQueryParam !== prevSearchQuery) {
    setPrevSearchQuery(searchQueryParam);
    setSearch(searchQueryParam);
  }

  // Sync debounced search to URL
  useEffect(() => {
    const currentQuery = searchParams.get("search") || "";
    if (debouncedSearch !== currentQuery) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1"); // Reset to page 1 on new search
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, router, pathname, searchParams]);

  const updateParam = (key: string, value: string | null, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (resetPage) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(newSize));
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInvoices({
    page,
    limit: pageSize,
    search: searchQueryParam.trim() || undefined,
    status:
      statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
    paymentStatus:
      paymentStatusFilter !== "all"
        ? (paymentStatusFilter as PaymentStatus)
        : undefined,
  });

  const invoices = response?.data || [];
  const meta = response?.meta;
  const totalPages =
    meta?.totalPages ?? (meta ? Math.ceil(Number(meta.total) / pageSize) : 1);

  const handleView = useCallback(
    (inv: Invoice) => {
      router.push(`/billing/${inv.id}`);
    },
    [router],
  );

  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onView: handleView,
        getBranchName,
        isAllBranchesSelected,
      }),
    [handleView, getBranchName, isAllBranchesSelected],
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeaderBanner
        title="Billing & Invoices"
        description="Manage checkout invoices, record customer payments, and review transaction histories."
        icon={Receipt}
        actions={
          <SyncButton
            isSyncing={isFetching}
            onSync={() => refetch()}
            label="Refresh Invoices"
            className="w-full sm:w-auto"
          />
        }
      />

      {/* Filters Card */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice #, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => updateParam("status", e.target.value)}
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
              onChange={(e) => updateParam("paymentStatus", e.target.value)}
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
                  searchQueryParam ||
                  statusFilter !== "all" ||
                  paymentStatusFilter !== "all"
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
                    <span
                      className={`font-semibold ${inv.amountDue > 0 ? "text-primary" : "text-emerald-600"}`}
                    >
                      {formatCurrency(inv.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          />

          {meta && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={Number(meta.total) || 0}
              itemLabel="invoices"
              onPageChange={handlePageChange}
              pageSize={pageSize}
              pageSizeOptions={[10, 15, 25, 50, 100]}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
