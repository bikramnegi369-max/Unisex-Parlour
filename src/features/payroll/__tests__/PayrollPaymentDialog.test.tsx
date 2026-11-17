import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PayrollPaymentDialog } from "../components/PayrollPaymentDialog";
import type {
  PayrollPaymentAttempt,
  PayrollRecord,
} from "../api/payroll.api";

const record = {
  _id: "payroll-1",
  organizationId: "org-1",
  branchId: "branch-1",
  payrollPeriodId: "period-1",
  staffId: { _id: "staff-1", name: "Asha", staffCode: "STF-1", designation: "Stylist" },
  monthYear: "2026-03",
  status: "approved",
  salaryStructureSnapshot: {
    payType: "fixed_monthly",
    baseSalary: 30000,
    hourlyRate: 0,
    allowances: [],
    deductions: [],
  },
  attendanceSummarySnapshot: {
    totalDaysInMonth: 31,
    eligibleDays: 31,
    presentDays: 28,
    lateDays: 0,
    earlyDepartureDays: 0,
    incompleteDays: 0,
    unresolvedConflicts: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    absentDays: 0,
  },
  calculations: {
    prorationFactor: 1,
    grossBaseSalary: 30000,
    totalAllowances: 0,
    totalGrossPay: 30000,
    unpaidLeaveDeduction: 0,
    fixedDeductions: 0,
    totalDeductions: 0,
    netPayable: 30000,
  },
  approvalBlocked: false,
  approvalBlockReasons: [],
  incentiveLedgerGrossInPaise: 10000,
  incentiveLedgerClawbackInPaise: 2000,
  incentiveLedgerAmountInPaise: 8000,
  createdAt: "2026-03-31T00:00:00.000Z",
} as PayrollRecord;

const payment: PayrollPaymentAttempt = {
  _id: "payment-1",
  amountInPaise: 3_000_000,
  paymentMethod: "bank_transfer",
  paymentReference: "UTR-123",
  paymentDate: "2026-03-31T00:00:00.000Z",
  status: "recorded",
  recordedAt: "2026-03-31T00:00:00.000Z",
};

const renderDialog = (overrides: Partial<ComponentProps<typeof PayrollPaymentDialog>> = {}) =>
  render(
    <PayrollPaymentDialog
      isOpen
      record={record}
      isRecording={false}
      isConfirming={false}
      isFailing={false}
      onClose={vi.fn()}
      onRecord={vi.fn().mockResolvedValue(payment)}
      onConfirm={vi.fn().mockResolvedValue(undefined)}
      onFail={vi.fn().mockResolvedValue({ ...payment, status: "failed" })}
      {...overrides}
    />,
  );

describe("PayrollPaymentDialog", () => {
  afterEach(() => cleanup());

  it("records an exact payable as an attempt and requires explicit settlement confirmation", async () => {
    const onRecord = vi.fn().mockResolvedValue(payment);
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onRecord, onConfirm });

    expect(screen.getByText("Payroll period 2026-03")).toBeInTheDocument();
    expect(screen.getByText("Commission included in payroll")).toBeInTheDocument();
    expect(screen.getByText("₹80.00")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Payment reference"), {
      target: { value: "UTR-123" },
    });
    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "30000.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record payment attempt" }));

    await waitFor(() => expect(onRecord).toHaveBeenCalledOnce());
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInPaise: 3_000_000,
        paymentMethod: "bank_transfer",
        paymentReference: "UTR-123",
        idempotencyKey: expect.any(String),
      }),
    );
    expect(await screen.findByText("Recorded is not paid")).toBeTruthy();

    const confirmButton = screen.getByRole("button", { name: "Confirm actual payment" });
    expect(confirmButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText("I verified the actual payment settlement and reference above."));
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("payment-1"));
  });

  it("blocks recording an amount that differs by one paise", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Payment reference"), {
      target: { value: "UTR-123" },
    });
    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "30000.01" },
    });
    expect(screen.getByRole("alert").textContent).toContain("exact payroll payable amount");
    expect(screen.getByRole("button", { name: "Record payment attempt" })).toBeDisabled();
  });

  it("keeps payment confirmation unavailable while a confirmation is pending", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog({
      initialAttempt: payment,
      isConfirming: true,
      onConfirm,
    });

    fireEvent.click(screen.getByLabelText(
      "I verified the actual payment settlement and reference above.",
    ));
    const confirmButton = screen.getByRole("button", { name: "Confirming..." });
    expect(confirmButton).toBeDisabled();
    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
