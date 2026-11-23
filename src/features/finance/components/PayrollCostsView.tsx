"use client";

import React, { useState } from "react";
import { useOperatingProfit, useFinancialAlerts } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Banknote,
  Clock,
  ExternalLink,
  ShieldAlert,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

export default function PayrollCostsView() {
  // Default to Month-to-Date (MTD)
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEndDate = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { data: profitData, isLoading: profitLoading } = useOperatingProfit(
    startDate,
    endDate
  );
  const { data: alertsData, isLoading: alertsLoading } = useFinancialAlerts();

  const workforce = profitData?.workforceCosts;
  const recognizedGrossPayroll = workforce?.finalizedGrossPayroll || 0;
  const approvedStaffCount = workforce?.approvedStaffCount || 0;
  const actualDisbursedPayroll = workforce?.actualDisbursedPayroll || 0;
  const disbursedCount = workforce?.disbursedPaymentsCount || 0;

  const pendingObligations = alertsData?.outstandingPayrollObligations?.totalUnpaidAmount || 0;
  const pendingStaffCount = alertsData?.outstandingPayrollObligations?.count || 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Payroll Analysis Period
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStartDate(defaultStartDate);
              setEndDate(defaultEndDate);
            }}
            className="text-xs h-8"
          >
            Reset MTD
          </Button>
        </div>
      </div>

      {/* Accounting Discrepancy & Disclosure Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-foreground">
            Authoritative Payroll Cost Accounting Principle
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Salon ERP separates <strong>Recognized Payroll Expense</strong> (recognized by payroll period
            from finalized <code className="font-mono text-primary">PayrollRecord</code> entries, including basic pay, allowances, and approved incentives)
            from <strong>Actual Cash Disbursements</strong> (cash paid out via <code className="font-mono text-primary">PayrollPayment</code> vouchers).
            Incentives are counted strictly once within <code className="font-mono text-primary">calculations.totalGrossPay</code>.
          </p>
        </div>
      </div>

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recognized Expense */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recognized Payroll Expense
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {profitLoading ? "..." : formatCurrency(recognizedGrossPayroll)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Approved Staff Payslips:</span>
            <span className="font-bold text-foreground">{approvedStaffCount}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross labor expense incurred for payroll periods in range.
          </p>
        </div>

        {/* Actual Cash Disbursed */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Actual Cash Disbursed
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {profitLoading ? "..." : formatCurrency(actualDisbursedPayroll)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Confirmed Vouchers:</span>
            <span className="font-bold text-foreground">{disbursedCount}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Actual salary outflow cleared through bank/cash in this period.
          </p>
        </div>

        {/* Outstanding Unpaid Obligations */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Salary Obligations
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {alertsLoading ? "..." : formatCurrency(pendingObligations)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Pending Payslips:</span>
            <span className="font-bold text-foreground">{pendingStaffCount}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Approved net salaries awaiting disbursement to staff.
          </p>
        </div>
      </div>

      {/* Reconciliation Comparison Table */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Payroll Accrual vs Cash Outflow Reconciliation
            </h3>
            <p className="text-xs text-muted-foreground">
              Comparison between recognized labor liabilities and verified cash disbursements.
            </p>
          </div>
          <Link href="/payroll">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <span>Open Payroll Console</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground font-semibold">
                <th className="py-2.5 px-3">Metric Category</th>
                <th className="py-2.5 px-3">Accounting Basis</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Audit Reference Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-3 px-3 font-semibold text-foreground">
                  Gross Payroll Recognized
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[11px]">
                    Accrual Period
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                  {formatCurrency(recognizedGrossPayroll)}
                </td>
                <td className="py-3 px-3 text-muted-foreground">
                  PayrollRecord (approved/paid) across {startDate.substring(0, 7)} to {endDate.substring(0, 7)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-foreground">
                  Cash Disbursements Cleared
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                    Cash Outflow
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                  {formatCurrency(actualDisbursedPayroll)}
                </td>
                <td className="py-3 px-3 text-muted-foreground">
                  PayrollPayment (confirmed) in date window ({disbursedCount} vouchers)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-foreground">
                  Net Salary Liabilities Pending
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                    Payable Due
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                  {formatCurrency(pendingObligations)}
                </td>
                <td className="py-3 px-3 text-muted-foreground">
                  Approved staff records awaiting payment confirmation ({pendingStaffCount} staff)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
