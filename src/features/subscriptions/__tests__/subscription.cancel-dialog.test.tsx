// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CancelSubscriptionDialog } from "../components/CancelSubscriptionDialog";
import * as subscriptionsApi from "../api/subscriptions.api";
import type { Subscription, CancellationPreviewData } from "../types/subscription.types";

const mockSubscription: Subscription = {
  id: "sub_101",
  subscriptionCode: "SUB-101",
  organizationId: "org_1",
  customerId: "cust_1",
  payerCustomerId: "cust_1",
  price: 5000,
  amountPaid: 0,
  amountDue: 5000,
  status: "active",
  paymentStatus: "unpaid",
  permittedBranchIds: [],
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  members: [],
  entitlements: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user_manager",
      name: "Manager",
      permissions: ["subscriptions.view", "subscriptions.configure"],
    },
  }),
}));

describe("CancelSubscriptionDialog - Production-Grade Cancellation & Rebilling UI", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderDialog = (props?: {
    subscription?: Subscription;
    onConfirm?: ReturnType<typeof vi.fn>;
    isLoading?: boolean;
  }) => {
    const sub = props?.subscription || mockSubscription;
    const onClose = vi.fn();
    const onConfirm = props?.onConfirm || vi.fn().mockResolvedValue(undefined);

    const utils = render(
      <QueryClientProvider client={queryClient}>
        <CancelSubscriptionDialog
          subscription={sub}
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          isLoading={props?.isLoading ?? false}
        />
      </QueryClientProvider>
    );

    return { ...utils, onClose, onConfirm };
  };

  it("loads and displays Rule A cancellation preview for unused subscription", async () => {
    const mockPreview: CancellationPreviewData = {
      subscriptionId: "sub_101",
      subscriptionCode: "SUB-101",
      status: "active",
      isPaid: false,
      isEligible: true,
      eligibilityRule: "RULE_A",
      totalCollected: 0,
      consumedEntitlementCount: 0,
      affectedAppointmentCount: 0,
      expectedRebilledSubtotalIncrease: 0,
      affectedAppointments: [],
    };

    vi.spyOn(subscriptionsApi, "getCancellationPreview").mockResolvedValueOnce(mockPreview);

    renderDialog();

    expect(await screen.findByText(/Rule A: Cancel Unused Subscription/i)).toBeDefined();
    expect(screen.getByText(/without additional appointment charges or invoice adjustments/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Confirm Cancellation/i })).toBeDefined();
  });

  it("loads and displays Rule B preview with affected appointments and additional appointment charges", async () => {
    const mockPreview: CancellationPreviewData = {
      subscriptionId: "sub_101",
      subscriptionCode: "SUB-101",
      status: "active",
      isPaid: false,
      isEligible: true,
      eligibilityRule: "RULE_B",
      totalCollected: 0,
      consumedEntitlementCount: 2,
      affectedAppointmentCount: 1,
      expectedRebilledSubtotalIncrease: 1500,
      breakdown: {
        pendingAppointments: 0,
        completedAppointments: 1,
      },
      affectedAppointments: [
        {
          appointmentId: "apt_999",
          appointmentCode: "APT-999",
          status: "completed",
          serviceLinesToRebill: [
            {
              appointmentServiceId: "srv_line_1",
              serviceId: "srv_haircut",
              serviceName: "Classic Haircut",
              restoredRetailPrice: 1500,
            },
          ],
        },
      ],
    };

    vi.spyOn(subscriptionsApi, "getCancellationPreview").mockResolvedValueOnce(mockPreview);

    renderDialog();

    expect(await screen.findByText(/Rule B: Cancel Subscription and Restore Used-Service Charges/i)).toBeDefined();
    expect(screen.getByText(/Consumed Entitlements/i)).toBeDefined();
    expect(screen.getByText(/2 units/i)).toBeDefined();
    expect(screen.getByText(/Additional Appointment Charges/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Confirm Cancellation & Restore Charges/i })).toBeDefined();

    // Toggle affected appointment list
    const toggleBtn = screen.getByRole("button", { name: /View 1 Affected Appointment/i });
    fireEvent.click(toggleBtn);

    expect(await screen.findByText("Classic Haircut")).toBeDefined();
    expect(screen.getByText("APT-999")).toBeDefined();
  });

  it("blocks submission and explains ineligibility when preview returns isEligible: false", async () => {
    const mockPreview: CancellationPreviewData = {
      subscriptionId: "sub_101",
      subscriptionCode: "SUB-101",
      status: "active",
      isPaid: true,
      isEligible: false,
      eligibilityRule: "RULE_B",
      ineligibilityReason: "Paid subscriptions with consumed usage cannot be cancelled under Rule B.",
      totalCollected: 5000,
      consumedEntitlementCount: 3,
      affectedAppointmentCount: 2,
      expectedRebilledSubtotalIncrease: 2500,
      affectedAppointments: [],
    };

    vi.spyOn(subscriptionsApi, "getCancellationPreview").mockResolvedValueOnce(mockPreview);

    renderDialog();

    expect(await screen.findByText(/Subscription Ineligible for Cancellation/i)).toBeDefined();
    expect(screen.getByText(/Paid subscriptions with consumed usage cannot be cancelled/i)).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /Confirm Cancellation/i });
    expect(submitBtn).toHaveProperty("disabled", true);
  });

  it("switches to async progress view when onConfirm returns an active operationId (HTTP 202)", async () => {
    const mockPreview: CancellationPreviewData = {
      subscriptionId: "sub_101",
      subscriptionCode: "SUB-101",
      status: "active",
      isPaid: false,
      isEligible: true,
      eligibilityRule: "RULE_B",
      totalCollected: 0,
      consumedEntitlementCount: 5,
      affectedAppointmentCount: 5,
      expectedRebilledSubtotalIncrease: 3000,
      affectedAppointments: [],
    };

    vi.spyOn(subscriptionsApi, "getCancellationPreview").mockResolvedValueOnce(mockPreview);
    vi.spyOn(subscriptionsApi, "getCancellationOperation").mockResolvedValueOnce({
      operationId: "op_batch_777",
      subscriptionId: "sub_101",
      status: "processing",
      progress: {
        totalAppointments: 5,
        processedAppointments: 2,
      },
    });

    const onConfirm = vi.fn().mockResolvedValue({
      isAsync: true,
      operationId: "op_batch_777",
      status: "processing",
    });

    renderDialog({ onConfirm });

    // Wait for preview to finish loading
    expect(await screen.findByText(/Rule B: Cancel Subscription and Restore Used-Service Charges/i)).toBeDefined();

    // Enter reason
    const reasonInput = screen.getByPlaceholderText(/State the reason for cancellation/i);
    fireEvent.change(reasonInput, { target: { value: "Customer requested cancellation with restored charges" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Confirm Cancellation & Restore Charges/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });

    // View switches to progress view
    expect(await screen.findByText(/Processing Subscription Cancellation\.\.\./i)).toBeDefined();
    expect(screen.getByText(/ch_777/i)).toBeDefined();
  });
});
