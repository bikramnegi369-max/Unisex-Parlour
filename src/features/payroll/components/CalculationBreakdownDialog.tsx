"use client";

import React from "react";
import { PayrollRecord } from "../api/payroll.api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";

interface CalculationBreakdownDialogProps {
  record: PayrollRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf?: () => void | Promise<void> | null;
}

export function CalculationBreakdownDialog({
  record,
  isOpen,
  onClose,
  onDownloadPdf,
}: CalculationBreakdownDialogProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  if (!record) return null;

  const handleDownloadClick = async () => {
    if (!onDownloadPdf || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      await onDownloadPdf();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const staff = typeof record.staffId === "object" ? record.staffId : null;
  const branch = typeof record.branchId === "object" ? record.branchId : null;
  const att = record.attendanceSummarySnapshot;
  const calc = record.calculations;
  const structure = record.salaryStructureSnapshot;
  const attendanceIncentiveInPaise = Math.max(
    0,
    (record.incentiveAmountInPaise || 0) - (record.incentiveLedgerAmountInPaise || 0),
  );
  const formatPaise = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Calculation Transparency & Audit Breakdown"
      maxWidth="3xl"
    >
      <div className="space-y-6 pt-2">
        {/* Top Header Card */}
        <div className="p-4 rounded-xl bg-muted/40 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center uppercase border">
              {staff?.name.slice(0, 2) || "EM"}
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">{staff?.name}</div>
              <div className="text-xs text-muted-foreground">
                {staff?.designation} • Code: <span className="font-mono">{staff?.staffCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground uppercase font-semibold">Net Pay</div>
              <div className="text-xl font-bold font-mono text-foreground">
                ₹{calc.netPayable.toLocaleString()}
              </div>
            </div>
            {onDownloadPdf && record.status === "paid" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadClick}
                disabled={isDownloadingPdf}
                aria-busy={isDownloadingPdf}
                className="h-8 text-xs ml-2"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 mr-1" /> Download PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Blockers alert if any */}
        {record.approvalBlocked && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Approval Blocked — Action Required</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {record.approvalBlockReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Audit Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border bg-background">
            <span className="text-muted-foreground block text-[11px]">Payroll Period</span>
            <span className="font-semibold text-foreground">{record.monthYear}</span>
          </div>

          <div className="p-3 rounded-lg border bg-background">
            <span className="text-muted-foreground block text-[11px]">Cost-Center Branch</span>
            <span className="font-semibold text-foreground">{branch?.name || "Assigned Branch"}</span>
          </div>

          <div className="p-3 rounded-lg border bg-background">
            <span className="text-muted-foreground block text-[11px]">Total Days in Month</span>
            <span className="font-semibold font-mono text-foreground">{att.totalDaysInMonth} days</span>
          </div>

          <div className="p-3 rounded-lg border bg-background">
            <span className="text-muted-foreground block text-[11px]">Eligible Employment</span>
            <span className="font-semibold font-mono text-foreground">{att.eligibleDays} days</span>
          </div>
        </div>

        {/* Step-by-Step Attendance-Driven Mathematical Transparency */}
        <div className="border rounded-xl p-4 bg-background space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1. Attendance-Driven Salary Calculation
          </h4>
          <div className="p-3 rounded-lg bg-muted/40 font-mono text-xs text-foreground space-y-2 border">
            <div>
              Daily Rate = Monthly Base Salary (₹{structure.baseSalary.toLocaleString()}) ÷ Total Month Days ({att.totalDaysInMonth}) ={" "}
              <strong>₹{(calc.dailySalaryRate || structure.baseSalary / att.totalDaysInMonth).toFixed(2)} / day</strong>
            </div>
            <div>
              Payable Days = Verified Present Days ({att.presentDays}) + Eligible Paid Leave ({att.paidLeaveDays}) ={" "}
              <strong className="text-blue-600 font-bold">{att.payableDays ?? (att.presentDays + att.paidLeaveDays)} days</strong>
            </div>
            <div>
              Prorated Base Salary = Daily Rate × Payable Days ={" "}
              <strong className="text-emerald-600">₹{(calc.proratedBaseSalary || calc.grossBaseSalary).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Paid Leave Entitlement Transparency */}
        <div className="border rounded-xl p-4 bg-background space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            2. Paid Leave Entitlement Consumption
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="block text-[11px] text-muted-foreground">Annual Entitlement</span>
              <span className="font-bold text-sm text-foreground">
                {att.paidLeaveEntitlement ?? (structure.paidLeavePolicy?.annualEntitlement ?? 0)} days
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="block text-[11px] text-muted-foreground">Previously Consumed</span>
              <span className="font-bold text-sm text-foreground">
                {att.previouslyConsumedPaidLeave ?? 0} days
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50">
              <span className="block text-[11px] text-emerald-800 dark:text-emerald-300">Paid Leave This Period</span>
              <span className="font-bold text-sm text-emerald-600">
                {att.paidLeaveDays} days
              </span>
            </div>
            <div className="p-2.5 rounded-lg border bg-red-50 dark:bg-red-950/40 border-red-200/50">
              <span className="block text-[11px] text-red-800 dark:text-red-300">Unpaid Leave (LOP)</span>
              <span className="font-bold text-sm text-red-600">
                {att.unpaidLeaveDays} days
              </span>
            </div>
          </div>
        </div>

        {/* Attendance & Leave Ingestion Summary */}
        <div className="border rounded-xl p-4 bg-background space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            3. Attendance Muster Roll & Leave Records
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
              <span className="block text-[11px]">Present Punches</span>
              <span className="font-bold text-base">{att.presentDays}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50">
              <span className="block text-[11px]">Late Arrivals</span>
              <span className="font-bold text-base">{att.lateDays}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50">
              <span className="block text-[11px]">Approved Paid Leave</span>
              <span className="font-bold text-base">{att.paidLeaveDays}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50">
              <span className="block text-[11px]">Unpaid Leave (LOP)</span>
              <span className="font-bold text-base">{att.unpaidLeaveDays}</span>
            </div>
          </div>
        </div>

        {/* Adjustments Section (if any) */}
        {record.adjustments && record.adjustments.length > 0 && (
          <div className="border rounded-xl p-4 bg-background space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              4. Authorized Manual Adjustments
            </h4>
            <div className="space-y-1.5 text-xs">
              {record.adjustments.map((adj, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-muted/40 border flex justify-between items-center">
                  <div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mr-2 ${
                        adj.type === "earning"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {adj.type}
                    </span>
                    <span className="font-medium text-foreground">{adj.reason}</span>
                    {adj.reference && (
                      <span className="text-muted-foreground text-[11px] ml-1.5">
                        (Ref: {adj.reference})
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      adj.type === "earning" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {adj.type === "earning" ? "+" : "-"}₹{adj.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comprehensive Earnings vs Deductions Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <div className="border rounded-xl p-4 bg-background space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex justify-between">
              <span>Gross Earnings</span>
              <span className="font-mono">₹{calc.totalGrossPay.toLocaleString()}</span>
            </h4>
            <div className="text-xs space-y-1.5 pt-1">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Prorated Base Salary</span>
                <span className="font-mono font-medium">₹{calc.grossBaseSalary.toLocaleString()}</span>
              </div>
              {(structure.allowances || []).map((a, i) => (
                <div key={i} className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="font-mono font-medium text-emerald-600">+₹{a.amount.toLocaleString()}</span>
                </div>
              ))}
              {attendanceIncentiveInPaise > 0 && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">
                    Verified attendance incentive
                    {record.incentiveEvaluationIds?.length
                      ? ` (${record.incentiveEvaluationIds.length} evaluation${record.incentiveEvaluationIds.length === 1 ? "" : "s"})`
                      : ""}
                  </span>
                  <span className="font-mono font-medium text-emerald-600">
                    +{formatPaise(attendanceIncentiveInPaise)}
                  </span>
                </div>
              )}
              {(record.incentiveLedgerGrossInPaise || 0) > 0 && (
                <div className="space-y-2 border-b py-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Commission ledger net payable ({record.incentiveLedgerEntryIds?.length || 0} source entries)
                    </span>
                    <span className="font-mono font-medium text-emerald-600">
                      +{formatPaise(record.incentiveLedgerAmountInPaise || 0)}
                    </span>
                  </div>
                  {(record.incentiveLedgerClawbackInPaise || 0) > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>
                        Source clawbacks reflected before payment ({record.incentiveLedgerClawbackEntryIds?.length || 0})
                      </span>
                      <span className="font-mono">
                        −{formatPaise(record.incentiveLedgerClawbackInPaise || 0)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {(record.incentiveLedgerEntries || []).map((entry) => (
                      <div
                        key={entry.ledgerEntryId}
                        className="flex flex-wrap justify-between gap-x-3 text-[11px] text-muted-foreground"
                      >
                        <span>
                          {entry.sourceType.replace(/_/g, " ")} · source {entry.ledgerEntryId.slice(-8)}
                        </span>
                        <span className="font-mono">
                          {formatPaise(entry.sourceAmountInPaise)}
                          {entry.clawbackAmountInPaise > 0
                            ? ` − ${formatPaise(entry.clawbackAmountInPaise)} = ${formatPaise(entry.payableAmountInPaise)}`
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deductions */}
          <div className="border rounded-xl p-4 bg-background space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex justify-between">
              <span>Total Deductions</span>
              <span className="font-mono">-₹{calc.totalDeductions.toLocaleString()}</span>
            </h4>
            <div className="text-xs space-y-1.5 pt-1">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Unpaid Leave (LOP)</span>
                <span className="font-mono font-medium text-red-500">
                  -₹{calc.unpaidLeaveDeduction.toLocaleString()}
                </span>
              </div>
              {(structure.deductions || []).map((d, i) => (
                <div key={i} className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono font-medium text-red-500">-₹{d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final Net Payable Card */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">Net Amount Disbursable</div>
            <div className="text-xs text-muted-foreground">
              Total Gross (₹{calc.totalGrossPay.toLocaleString()}) − Total Deductions (₹{calc.totalDeductions.toLocaleString()})
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-primary">
            ₹{calc.netPayable.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Breakdown
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
