import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api/axios";
import { payrollApi } from "../api/payroll.api";

describe("payrollApi manual settlement contracts", () => {
  afterEach(() => vi.clearAllMocks());

  it("uses branch-aware central API requests for record, confirm, and failure actions", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { record: {}, payment: {}, isIdempotentReplay: false } },
    } as never);

    await payrollApi.recordPayment("record-1", {
      paymentMethod: "bank_transfer",
      paymentReference: "UTR-1",
      amountInPaise: 12345,
      paymentDate: "2026-03-31T00:00:00.000Z",
      idempotencyKey: "pay-record-1",
    });
    await payrollApi.confirmPayment("record-1", "payment-1");
    await payrollApi.failPayment("record-1", "payment-1", "Bank rejected payment");

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/payroll/records/record-1/pay",
      expect.objectContaining({ amountInPaise: 12345, idempotencyKey: "pay-record-1" }),
      { branchScope: "current" },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/payroll/records/record-1/payments/payment-1/confirm",
      { confirmActualPayment: true },
      { branchScope: "current" },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      "/payroll/records/record-1/payments/payment-1/fail",
      { failureReason: "Bank rejected payment" },
      { branchScope: "current" },
    );
  });
});
