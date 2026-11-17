import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { ManualRecoveryPaymentDialog } from "../components/ManualRecoveryPaymentDialog";
import type {
  IncentiveRecoveryObligation,
  IncentiveRecoveryPaymentAttempt,
} from "../types/incentives.types";

const obligation: IncentiveRecoveryObligation = {
  _id: "obligation-1",
  organizationId: "org-1",
  branchId: "branch-1",
  staffId: { _id: "staff-1", name: "Asha", staffCode: "STF-1" },
  clawbackLedgerId: "clawback-1",
  originalClawbackInPaise: 1000,
  totalRecoveredInPaise: 0,
  totalReservedInPaise: 0,
  remainingAvailableInPaise: 1000,
  collectibleAvailableInPaise: 1000,
  status: "pending",
  allocations: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

const recordedAttempt: IncentiveRecoveryPaymentAttempt = {
  _id: "recovery-attempt-1",
  amountInPaise: 425,
  paymentMethod: "bank_transfer",
  paymentReference: "REC-425",
  paymentDate: "2026-03-01T00:00:00.000Z",
  reason: "Manual recovery test",
  status: "recorded",
  recordedAt: "2026-03-01T00:00:00.000Z",
};

const renderDialog = (
  overrides: Partial<ComponentProps<typeof ManualRecoveryPaymentDialog>> = {},
) =>
  render(
    <ManualRecoveryPaymentDialog
      isOpen
      obligation={obligation}
      attempt={null}
      history={[]}
      canReverse={false}
      isRecording={false}
      isConfirming={false}
      isFailing={false}
      isReversing={false}
      onClose={vi.fn()}
      onAttemptChange={vi.fn()}
      onRecord={vi.fn().mockResolvedValue(recordedAttempt)}
      onConfirm={vi.fn().mockResolvedValue({ ...recordedAttempt, status: "confirmed" })}
      onFail={vi.fn().mockResolvedValue({ ...recordedAttempt, status: "failed" })}
      onReverse={vi.fn().mockResolvedValue({ ...recordedAttempt, status: "reversed" })}
      {...overrides}
    />,
  );

describe("ManualRecoveryPaymentDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("records a paise-exact attempt without treating it as recovered", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "recovery-idempotency-key" });
    const onRecord = vi.fn().mockResolvedValue(recordedAttempt);
    const onAttemptChange = vi.fn();
    renderDialog({ onRecord, onAttemptChange });

    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "4.25" },
    });
    fireEvent.change(screen.getByLabelText("Payment reference"), {
      target: { value: "REC-425" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Manual recovery test" },
    });
    expect(screen.getByText(/Recording reserves this amount but does not reduce the outstanding balance/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Record recovery attempt" }));

    await waitFor(() => expect(onRecord).toHaveBeenCalledOnce());
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInPaise: 425,
        paymentMethod: "bank_transfer",
        paymentReference: "REC-425",
        reason: "Manual recovery test",
        idempotencyKey: "recovery-idempotency-key",
      }),
    );
    expect(onAttemptChange).toHaveBeenCalledWith(recordedAttempt);
  });

  it("requires explicit actual-receipt confirmation and hides reversal from unauthorized users", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ...recordedAttempt, status: "confirmed" });
    renderDialog({ attempt: recordedAttempt, onConfirm });

    expect(screen.getByText("Recorded is not recovered")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Confirm actual recovery" });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText(/REC-425/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(
      "I verified the actual recovery amount, reference and receipt above.",
    ));
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("recovery-attempt-1"));
    expect(screen.queryByRole("button", { name: "Confirm recovery reversal" })).not.toBeInTheDocument();
  });

  it("requires confirmation and a reason before an authorized recovery reversal", async () => {
    const confirmedAttempt = { ...recordedAttempt, status: "confirmed" as const };
    const onReverse = vi.fn().mockResolvedValue({ ...confirmedAttempt, status: "reversed" });
    renderDialog({ attempt: confirmedAttempt, canReverse: true, onReverse });

    const reverseButton = screen.getByRole("button", { name: "Confirm recovery reversal" });
    expect(reverseButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for reversing this confirmed recovery"), {
      target: { value: "Bank returned the payment" },
    });
    fireEvent.click(screen.getByLabelText("I verified the actual return of this recovery payment."));
    expect(reverseButton).toBeEnabled();
    fireEvent.click(reverseButton);
    await waitFor(() =>
      expect(onReverse).toHaveBeenCalledWith("recovery-attempt-1", "Bank returned the payment"),
    );
  });

  it("does not submit an amount above the currently collectible balance", () => {
    const onRecord = vi.fn();
    renderDialog({ onRecord });
    fireEvent.change(screen.getByLabelText("Amount (₹)"), {
      target: { value: "10.01" },
    });
    expect(screen.getByRole("button", { name: "Record recovery attempt" })).toBeDisabled();
    expect(onRecord).not.toHaveBeenCalled();
  });
});
