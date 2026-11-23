import React from "react";
import { RevenueReportResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";
import { CreditCard, Banknote, Smartphone, Wallet, ArrowDownLeft } from "lucide-react";

interface RevenueReportViewProps {
  data?: RevenueReportResponse;
  isLoading: boolean;
}

export const RevenueReportView: React.FC<RevenueReportViewProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, tenderBreakdown = [], streams, recentTransactions = [] } = data;

  const getTenderIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "upi":
        return <Smartphone className="h-4 w-4 text-emerald-500" />;
      case "card":
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case "cash":
        return <Banknote className="h-4 w-4 text-amber-500" />;
      default:
        return <Wallet className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Billed vs Collections Hero Metrics */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Billed Revenue vs. Actual Cash Collections
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Gross Billed"
            metric={summary.grossBilled}
            isCurrency
            subtitle="Catalog list value"
          />
          <MetricCard
            title="Total Discounts"
            metric={summary.totalDiscounts}
            isCurrency
            subtitle="Discounts & concessions"
          />
          <MetricCard
            title="Prepaid Redemptions"
            metric={summary.subscriptionCoveredValue}
            isCurrency
            subtitle="Subscription credit used"
          />
          <MetricCard
            title="Net Payable Billed"
            metric={summary.netBilled}
            isCurrency
            subtitle="Customer payable amount"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Gross Collections"
          metric={summary.grossCollected}
          isCurrency
          subtitle="All receipts received"
        />
        <MetricCard
          title="Refunds Deducted"
          metric={summary.refundsIssued}
          isCurrency
          subtitle="Returned to clients"
        />
        <MetricCard
          title="Net Cash Inflow"
          metric={summary.netCollected}
          isCurrency
          subtitle="Gross collections - refunds"
        />
        <MetricCard
          title="Outstanding Receivables"
          metric={summary.outstandingReceivables}
          isCurrency
          subtitle="Cohort unpaid balance"
        />
      </div>

      {/* 2. Tender & Streams Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tender Collection Methods */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gross Collections by Tender
          </h4>
          <div className="mt-4 space-y-3">
            {tenderBreakdown.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No tender collections in this period.
              </div>
            ) : (
              tenderBreakdown.map((t) => (
                <div key={t.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium capitalize text-foreground">
                      {getTenderIcon(t.method)}
                      <span>{t.method}</span>
                      <span className="text-muted-foreground">({t.transactionCount || 0} txns)</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      ₹{(t.amount || 0).toLocaleString("en-IN")}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        ({t.percentageOfTotal || 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, t.percentageOfTotal || 0))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Streams Breakdown */}
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Billed Sales Streams (Line-Item Customer Payable)
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Reflects net billed amounts attributed to each stream on finalized cohort invoices.
          </p>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Services Billed</span>
              <span className="font-semibold text-foreground">
                ₹{(streams?.servicesBilled || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Retail Products Billed</span>
              <span className="font-semibold text-foreground">
                ₹{(streams?.retailBilled || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Memberships Billed</span>
              <span className="font-semibold text-foreground">
                ₹{(streams?.membershipsBilled || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subscriptions Billed</span>
              <span className="font-semibold text-foreground">
                ₹{(streams?.subscriptionsBilled || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Transactions Ledger */}
      {recentTransactions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/40 px-5 py-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Finalized Invoices Ledger in Period
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Due</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentTransactions.map((tx) => (
                  <tr key={tx.invoiceId} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{tx.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ₹{tx.billedAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                      ₹{tx.paidAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      ₹{tx.dueAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                        {tx.paymentStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
