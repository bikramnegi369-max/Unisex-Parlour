"use client";

import React, { useState } from "react";
import {
  useExpenses,
  useExpenseSummary,
  usePettyCashBalance,
  useDeleteExpense,
} from "../hooks";
import { Expense } from "../types/expense.types";
import { EXPENSES_CONFIG } from "../config/expenses.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Plus,
  Search,
  Wallet,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Truck,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import ExpenseFormDialog from "./ExpenseFormDialog";
import ExpenseDetailsDialog from "./ExpenseDetailsDialog";
import PettyCashDrawerModal from "./PettyCashDrawerModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useDebounce } from "@/hooks/useDebounce";

export default function ExpenseList({
  hideHeader = false,
}: {
  hideHeader?: boolean;
} = {}) {
  const { user } = useAuth();

  const canCreate = hasPermission(user, EXPENSES_CONFIG.permissions.create);
  const canDelete = hasPermission(user, EXPENSES_CONFIG.permissions.delete);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    EXPENSES_CONFIG.defaults.pageSize,
  );
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modular Server-State Queries via Canonical Hooks
  const { data: summary } = useExpenseSummary(startDate, endDate);
  const { data: pettyCashBalance } = usePettyCashBalance();

  const {
    data: expenseData,
    isLoading,
    isError,
    refetch,
  } = useExpenses({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    paymentMethod: paymentMethodFilter || undefined,
    approvalStatus: approvalStatusFilter || undefined,
    sourceType: sourceTypeFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy: EXPENSES_CONFIG.defaults.sortBy,
    sortOrder: EXPENSES_CONFIG.defaults.sortOrder,
  });

  // Modular Mutations via Canonical Hooks
  const deleteMutation = useDeleteExpense();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to void this expense record? The historical record is preserved for audit.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDetailsOpen(true);
  };

  const expenses = expenseData?.items || [];
  const pagination = expenseData?.pagination;

  return (
    <div className="space-y-6">
      {/* Premium Page Header Banner */}
      {!hideHeader && (
        <PageHeaderBanner
          title="Operational Expenses & Cash Drawer"
          description="Record salon branch operational costs, track cash drawer funding, reconcile supplier invoices, and manage approvals."
          icon={Receipt}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cash Drawer Balance Action Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                className="text-xs h-9 font-medium border-border/80 bg-background/60 hover:bg-muted"
              >
                <Wallet className="h-4 w-4 mr-1.5 text-primary" />
                Cash Drawer:{" "}
                <strong className="ml-1 font-mono text-foreground">
                  {pettyCashBalance
                    ? formatCurrency(pettyCashBalance.currentBalance)
                    : "—"}
                </strong>
              </Button>

              {/* Record Expense Button */}
              {canCreate && (
                <Button
                  size="sm"
                  onClick={() => setIsFormOpen(true)}
                  className="text-xs h-9 font-semibold gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Record Expense
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Operational Expenses
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {summary ? formatCurrency(summary.totalSpent) : "₹0.00"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Approved operational outflows for this branch
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Awaiting Manager Review
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {summary?.pendingApprovalCount || 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              requests
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Expenses exceeding creation threshold
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Cash Drawer Available
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {pettyCashBalance
              ? formatCurrency(pettyCashBalance.currentBalance)
              : "₹0.00"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Physical balance in front-desk register
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top Category Outflow
          </span>
          <div className="text-lg font-bold truncate text-foreground">
            {summary && Object.keys(summary.categories || {}).length > 0
              ? Object.entries(summary.categories)
                  .sort((a, b) => Number(b[1]) - Number(a[1]))[0][0]
                  .toUpperCase()
              : "No Outflows"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Highest expenditure bucket
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          {/* Search */}
          <div className="relative min-w-44 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search code, vendor, bill..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Category */}
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-32 h-9 text-xs"
          >
            <option value="">All Categories</option>
            {EXPENSES_CONFIG.categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value.toUpperCase()}
              </option>
            ))}
          </Select>

          {/* Payment Method */}
          <Select
            value={paymentMethodFilter}
            onChange={(e) => {
              setPaymentMethodFilter(e.target.value);
              setPage(1);
            }}
            className="w-32 h-9 text-xs"
          >
            <option value="">All Tenders</option>
            <option value="petty_cash">Cash Drawer</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </Select>

          {/* Approval Status */}
          <Select
            value={approvalStatusFilter}
            onChange={(e) => {
              setApprovalStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs"
          >
            <option value="">All Review Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending_approval">Waiting for Approval</option>
            <option value="rejected">Rejected</option>
          </Select>

          {/* Source Linkage Filter */}
          <Select
            value={sourceTypeFilter}
            onChange={(e) => {
              setSourceTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs"
          >
            <option value="">All Origins</option>
            <option value="manual">Direct Expenses</option>
            <option value="procurement_invoice">Supplier Invoices</option>
            <option value="procurement_payment">Procurement Payments</option>
            <option value="inventory_consumption">Internal Consumption</option>
          </Select>
        </div>

        {(searchInput ||
          categoryFilter ||
          paymentMethodFilter ||
          approvalStatusFilter ||
          sourceTypeFilter ||
          startDate ||
          endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setCategoryFilter("");
              setPaymentMethodFilter("");
              setApprovalStatusFilter("");
              setSourceTypeFilter("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Expense Table */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {isError ? (
          <ErrorState
            title="Failed to Load Expenses"
            description="We could not retrieve expense records for this salon branch. Please verify your connection."
            retryAction={{
              label: "Try Again",
              onClick: () => refetch(),
              isLoading,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="px-5 py-3">Expense Code & Date</th>
                  <th className="px-5 py-3">Payee / Vendor</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Tender</th>
                  <th className="px-5 py-3">Origin / Linkage</th>
                  <th className="px-5 py-3">Review Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                      Loading expense ledger...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <EmptyState
                        icon={Receipt}
                        title="No Expenses Recorded"
                        description="No operational expenses match your active filters or branch selection."
                        action={
                          canCreate
                            ? {
                                label: "Record Expense",
                                onClick: () => setIsFormOpen(true),
                                icon: Plus,
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense: (typeof expenses)[number]) => {
                    const isApproved = expense.approvalStatus === "approved";
                    const isRejected = expense.approvalStatus === "rejected";
                    const isPending =
                      expense.approvalStatus === "pending_approval";

                    return (
                      <tr
                        key={expense.id}
                        onClick={() => handleOpenDetails(expense)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-mono font-semibold text-foreground">
                            {expense.expenseCode}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-medium text-foreground truncate max-w-xs">
                            {expense.payeeName}
                          </div>
                          {expense.invoiceNumber && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Bill: {expense.invoiceNumber}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="capitalize px-2 py-0.5 rounded-md font-medium text-[11px] bg-muted text-muted-foreground">
                            {expense.category}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="uppercase text-[11px] font-mono font-medium text-foreground">
                            {expense.paymentMethod.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {expense.sourceType &&
                          expense.sourceType !== "manual" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                              <Truck className="h-3 w-3" />
                              {expense.supplierId?.name ||
                                expense.sourceType.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Direct Salon
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isRejected
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="h-3 w-3" />}
                            {isRejected && <XCircle className="h-3 w-3" />}
                            {isPending && <Clock className="h-3 w-3" />}
                            {isApproved
                              ? "Approved"
                              : isRejected
                                ? "Rejected"
                                : "Needs Review"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </td>

                        <td
                          className="px-5 py-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetails(expense)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {canDelete && isPending && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(expense.id, e)}
                                className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Shared Pagination */}
        {pagination && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={(p) => setPage(p)}
              pageSize={pageSize}
              pageSizeOptions={[...EXPENSES_CONFIG.defaults.pageSizeOptions]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="expenses"
            />
          </div>
        )}
      </div>

      {/* Expense Form Dialog */}
      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {}}
      />

      {/* Expense Details Dialog */}
      {selectedExpense && (
        <ExpenseDetailsDialog
          expense={selectedExpense}
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) setSelectedExpense(null);
          }}
          onSuccess={() => {}}
        />
      )}

      {/* Cash Drawer & Petty Cash Modal */}
      <PettyCashDrawerModal
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
