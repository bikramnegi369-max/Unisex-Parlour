"use client";

import React from "react";
import { useFinancialAlerts } from "../hooks";
import { useProcurementOverview } from "@/features/procurement/hooks/useProcurement";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import {
  Truck,
  Users,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function WorkingCapitalObligations() {
  const { data: alerts, isLoading: alertsLoading } = useFinancialAlerts();
  const { data: procurementOverview, isLoading: procurementLoading } = useProcurementOverview();

  const supplierPayables =
    alerts?.outstandingSupplierInvoices?.totalUnpaidAmount ??
    procurementOverview?.outstandingSupplierBalance ??
    0;
  const supplierInvoicesCount =
    alerts?.outstandingSupplierInvoices?.count ??
    procurementOverview?.unpaidInvoicesCount ??
    0;

  const payrollPayables = alerts?.outstandingPayrollObligations?.totalUnpaidAmount || 0;
  const payrollStaffCount = alerts?.outstandingPayrollObligations?.count || 0;

  const totalWorkingCapitalLiabilities = supplierPayables + payrollPayables;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Total Outstanding Working Capital Liabilities
            </span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">
              Due to Suppliers & Staff
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
            {formatCurrency(totalWorkingCapitalLiabilities)}
          </div>
          <p className="text-xs text-muted-foreground">
            Authoritatively aggregated from Procurement invoices and approved Payroll runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalWorkingCapitalLiabilities === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
              All supplier bills and approved salaries settled
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              Pending cash outlays required
            </div>
          )}
        </div>
      </div>

      {/* Two Detail Cards: Supplier Invoices vs Payroll Runs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Payables Card */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Supplier Obligations (Procurement)
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Inventory & Consumable Purchases
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Unpaid Invoices Total:</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {formatCurrency(supplierPayables)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Invoices Awaiting Payment:</span>
              <span className="font-semibold text-foreground">{supplierInvoicesCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              Formula: Σ (totalAmount - amountPaid) across unpaid/partially-paid supplier invoices.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/procurement"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors"
            >
              Open Procurement Invoices Register
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Payroll Payables Card */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Workforce Salary Obligations
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Approved Staff Compensation
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Net Payable Outstanding:</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {formatCurrency(payrollPayables)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Approved Staff Payslips:</span>
              <span className="font-semibold text-foreground">{payrollStaffCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              Formula: Σ netPayable for approved staff records where disbursement is pending.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/payroll"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors"
            >
              Open Staff Payroll Register
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
