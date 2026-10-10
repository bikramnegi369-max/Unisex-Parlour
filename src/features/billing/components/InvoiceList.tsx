"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Receipt, Search, Calendar, CreditCard, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { downloadInvoicePdf } from "../api/billing.api";
import { getInvoiceColumns } from "../columns/invoice.columns";
import { InvoiceStatusBadge, PaymentStatusBadge } from "./InvoiceStatusBadge";
import { BillingStatsCards } from "./BillingStatsCards";
import { ReadyToBillQueue } from "./ReadyToBillQueue";
import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { PrintableInvoiceReceipt } from "./PrintableInvoiceReceipt";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import { toast } from "sonner";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import type {
  Invoice,
  InvoiceStatus,
  PaymentStatus,
} from "../types/billing.types";

export function InvoiceList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentBranchId, isAllBranchesSelected, getBranchName } =
    useBranchContext();

  // Read URL search parameters
  const pageParam = searchParams.get("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;

  const limitParam = searchParams.get("limit");
  const pageSize = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 15;

  const searchQueryParam = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const paymentStatusFilter = searchParams.get("paymentStatus") || "all";
  const datePresetFilter = searchParams.get("datePreset") || "all";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  // Local state for immediate typing responsiveness
  const [search, setSearch] = useState(searchQueryParam);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQueryParam);

  // Modal states for POS quick actions
  const [selectedAppointmentForBill, setSelectedAppointmentForBill] =
    useState<Appointment | null>(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] =
    useState<Invoice | null>(null);
  const [receiptInvoiceToPrint, setReceiptInvoiceToPrint] =
    useState<Invoice | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  // Sync state when URL query changes (e.g. Back/Forward browser navigation)
  if (searchQueryParam !== prevSearchQuery) {
    setPrevSearchQuery(searchQueryParam);
    setSearch(searchQueryParam);
  }

  // Calculate start/end dates for date range presets, or use explicit custom range
  const { startDate, endDate } = useMemo(() => {
    if (startDateParam || endDateParam) {
      return {
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
      };
    }
    if (datePresetFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      return { startDate: today, endDate: today };
    }
    if (datePresetFilter === "week") {
      const now = new Date();
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
    }
    if (datePresetFilter === "month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [datePresetFilter, startDateParam, endDateParam]);

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

  const handleCustomDateRangeChange = (start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("datePreset"); // Clear preset when choosing explicit dates
    if (start) {
      params.set("startDate", start);
    } else {
      params.delete("startDate");
    }
    if (end) {
      params.set("endDate", end);
    } else {
      params.delete("endDate");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectPreset = (presetId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Clear explicit custom dates when selecting a quick preset
    params.delete("startDate");
    params.delete("endDate");
    if (presetId && presetId !== "all") {
      params.set("datePreset", presetId);
    } else {
      params.delete("datePreset");
    }
    params.set("page", "1");
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
    startDate,
    endDate,
  });

  const invoices = useMemo(() => response?.data || [], [response?.data]);
  const meta = response?.meta;
  const totalPages =
    meta?.totalPages ?? (meta ? Math.ceil(Number(meta.total) / pageSize) : 1);

  // Fetch appointments for POS Ready to Bill Queue
  // Scoped to today's date and current branch, revalidated on mutation, cross-tab events, or window focus
  const {
    data: appointmentsData,
    isLoading: isAppointmentsLoading,
    isFetching: isAppointmentsFetching,
    refetch: refetchAppointments,
  } = useAppointments(
    {
      branchId:
        isAllBranchesSelected || !currentBranchId ? undefined : currentBranchId,
      date: new Date().toISOString().split("T")[0],
    },
    {
      refetchOnWindowFocus: true,
    },
  );

  // Query today's invoices separately for the POS Ready to Bill Queue
  // This guarantees that table filters (status, paymentStatus, datePresets, search) NEVER leak into or alter the live checkout queue
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: todayInvoicesResponse } = useInvoices({
    startDate: todayStr,
    endDate: todayStr,
    limit: 100,
  });

  // Filter out appointments that already have an invoice today
  const invoicedAppointmentIds = useMemo(() => {
    const list = todayInvoicesResponse?.data || [];
    return new Set(list.map((inv: Invoice) => inv.appointmentId).filter(Boolean));
  }, [todayInvoicesResponse?.data]);

  const readyToBillAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    return appointmentsData.data.filter(
      (apt: Appointment) =>
        (apt.status === "completed" || apt.status === "in_progress") &&
        !invoicedAppointmentIds.has(apt.id),
    );
  }, [appointmentsData, invoicedAppointmentIds]);

  const handleView = useCallback(
    (inv: Invoice) => {
      router.push(`/billing/${inv.id}`);
    },
    [router],
  );

  const handleDownloadPdf = useCallback(async (inv: Invoice) => {
    try {
      toast.info(`Generating official PDF for invoice ${inv.invoiceNumber}...`);
      await downloadInvoicePdf(inv.id, inv.invoiceNumber, "open");
      toast.success("PDF opened successfully.");
    } catch {
      toast.error("Failed to download PDF document.");
    }
  }, []);

  const handlePrintReceipt = useCallback((inv: Invoice) => {
    setReceiptInvoiceToPrint(inv);
    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  const handleQuickPay = useCallback((inv: Invoice) => {
    setSelectedInvoiceForPay(inv);
  }, []);

  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onView: handleView,
        getBranchName,
        isAllBranchesSelected,
        onDownloadPdf: handleDownloadPdf,
        onPrintReceipt: handlePrintReceipt,
        onQuickPay: handleQuickPay,
      }),
    [
      handleView,
      getBranchName,
      isAllBranchesSelected,
      handleDownloadPdf,
      handlePrintReceipt,
      handleQuickPay,
    ],
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <PageHeaderBanner
        title="Billing / POS"
        description="Streamlined salon point-of-sale: fast checkout, payments, receipt generation, and ledger audit."
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SyncButton
              isSyncing={isFetching || isAppointmentsFetching}
              onSync={() => {
                refetch();
                refetchAppointments();
              }}
              label="Sync Register"
              className="w-full sm:w-auto"
            />
          </div>
        }
      />

      {/* Financial KPI Summary Cards (Global Situational Awareness) */}
      <BillingStatsCards
        invoices={invoices}
        summary={meta?.summary}
        totalRecords={meta?.total ? Number(meta.total) : undefined}
        isLoading={isLoading || isFetching}
        isRefreshing={isFetching}
      />

      {/* POS Ready to Bill Queue (Real-Time Counter Action Center) */}
      <ReadyToBillQueue
        appointments={readyToBillAppointments}
        isLoading={isAppointmentsLoading || isAppointmentsFetching}
        isRefreshing={isFetching || isAppointmentsFetching}
        onCheckout={(apt) => setSelectedAppointmentForBill(apt)}
      />

      {/* Filters & Presets Card */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        {/* Date presets and custom range row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Quick Timeframes:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    !startDateParam && !endDateParam && datePresetFilter === preset.id
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/80 text-xs">
            {/* From Date Input */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground font-medium text-[11px]">
                From:
              </span>
              <Input
                type="date"
                value={startDateParam}
                max={endDateParam || undefined}
                onChange={(e) => handleCustomDateRangeChange(e.target.value, endDateParam)}
                className="h-7 text-xs w-35 px-2 bg-background [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
              />
            </div>

            {/* To Date Input */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground font-medium text-[11px]">
                To:
              </span>
              <Input
                type="date"
                value={endDateParam}
                min={startDateParam || undefined}
                onChange={(e) => handleCustomDateRangeChange(startDateParam, e.target.value)}
                className="h-7 text-xs w-35 px-2 bg-background [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
              />
            </div>

            {/* Clear Custom Range Button */}
            {(startDateParam || endDateParam) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCustomDateRangeChange("", "")}
                className="h-7 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                title="Clear date range filter"
              >
                <X className="h-3 w-3 mr-0.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Search & dropdown filters */}
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
            isLoading={isLoading || isFetching}
            emptyState={
              <EmptyState
                icon={Receipt}
                title="No Invoices Found"
                description={
                  searchQueryParam ||
                  statusFilter !== "all" ||
                  paymentStatusFilter !== "all" ||
                  datePresetFilter !== "all"
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

                {/* Mobile action shortcuts */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                  {inv.status === "finalized" && inv.amountDue > 0 && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoiceForPay(inv);
                      }}
                      className="h-7 text-xs font-semibold px-2.5 gap-1"
                    >
                      <CreditCard className="h-3 w-3" />
                      <span>Pay</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintReceipt(inv);
                    }}
                    className="h-7 text-xs px-2 text-muted-foreground"
                  >
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPdf(inv);
                    }}
                    className="h-7 text-xs px-2 text-muted-foreground"
                  >
                    PDF
                  </Button>
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

      {/* POS Quick Bill Creation Dialog */}
      {selectedAppointmentForBill && (
        <CreateInvoiceDialog
          isOpen={Boolean(selectedAppointmentForBill)}
          onClose={() => setSelectedAppointmentForBill(null)}
          appointment={selectedAppointmentForBill}
          onSuccess={(invoiceId) => {
            setSelectedAppointmentForBill(null);
            router.push(`/billing/${invoiceId}`);
          }}
        />
      )}

      {/* POS Quick Payment Dialog */}
      {selectedInvoiceForPay && (
        <RecordPaymentDialog
          isOpen={Boolean(selectedInvoiceForPay)}
          onClose={() => setSelectedInvoiceForPay(null)}
          invoice={selectedInvoiceForPay}
        />
      )}

      {/* Quick Print Receipt Thermal Target */}
      {receiptInvoiceToPrint && (
        <PrintableInvoiceReceipt
          invoice={receiptInvoiceToPrint}
          branchName={getBranchName(receiptInvoiceToPrint.branchId)}
        />
      )}
    </div>
  );
}
