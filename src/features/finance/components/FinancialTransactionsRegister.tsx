"use client";

import React, { useState } from "react";
import { useFinancialTransactions } from "../hooks";
import { FinancialTransaction } from "../types/finance.types";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Dialog } from "@/components/ui/dialog";
import { FINANCE_CONFIG } from "../config/finance.config";
import {
  ArrowLeftRight,
  Search,
  Calendar,
  RotateCcw,
  Eye,
  FileText,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function FinancialTransactionsRegister() {
  const { isAllBranchesSelected, currentBranch } = useBranchContext();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const currentDay = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedTx, setSelectedTx] = useState<FinancialTransaction | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useFinancialTransactions({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    method: selectedMethod !== "all" ? selectedMethod : undefined,
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
  });

  const transactions = data?.items || [];
  const pagination = data?.pagination;
  const summary = data?.summary || {
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Search & Multi-Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-65 max-w-md">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search reference #, payee, or description..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-32 text-xs font-mono"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-32 text-xs font-mono"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">
              Source Type:
            </span>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium"
            >
              <option value="all">All Source Streams</option>
              <option value="customer_payment">Customer Inflow (POS)</option>
              <option value="customer_refund">Customer Refund</option>
              <option value="expense">Operating Expense</option>
              <option value="petty_cash">Petty Cash Movement</option>
              <option value="payroll_payment">Staff Payroll Payout</option>
              <option value="supplier_payment">Supplier Settlement</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">
              Payment Tender:
            </span>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI / QR</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            Scope:{" "}
            <strong className="text-foreground">
              {isAllBranchesSelected
                ? "All Salon Branches"
                : currentBranch?.name}
            </strong>
          </div>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Cash Inflow
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(summary.totalInflow)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            POS collections & replenishments
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Cash Outflow
          </span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            -{formatCurrency(summary.totalOutflow)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Expenses, refunds, salaries & bills
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Net Cash Flow
          </span>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              summary.netCashFlow >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {summary.netCashFlow >= 0 ? "+" : ""}
            {formatCurrency(summary.netCashFlow)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Inflows minus Outflows
          </span>
        </div>
      </div>

      {/* Unified Transactions Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Unified Financial Register
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {pagination?.total || 0} Transactions Found
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to Load Financial Register"
            description="Could not query cross-module financial transactions."
            retryAction={{ label: "Retry", onClick: () => refetch() }}
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No Transactions Match Filters"
            description="Adjust your date range or filter criteria to view transaction records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Reference #</th>
                  <th className="py-3 px-3">Source Stream</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx: FinancialTransaction) => {
                  const isInflow = tx.direction === "inflow";

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {new Date(tx.eventDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground">
                        {tx.referenceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted border border-border">
                          {tx.sourceType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {tx.branchName || "Salon Branch"}
                      </td>
                      <td className="py-3 px-3 text-foreground max-w-xs truncate font-medium">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 font-mono uppercase text-[10px] text-muted-foreground">
                        {tx.method}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          isInflow
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isInflow ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total || 0}
              onPageChange={setPage}
              pageSize={pageSize}
              pageSizeOptions={[...FINANCE_CONFIG.defaults.pageSizeOptions]}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemLabel="transactions"
            />
          </div>
        )}
      </div>

      {/* Transaction Detail Slide-Over / Dialog */}
      {selectedTx && (
        <Dialog
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
        >
          <div className="p-6 space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Transaction Details
                </h3>
              </div>
              <span className="text-xs uppercase font-mono font-bold bg-muted px-2 py-0.5 rounded-full">
                {selectedTx.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference Number:</span>
                <span className="font-mono font-bold text-foreground">
                  {selectedTx.referenceNumber}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Source Stream:</span>
                <span className="font-medium capitalize text-foreground">
                  {selectedTx.sourceType.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Event Date:</span>
                <span className="font-mono text-foreground">
                  {new Date(selectedTx.eventDate).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch:</span>
                <span className="text-foreground">{selectedTx.branchName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-mono uppercase text-foreground">
                  {selectedTx.method}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-bold text-sm text-foreground">
                  {selectedTx.direction === "inflow" ? "+" : "-"}
                  {formatCurrency(selectedTx.amount)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Description / Payee
                </span>
                <p className="text-foreground font-medium">
                  {selectedTx.description}
                </p>
              </div>

              {selectedTx.sourceReferenceId && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">
                    Underlying Source ID:
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {selectedTx.sourceReferenceId}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setSelectedTx(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
