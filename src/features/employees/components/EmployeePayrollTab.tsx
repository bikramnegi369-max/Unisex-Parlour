"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  payrollApi,
  SalaryStructure,
  PayrollRecord,
  AllowanceDeductionItem,
} from "@/features/payroll/api/payroll.api";
import { CalculationBreakdownDialog } from "@/features/payroll/components/CalculationBreakdownDialog";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Calendar,
  History,
  FileText,
  AlertCircle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

interface EmployeePayrollTabProps {
  employeeId: string;
  employeeName: string;
  staffCode: string;
}

export function EmployeePayrollTab({
  employeeId,
  employeeName,
  staffCode,
}: EmployeePayrollTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canViewPayroll = hasPermission(user, "payroll.view");
  const canManageStructure = hasPermission(user, "payroll.structure.manage");

  // Modal states
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [inspectingRecord, setInspectingRecord] =
    useState<PayrollRecord | null>(null);

  // Form State
  const [payType, setPayType] = useState<"fixed_monthly" | "hourly">(
    "fixed_monthly",
  );
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [allowances, setAllowances] = useState<AllowanceDeductionItem[]>([]);
  const [deductions, setDeductions] = useState<AllowanceDeductionItem[]>([]);

  // 1. Fetch Active Salary Structure
  const {
    data: activeStructure,
    isLoading: isLoadingStructure,
  } = useQuery({
    queryKey: ["payroll", "structure", employeeId],
    queryFn: () => payrollApi.getEffectiveSalaryStructure(employeeId),
    enabled: canViewPayroll && !!employeeId,
  });

  // 2. Fetch Salary Structure History
  const { data: structureHistory = [] } = useQuery({
      queryKey: ["payroll", "structure", "history", employeeId],
      queryFn: () => payrollApi.getSalaryStructureHistory(employeeId),
      enabled: canViewPayroll && !!employeeId,
  });

  // 3. Fetch Historical Payroll Records for this Staff Member
  const { data: payrollRecordsData, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["payroll", "records", { staffId: employeeId }],
    queryFn: () => payrollApi.listRecords({ staffId: employeeId }),
    enabled: canViewPayroll && !!employeeId,
  });

  const payrollRecords = payrollRecordsData?.data || [];

  // Mutation to save/update structure
  const saveStructureMutation = useMutation({
    mutationFn: (data: SalaryStructure) => payrollApi.setSalaryStructure(data),
    onSuccess: () => {
      toast.success("Salary structure successfully configured and activated");
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["payroll", "structure", employeeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["payroll", "structure", "history", employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to save salary structure";
      toast.error(msg);
    },
  });

  const openConfigModal = () => {
    if (activeStructure) {
      setPayType(activeStructure.payType || "fixed_monthly");
      setBaseSalary(activeStructure.baseSalary || 0);
      setHourlyRate(activeStructure.hourlyRate || 0);
      setAllowances(activeStructure.allowances || []);
      setDeductions(activeStructure.deductions || []);
    } else {
      setPayType("fixed_monthly");
      setBaseSalary(0);
      setHourlyRate(0);
      setAllowances([]);
      setDeductions([]);
    }
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setIsConfigModalOpen(true);
  };

  const handleAddAllowance = () => {
    setAllowances([...allowances, { name: "", amount: 0 }]);
  };

  const handleRemoveAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  const handleAddDeduction = () => {
    setDeductions([...deductions, { name: "", amount: 0 }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    if (baseSalary < 0) {
      toast.error("Base salary cannot be negative");
      return;
    }

    saveStructureMutation.mutate({
      staffId: employeeId,
      payType,
      baseSalary: Number(baseSalary),
      hourlyRate: Number(hourlyRate),
      allowances: allowances.filter((a) => a.name.trim() && a.amount > 0),
      deductions: deductions.filter((d) => d.name.trim() && d.amount > 0),
      effectiveFrom: new Date(effectiveFrom).toISOString(),
    });
  };

  if (!canViewPayroll) {
    return (
      <div className="bg-card border rounded-2xl p-12 text-center shadow-sm">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-bold text-base text-foreground">
          Access Restricted
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
          You do not have the required <code>payroll.view</code> permission to
          view compensation structures and payslips.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION A: Current Salary Structure */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                Active Compensation Structure
              </h3>
              {activeStructure && (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current authoritative compensation baseline used for automated
              monthly calculations.
            </p>
          </div>

          {canManageStructure && (
            <Button size="sm" onClick={openConfigModal} className="text-xs h-8">
              {activeStructure
                ? "Revise Salary Structure"
                : "Define Salary Structure"}
            </Button>
          )}
        </div>

        {isLoadingStructure ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading salary configuration...
          </div>
        ) : activeStructure ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border">
                <span className="text-xs font-medium text-muted-foreground">
                  Base Monthly Rate
                </span>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  ₹{(activeStructure.baseSalary || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border">
                <span className="text-xs font-medium text-muted-foreground">
                  Pay Type
                </span>
                <div className="text-base font-semibold capitalize text-foreground mt-1.5">
                  {activeStructure.payType.replace("_", " ")}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border">
                <span className="text-xs font-medium text-muted-foreground">
                  Effective Starting Date
                </span>
                <div className="text-sm font-semibold text-foreground mt-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {new Date(activeStructure.effectiveFrom).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </div>
              </div>
            </div>

            {/* Allowances & Deductions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 bg-background">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex justify-between mb-2">
                  <span>Allowances</span>
                  <span className="font-mono">
                    +₹
                    {(activeStructure.allowances || [])
                      .reduce(
                        (sum: number, a: AllowanceDeductionItem) =>
                          sum + (a.amount || 0),
                        0,
                      )
                      .toLocaleString()}
                  </span>
                </div>
                {(activeStructure.allowances || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No regular allowances configured
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeStructure.allowances.map(
                      (a: AllowanceDeductionItem, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs py-1 border-b"
                        >
                          <span className="text-muted-foreground">
                            {a.name}
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{a.amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="border rounded-xl p-4 bg-background">
                <div className="text-xs font-bold uppercase tracking-wider text-red-500 flex justify-between mb-2">
                  <span>Fixed Deductions</span>
                  <span className="font-mono">
                    -₹
                    {(activeStructure.deductions || [])
                      .reduce(
                        (sum: number, d: AllowanceDeductionItem) =>
                          sum + (d.amount || 0),
                        0,
                      )
                      .toLocaleString()}
                  </span>
                </div>
                {(activeStructure.deductions || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No fixed deductions configured
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeStructure.deductions.map(
                      (d: AllowanceDeductionItem, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs py-1 border-b"
                        >
                          <span className="text-muted-foreground">
                            {d.name}
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{d.amount.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-600" />
            <div className="text-sm font-semibold text-foreground">
              No Active Salary Structure
            </div>
            <p className="text-xs max-w-sm mx-auto">
              This employee does not have a compensation structure configured.
              Add a structure to include them in monthly payroll calculations.
            </p>
          </div>
        )}
      </div>

      {/* SECTION B: Historical Salary Structures */}
      {structureHistory.length > 1 && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              Compensation Revision History
            </h3>
          </div>

          <div className="divide-y text-xs">
            {structureHistory.map((h: SalaryStructure, i: number) => (
              <div
                key={h._id || i}
                className="py-2.5 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    Base: ₹{(h.baseSalary || 0).toLocaleString()} • {h.payType}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Effective:{" "}
                    {new Date(h.effectiveFrom).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    {h.effectiveTo ? (
                      <>
                        to{" "}
                        {new Date(h.effectiveTo).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      <span className="text-emerald-600 font-bold">
                        (Current Active)
                      </span>
                    )}
                  </div>
                </div>

                <Badge
                  variant={h.isActive ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {h.isActive ? "Active" : "Archived"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C: Historical Payroll Runs & Payslips */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Payroll & Payslip History
            </h3>
            <p className="text-xs text-muted-foreground">
              Historical calculated, approved, and disbursed monthly wages.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {payrollRecords.length} Records
          </Badge>
        </div>

        {isLoadingRecords ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading historical payroll entries...
          </div>
        ) : payrollRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No payroll records generated for this employee yet.
          </div>
        ) : (
          <div className="divide-y text-xs">
            {payrollRecords.map((rec: PayrollRecord) => {
              const recId = rec._id || rec.id || "";
              return (
                <div
                  key={recId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {rec.monthYear}
                      </span>
                      <Badge
                        variant={
                          rec.status === "paid" ? "default" : "secondary"
                        }
                        className={
                          rec.status === "paid"
                            ? "bg-emerald-600 text-white text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {rec.status.toUpperCase()}
                      </Badge>
                      {rec.approvalBlocked && (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Gross: ₹{rec.calculations.totalGrossPay.toLocaleString()}{" "}
                      • Deductions: -₹
                      {rec.calculations.totalDeductions.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Net Disbursed
                      </div>
                      <div className="font-mono font-bold text-sm text-foreground">
                        ₹{rec.calculations.netPayable.toLocaleString()}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectingRecord(rec)}
                      className="h-7 text-xs px-2.5"
                    >
                      Audit
                    </Button>

                    {rec.status === "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          payrollApi.downloadPayslipPdf(
                            recId,
                            `payslip-${rec.monthYear}-${staffCode}.pdf`,
                          )
                        }
                        className="h-7 text-xs px-2.5 text-emerald-700 hover:text-emerald-800"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calculation Transparency Breakdown Dialog */}
      <CalculationBreakdownDialog
        record={inspectingRecord}
        isOpen={!!inspectingRecord}
        onClose={() => setInspectingRecord(null)}
        onDownloadPdf={() =>
          inspectingRecord &&
          payrollApi.downloadPayslipPdf(
            inspectingRecord._id || inspectingRecord.id || "",
            `payslip-${inspectingRecord.monthYear}-${staffCode}.pdf`,
          )
        }
      />

      {/* Salary Structure Definition Dialog */}
      <Dialog
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configure Salary Structure: ${employeeName}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block text-foreground mb-1">
                Pay Type
              </label>
              <select
                value={payType}
                onChange={(e) =>
                  setPayType(e.target.value as "fixed_monthly" | "hourly")
                }
                className="w-full text-xs h-9 border rounded-lg px-3 bg-background"
              >
                <option value="fixed_monthly">Fixed Monthly Salary</option>
                <option value="hourly">Hourly Wage</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold block text-foreground mb-1">
                {payType === "fixed_monthly"
                  ? "Monthly Base Salary (₹)"
                  : "Hourly Rate (₹)"}
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                required
                value={payType === "fixed_monthly" ? baseSalary : hourlyRate}
                onChange={(e) =>
                  payType === "fixed_monthly"
                    ? setBaseSalary(Number(e.target.value))
                    : setHourlyRate(Number(e.target.value))
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block text-foreground mb-1">
              Effective Starting Date
            </label>
            <Input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Determines the starting payroll period from which this
              compensation applies.
            </p>
          </div>

          {/* Allowances */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground">
                Standard Allowances
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAllowance}
                className="h-7 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Allowance
              </Button>
            </div>

            {allowances.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Allowance Name (e.g. Travel, Housing)"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...allowances];
                    updated[idx].name = e.target.value;
                    setAllowances(updated);
                  }}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  value={item.amount}
                  onChange={(e) => {
                    const updated = [...allowances];
                    updated[idx].amount = Number(e.target.value);
                    setAllowances(updated);
                  }}
                  className="h-8 text-xs w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAllowance(idx)}
                  className="h-8 w-8 p-0 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Deductions */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground">
                Fixed Deductions
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDeduction}
                className="h-7 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Deduction
              </Button>
            </div>

            {deductions.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Deduction Name (e.g. Insurance, Uniform)"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...deductions];
                    updated[idx].name = e.target.value;
                    setDeductions(updated);
                  }}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  value={item.amount}
                  onChange={(e) => {
                    const updated = [...deductions];
                    updated[idx].amount = Number(e.target.value);
                    setDeductions(updated);
                  }}
                  className="h-8 text-xs w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDeduction(idx)}
                  className="h-8 w-8 p-0 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saveStructureMutation.isPending}
            >
              {saveStructureMutation.isPending
                ? "Saving..."
                : "Save Compensation"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
