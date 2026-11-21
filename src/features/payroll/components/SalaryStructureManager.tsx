"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  payrollApi,
  SalaryStructure,
  AllowanceDeductionItem,
} from "../api/payroll.api";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import type { Employee } from "@/features/employees/types/employee.types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Calendar,
  Search,
  User,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/api/errors";

export function SalaryStructureManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageStructure = hasPermission(user, "payroll.structure.manage");
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    limit: 100,
  });
  const employees: Employee[] = employeesData?.data || [];

  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Form State
  const [payType, setPayType] = useState<"fixed_monthly" | "hourly">(
    "fixed_monthly",
  );
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [annualPaidLeave, setAnnualPaidLeave] = useState<number>(0);
  const [carryForwardDays, setCarryForwardDays] = useState<number>(0);
  const [allowances, setAllowances] = useState<
    Array<{ name: string; amount: number }>
  >([]);
  const [deductions, setDeductions] = useState<
    Array<{ name: string; amount: number }>
  >([]);

  // Fetch active structure for selected staff
  const { data: activeStructure, isLoading: isLoadingStructure } = useQuery({
    queryKey: ["payroll", "structure", selectedStaffId],
    queryFn: () => payrollApi.getEffectiveSalaryStructure(selectedStaffId),
    enabled: !!selectedStaffId,
  });

  // Mutation to save/update structure
  const saveStructureMutation = useMutation({
    mutationFn: (data: SalaryStructure) => payrollApi.setSalaryStructure(data),
    onSuccess: () => {
      toast.success("Salary structure successfully configured and activated");
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["payroll", "structure", selectedStaffId],
      });
      queryClient.invalidateQueries({ queryKey: ["payroll", "records"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to save salary structure"));
    },
  });

  const filteredEmployees: Employee[] = (employees || []).filter(
    (emp: Employee) => {
      const q = searchTerm.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.staffCode.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q)
      );
    },
  );

  const selectedEmployee = (employees || []).find(
    (e: Employee) => (e.id || e._id) === selectedStaffId,
  );

  const openConfigModalForStaff = (emp: Employee) => {
    const empId = emp.id || emp._id;
    if (!empId) {
      toast.error(
        "Cannot configure a salary structure for an employee without an ID.",
      );
      return;
    }

    setSelectedStaffId(empId);
    if (
      activeStructure &&
      (activeStructure.staffId === empId || !activeStructure.staffId)
    ) {
      setPayType(activeStructure.payType || "fixed_monthly");
      setBaseSalary(activeStructure.baseSalary || 0);
      setHourlyRate(activeStructure.hourlyRate || 0);
      setAnnualPaidLeave(
        activeStructure.paidLeavePolicy?.annualEntitlement || 0,
      );
      setCarryForwardDays(
        activeStructure.paidLeavePolicy?.carryForwardDays || 0,
      );
      setAllowances(activeStructure.allowances || []);
      setDeductions(activeStructure.deductions || []);
    } else {
      setPayType("fixed_monthly");
      setBaseSalary(0);
      setHourlyRate(0);
      setAnnualPaidLeave(0);
      setCarryForwardDays(0);
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
    if (!selectedStaffId) return;

    if (baseSalary < 0) {
      toast.error("Base salary cannot be negative");
      return;
    }

    saveStructureMutation.mutate({
      staffId: selectedStaffId,
      payType,
      baseSalary: Number(baseSalary),
      hourlyRate: Number(hourlyRate),
      paidLeavePolicy: {
        annualEntitlement: Number(annualPaidLeave || 0),
        carryForwardDays: Number(carryForwardDays || 0),
      },
      allowances: allowances.filter((a) => a.name.trim() && a.amount > 0),
      deductions: deductions.filter((d) => d.name.trim() && d.amount > 0),
      effectiveFrom: new Date(effectiveFrom).toISOString(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Employee List Column */}
      <div className="lg:col-span-5 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground">
              Salon Personnel
            </h3>
            <p className="text-xs text-muted-foreground">
              Select an employee to inspect or define compensation
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {filteredEmployees.length} Staff
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        {/* List */}
        <div className="space-y-2 max-h-135 overflow-y-auto pr-1">
          {isLoadingEmployees ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading employee roster...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No employees found matching criteria
            </div>
          ) : (
            filteredEmployees.map((emp: Employee) => {
              const empId = emp.id || emp._id || "";
              const isSelected = empId === selectedStaffId;
              return (
                <div
                  key={empId}
                  onClick={() => setSelectedStaffId(empId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-background hover:bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground uppercase border">
                      {emp.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {emp.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {emp.designation} •{" "}
                        <span className="font-mono">{emp.staffCode}</span>
                      </div>
                    </div>
                  </div>

                  {canManageStructure && (
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="h-7 text-xs px-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfigModalForStaff(emp);
                      }}
                    >
                      Configure
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Salary Structure Details Column */}
      <div className="lg:col-span-7 bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        {!selectedStaffId ? (
          <div className="h-full flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <User className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-foreground text-base">
              No Employee Selected
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Select an employee from the roster on the left to view their
              current salary structure, allowances, and effective date history.
            </p>
          </div>
        ) : isLoadingStructure ? (
          <div className="h-full flex items-center justify-center py-24 text-xs text-muted-foreground">
            Loading active compensation structure...
          </div>
        ) : activeStructure ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/employees/${selectedEmployee?.id || selectedEmployee?._id || ""}`}
                    className="text-lg font-bold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                  >
                    {selectedEmployee?.name}
                  </Link>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    Active Structure
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedEmployee?.designation} • Code:{" "}
                  <span className="font-mono">
                    {selectedEmployee?.staffCode}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/employees/${selectedEmployee?.id || selectedEmployee?._id || ""}`}
                  className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border hover:bg-muted transition-colors"
                >
                  View Profile
                </Link>
                {canManageStructure && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedEmployee) {
                        openConfigModalForStaff(selectedEmployee);
                      }
                    }}
                  >
                    Update Structure
                  </Button>
                )}
              </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="text-xs font-medium text-muted-foreground">
                  Base Monthly Salary
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  ₹{(activeStructure.baseSalary || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="text-xs font-medium text-muted-foreground">
                  Pay Type
                </div>
                <div className="text-base font-semibold capitalize text-foreground mt-1.5">
                  {activeStructure.payType.replace("_", " ")}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="text-xs font-medium text-muted-foreground">
                  Annual Paid Leave
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1 flex items-baseline gap-1">
                  <span>
                    {activeStructure.paidLeavePolicy?.annualEntitlement ?? 0}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    days
                  </span>
                  {(activeStructure.paidLeavePolicy?.carryForwardDays || 0) >
                    0 && (
                    <span className="text-xs font-normal text-emerald-600 ml-1">
                      (+{activeStructure.paidLeavePolicy?.carryForwardDays} CF)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border">
                <div className="text-xs font-medium text-muted-foreground">
                  Effective Since
                </div>
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

            {/* Allowances & Deductions lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allowances */}
              <div className="border rounded-xl p-4 bg-background">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Allowances</span>
                  <span className="text-emerald-600 font-mono">
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
                  <div className="text-xs text-muted-foreground py-4 text-center">
                    No regular allowances configured
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeStructure.allowances.map(
                      (a: AllowanceDeductionItem, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs py-1 border-b border-border/50"
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

              {/* Deductions */}
              <div className="border rounded-xl p-4 bg-background">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Fixed Deductions</span>
                  <span className="text-red-500 font-mono">
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
                  <div className="text-xs text-muted-foreground py-4 text-center">
                    No fixed deductions configured
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeStructure.deductions.map(
                      (d: AllowanceDeductionItem, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs py-1 border-b border-border/50"
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

            {/* Immutability Note */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Audit Guarantee:</strong> When updated, past approved or
                disbursed payroll runs retain frozen snapshots of historical
                salary rates and will not change.
              </span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-foreground text-base">
              No Salary Structure Configured
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {selectedEmployee?.name} does not have an active compensation
              package defined yet.
            </p>
            {canManageStructure && (
              <Button
                size="sm"
                onClick={() => {
                  if (selectedEmployee) {
                    openConfigModalForStaff(selectedEmployee);
                  }
                }}
              >
                Configure Salary Now
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Salary Configuration Dialog */}
      <Dialog
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configure Salary Structure: ${selectedEmployee?.name || ""}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          {/* Pay Type & Base */}
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

          {/* Effective From */}
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
              Determines the starting period from which this compensation
              applies.
            </p>
          </div>

          {/* Paid Leave Policy Section */}
          <div className="space-y-3 border-t pt-3">
            <span className="text-xs font-bold uppercase text-foreground block">
              Paid Leave Policy
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block text-foreground mb-1">
                  Annual Paid Leave Entitlement (Days)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  step="0.5"
                  required
                  value={annualPaidLeave}
                  onChange={(e) => setAnnualPaidLeave(Number(e.target.value))}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Eligible paid leave days per calendar year.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold block text-foreground mb-1">
                  Carry-Forward Days (Optional)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  step="0.5"
                  value={carryForwardDays}
                  onChange={(e) => setCarryForwardDays(Number(e.target.value))}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unused balance carried forward from previous leave year.
                </p>
              </div>
            </div>
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
