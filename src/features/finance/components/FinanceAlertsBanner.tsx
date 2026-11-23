"use client";

import React from "react";
import { useFinancialAlerts } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import {
  AlertTriangle,
  Receipt,
  Truck,
  Users,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function FinanceAlertsBanner() {
  const { data: alerts, isLoading, isError } = useFinancialAlerts();

  if (isLoading || isError || !alerts) return null;

  const {
    pendingExpenseApprovals,
    unreconciledClosures,
    outstandingSupplierInvoices,
    outstandingPayrollObligations,
  } = alerts;

  const totalAlertsCount =
    (pendingExpenseApprovals?.count || 0) +
    (unreconciledClosures?.count || 0) +
    (outstandingSupplierInvoices?.count || 0) +
    (outstandingPayrollObligations?.count || 0);

  if (totalAlertsCount === 0) return null;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Financial Attention & Working Capital Alerts ({totalAlertsCount})
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">
          Requires Action or Oversight
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pending Expense Approvals */}
        {pendingExpenseApprovals?.count > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Pending Expense Approvals
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(pendingExpenseApprovals.totalAmount)}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {pendingExpenseApprovals.count} vouchers awaiting manager sign-off
              </p>
            </div>
            <Link
              href="/expenses"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
            >
              Review Expense Queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Unreconciled Register Closures */}
        {unreconciledClosures?.count > 0 && (
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Discrepant Register Drawers
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(unreconciledClosures.totalDiscrepancy)}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {unreconciledClosures.count} closures submitted with drawer variances
              </p>
            </div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1">
              Review in Closure History
            </span>
          </div>
        )}

        {/* Outstanding Supplier Invoices */}
        {outstandingSupplierInvoices?.count > 0 && (
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Outstanding Supplier Invoices
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(outstandingSupplierInvoices.totalUnpaidAmount)}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {outstandingSupplierInvoices.count} procurement bills awaiting payment
              </p>
            </div>
            <Link
              href="/procurement"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
            >
              Procurement Invoices <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Outstanding Approved Payroll Obligations */}
        {outstandingPayrollObligations?.count > 0 && (
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Unpaid Approved Payroll
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(outstandingPayrollObligations.totalUnpaidAmount)}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {outstandingPayrollObligations.count} approved staff payslips awaiting disbursement
              </p>
            </div>
            <Link
              href="/payroll"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
            >
              Payroll Register <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
