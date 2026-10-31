// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CustomerSubscriptionsTab } from "../components/CustomerSubscriptionsTab";
import * as subHooks from "@/features/subscriptions/hooks/useSubscriptions";
import * as authHooks from "@/features/auth/hooks/useAuth";
import type { Subscription } from "@/features/subscriptions/types/subscription.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: { data: [{ id: "srv-1", name: "Haircut" }] },
    isLoading: false,
  }),
}));

vi.mock("@/features/subscriptions/hooks/useCreateSubscription", () => ({
  useCreateSubscription: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const mockSubscriptions: Subscription[] = [
  {
    id: "sub-payer-only",
    subscriptionCode: "SUB-PAYER",
    organizationId: "org-1",
    customerId: "cust-1",
    payerCustomerId: "cust-1",
    payerId: "cust-1",
    price: 1500,
    status: "active",
    paymentStatus: "paid",
    isPaid: true,
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    permittedBranchIds: [],
    entitlements: [
      {
        serviceId: "srv-1",
        serviceName: "Haircut",
        totalQuantity: 5,
        usedQuantity: 2,
        remainingQuantity: 3,
      },
    ],
    members: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sub-beneficiary-only",
    subscriptionCode: "SUB-BENEFICIARY",
    organizationId: "org-1",
    customerId: "cust-parent",
    payerCustomerId: "cust-parent",
    payerId: "cust-parent",
    payer: {
      id: "cust-parent",
      name: "Parent Payer",
      phone: "+91 9876543210",
    },
    price: 3000,
    status: "active",
    paymentStatus: "paid",
    isPaid: true,
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    permittedBranchIds: [],
    entitlements: [
      {
        serviceId: "srv-1",
        serviceName: "Haircut",
        totalQuantity: 10,
        usedQuantity: 4,
        remainingQuantity: 6,
      },
    ],
    members: [
      {
        customerId: "cust-1",
        status: "active",
        entitlements: [
          {
            serviceId: "srv-1",
            serviceName: "Haircut",
            totalQuantity: 4,
            usedQuantity: 1,
            remainingQuantity: 3,
          },
        ],
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("CustomerSubscriptionsTab - Production Grade Role Filtering", () => {
  beforeEach(() => {
    vi.spyOn(authHooks, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "admin",
        permissions: ["subscriptions.sell", "subscriptions.redeem"],
        name: "Admin User",
        status: "active",
        phone: "1234567890",
        currentBranchId: "branch-1",
      },
      isAuthenticated: true,
      isLoading: false,
      isError: false,
      login: vi.fn(),
      isLoggingIn: false,
      logout: vi.fn(),
      isLoggingOut: false,
      sendOtp: vi.fn(),
      isSendingOtp: false,
      verifyOtp: vi.fn(),
      isVerifyingOtp: false,
      activateChangePassword: vi.fn(),
      isActivatingChangePassword: false,
    });

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: mockSubscriptions,
        meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders tab pills with accurate live count badges for All, Payer, and Beneficiary", () => {
    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    const allTab = screen.getAllByRole("button", {
      name: /All Subscriptions/i,
    })[0];
    const payerTab = screen.getAllByRole("button", {
      name: /Purchased as Payer/i,
    })[0];
    const beneficiaryTab = screen.getAllByRole("button", {
      name: /Beneficiary Entitlements/i,
    })[0];

    expect(allTab).toBeInTheDocument();
    expect(payerTab).toBeInTheDocument();
    expect(beneficiaryTab).toBeInTheDocument();

    // Both cards visible in "All"
    expect(screen.getByText("SUB-PAYER")).toBeInTheDocument();
    expect(screen.getByText("SUB-BENEFICIARY")).toBeInTheDocument();
  });

  it("filters accurately when 'Purchased as Payer' tab is clicked", () => {
    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    const payerTab = screen.getAllByRole("button", {
      name: /Purchased as Payer/i,
    })[0];
    fireEvent.click(payerTab);

    expect(screen.getByText("SUB-PAYER")).toBeInTheDocument();
    expect(screen.queryByText("SUB-BENEFICIARY")).not.toBeInTheDocument();
  });

  it("filters accurately and displays Payer attribution when 'Beneficiary Entitlements' tab is clicked", () => {
    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    const beneficiaryTab = screen.getAllByRole("button", {
      name: /Beneficiary Entitlements/i,
    })[0];
    fireEvent.click(beneficiaryTab);

    expect(screen.queryByText("SUB-PAYER")).not.toBeInTheDocument();
    expect(screen.getByText("SUB-BENEFICIARY")).toBeInTheDocument();
    // Displays the Payer name and phone
    expect(screen.getByText(/Parent Payer/i)).toBeInTheDocument();
    expect(screen.getByText(/\+91 9876543210/i)).toBeInTheDocument();
    expect(screen.getByText(/Beneficiary Role/i)).toBeInTheDocument();
  });
});
