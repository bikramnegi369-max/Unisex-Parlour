import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { CalculationBreakdownDialog } from "../components/CalculationBreakdownDialog";
import { PayrollRecord } from "../api/payroll.api";

const mockRecord: PayrollRecord = {
  _id: "rec-123",
  organizationId: "org-1",
  branchId: "branch-1",
  monthYear: "2026-11",
  approvalBlocked: false,
  approvalBlockReasons: [],
  staffId: {
    _id: "staff-1",
    name: "John Doe",
    staffCode: "EMP001",
    email: "john@test.com",
    designation: "Stylist",
  },
  salaryStructureSnapshot: {
    payType: "fixed_monthly",
    baseSalary: 30000,
    hourlyRate: 150,
    paidLeavePolicy: {
      annualEntitlement: 12,
      carryForwardDays: 0,
    },
    allowances: [],
    deductions: [],
  },
  attendanceSummarySnapshot: {
    totalDaysInMonth: 30,
    eligibleDays: 30,
    presentDays: 15,
    lateDays: 0,
    earlyDepartureDays: 0,
    incompleteDays: 0,
    unresolvedConflicts: 0,
    paidLeaveDays: 1,
    unpaidLeaveDays: 1,
    absentDays: 13,
    payableDays: 16,
    paidLeaveEntitlement: 12,
    previouslyConsumedPaidLeave: 11,
  },
  calculations: {
    prorationFactor: 1,
    dailySalaryRate: 1000,
    payableDays: 16,
    proratedBaseSalary: 16000,
    grossBaseSalary: 16000,
    totalAllowances: 0,
    fixedDeductions: 0,
    unpaidLeaveDeduction: 0,
    totalDeductions: 0,
    totalGrossPay: 16000,
    netPayable: 16000,
  },
  status: "draft",
  payrollPeriodId: "period-1",
  createdAt: "2026-11-01T00:00:00.000Z",
};

describe("CalculationBreakdownDialog", () => {
  it("renders attendance-driven calculation breakdown and paid leave entitlement", () => {
    render(
      <CalculationBreakdownDialog
        isOpen={true}
        onClose={() => {}}
        record={mockRecord}
      />
    );

    // Dialog title
    expect(screen.getByText(/Salary Calculation Transparency & Audit Breakdown/i)).toBeDefined();

    // Attendance-driven metrics
    expect(screen.getByText(/1. Attendance-Driven Salary Calculation/i)).toBeDefined();
    expect(screen.getByText(/Verified Present Days \(15\) \+ Eligible Paid Leave \(1\)/i)).toBeDefined();
    expect(screen.getByText(/16 days/i)).toBeDefined();

    // Paid Leave Entitlement Consumption
    expect(screen.getByText(/2. Paid Leave Entitlement Consumption/i)).toBeDefined();
    expect(screen.getByText("Annual Entitlement")).toBeDefined();
    expect(screen.getByText("Previously Consumed")).toBeDefined();
    expect(screen.getByText("12 days")).toBeDefined();
    expect(screen.getByText("11 days")).toBeDefined();
  });
});
