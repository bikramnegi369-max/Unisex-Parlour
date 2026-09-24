// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RedeemSubscriptionModal } from "../components/RedeemSubscriptionModal";
import type { Subscription } from "../types/subscription.types";

const mockSubscription: Subscription = {
  id: "sub_1",
  subscriptionCode: "SUB-001",
  organizationId: "org_1",
  customerId: "cust_1",
  customer: {
    id: "cust_1",
    name: "Emma Watson",
    phone: "+91 98765 43210",
  },
  price: 3500,
  status: "active",
  permittedBranchIds: ["br_1"],
  entitlements: [
    {
      serviceId: "srv_1",
      serviceName: "Haircut",
      totalQuantity: 3,
      usedQuantity: 1,
      remainingQuantity: 2,
    },
    {
      serviceId: "srv_2",
      serviceName: "Beard Trim",
      totalQuantity: 2,
      usedQuantity: 2,
      remainingQuantity: 0, // Exhausted
    },
  ],
  startDate: "2026-09-01",
  endDate: "2027-03-01",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const mockSendOtp = vi.fn();
const mockRedeem = vi.fn();

vi.mock("../hooks/useSendSubscriptionOtp", () => ({
  useSendSubscriptionOtp: () => ({
    mutateAsync: mockSendOtp,
    isPending: false,
  }),
}));

vi.mock("../hooks/useRedeemSubscription", () => ({
  useRedeemSubscription: () => ({
    mutateAsync: mockRedeem,
    isPending: false,
  }),
}));

describe("RedeemSubscriptionModal", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (props: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RedeemSubscriptionModal
          subscription={mockSubscription}
          isOpen={props.isOpen}
          onClose={props.onClose}
          onSuccess={props.onSuccess}
        />
      </QueryClientProvider>
    );
  };

  it("displays only usable service entitlements with remainingQuantity > 0", () => {
    renderModal({ isOpen: true, onClose: vi.fn(), onSuccess: vi.fn() });

    // Haircut has remaining 2 -> should be visible
    expect(screen.getByText("Haircut")).not.toBeNull();
    expect(screen.getByText(/Remaining:/i)).not.toBeNull();

    // Beard Trim is exhausted (0 remaining) -> should not be selectable
    expect(screen.queryByText("Beard Trim")).toBeNull();
  });

  it("handles quantity selection, OTP request, OTP input, and redemption submission", async () => {
    mockSendOtp.mockResolvedValueOnce({ message: "OTP sent" });
    mockRedeem.mockResolvedValueOnce({
      subscription: mockSubscription,
      usageRecords: [],
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderModal({ isOpen: true, onClose, onSuccess });

    // Click "+" to select 1 unit of Haircut
    const plusButton = screen.getByRole("button", { name: "Increase quantity" });
    fireEvent.click(plusButton);

    expect(screen.getByText("1 unit selected")).not.toBeNull();

    // Click Send OTP
    const sendOtpButton = screen.getByRole("button", { name: "Send Customer OTP" });
    fireEvent.click(sendOtpButton);

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith("sub_1");
      expect(screen.getByPlaceholderText("Enter 4-6 digit SMS OTP...")).not.toBeNull();
    });

    // Enter OTP
    const otpInput = screen.getByPlaceholderText("Enter 4-6 digit SMS OTP...");
    fireEvent.change(otpInput, { target: { value: "654321" } });

    // Submit redemption
    const redeemButton = screen.getByRole("button", { name: "Complete Redemption" });
    fireEvent.click(redeemButton);

    await waitFor(() => {
      expect(mockRedeem).toHaveBeenCalledWith({
        id: "sub_1",
        payload: {
          otp: "654321",
          services: [{ serviceId: "srv_1", quantity: 1 }],
          appointmentId: undefined,
        },
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
