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
        phone: "1234567890",
        organizationId: "org-1",
        branchAccess: [],
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

  it("1. payer-only subscription uses root entitlements", () => {
    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // SUB-PAYER has 3 remaining / 5 total at root level
    expect(screen.getByText(/2 used \/ 5 total/i)).toBeInTheDocument();
    expect(screen.getByText("Payer Role")).toBeInTheDocument();
  });

  it("2. beneficiary-only subscription uses that member's entitlements", () => {
    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // SUB-BENEFICIARY root has 6 remaining / 10 total, but cust-1 member has 3 remaining / 4 total (1 used)
    expect(screen.getByText(/1 used \/ 4 total/i)).toBeInTheDocument();
    expect(screen.getByText("Beneficiary Role")).toBeInTheDocument();
  });

  it("3. customer who is both payer and member uses their member-specific entitlements", () => {
    const dualRoleSub: Subscription = {
      id: "sub-dual",
      subscriptionCode: "SUB-DUAL",
      organizationId: "org-1",
      customerId: "cust-1",
      payerCustomerId: "cust-1",
      price: 5000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [
        {
          serviceId: "srv-1",
          serviceName: "Haircut",
          totalQuantity: 20,
          usedQuantity: 10,
          remainingQuantity: 10,
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
              totalQuantity: 8,
              usedQuantity: 2,
              remainingQuantity: 6,
            },
          ],
        },
        {
          customerId: "cust-other",
          status: "active",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 12,
              usedQuantity: 8,
              remainingQuantity: 4,
            },
          ],
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [dualRoleSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Should display Payer & Member Role badge
    expect(screen.getByText("Payer & Member Role")).toBeInTheDocument();
    // Must display cust-1 member entitlements (2 used / 8 total, 6 left) instead of aggregate (10 used / 20 total)
    expect(screen.getByText(/2 used \/ 8 total/i)).toBeInTheDocument();
    expect(screen.getByText(/6 left/i)).toBeInTheDocument();
    expect(screen.queryByText(/10 used \/ 20 total/i)).not.toBeInTheDocument();
  });

  it("4. a customer with multiple member allocations across subscriptions sees only their own allocation", () => {
    const multiMemberSub: Subscription = {
      id: "sub-family",
      subscriptionCode: "SUB-FAMILY",
      organizationId: "org-1",
      customerId: "cust-parent",
      payerCustomerId: "cust-parent",
      price: 8000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [],
      members: [
        {
          customerId: "cust-sibling",
          status: "active",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 15,
              usedQuantity: 5,
              remainingQuantity: 10,
            },
          ],
        },
        {
          customerId: "cust-1",
          status: "active",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 3,
              usedQuantity: 1,
              remainingQuantity: 2,
            },
          ],
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [multiMemberSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Should only see cust-1's allocation (1 used / 3 total, 2 left), NOT sibling's (10 left or 15 total)
    expect(screen.getByText(/1 used \/ 3 total/i)).toBeInTheDocument();
    expect(screen.getByText(/2 left/i)).toBeInTheDocument();
    expect(screen.queryByText(/15 total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/10 left/i)).not.toBeInTheDocument();
  });

  it("5. a matching member with an empty entitlement list does not fall back to the aggregate pool", () => {
    const emptyMemberEntitlementsSub: Subscription = {
      id: "sub-empty-member",
      subscriptionCode: "SUB-EMPTY-MEM",
      organizationId: "org-1",
      customerId: "cust-parent",
      payerCustomerId: "cust-parent",
      price: 4000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [
        {
          serviceId: "srv-1",
          serviceName: "Haircut",
          totalQuantity: 20,
          usedQuantity: 0,
          remainingQuantity: 20,
        },
      ],
      members: [
        {
          customerId: "cust-1",
          status: "active",
          entitlements: [], // Explicitly empty
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [emptyMemberEntitlementsSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Must show explicit empty member state, NOT 20 remaining from root pool
    expect(
      screen.getByText(/No service entitlements allocated for this member/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/20 remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/20 left/i)).not.toBeInTheDocument();
    // Quick Redeem should not be rendered
    expect(screen.queryByRole("button", { name: /Quick Redeem/i })).not.toBeInTheDocument();
  });

  it("6. payer and member filters and counts handle overlapping relationships correctly", () => {
    const overlappingSub: Subscription = {
      id: "sub-overlap",
      subscriptionCode: "SUB-OVERLAP",
      organizationId: "org-1",
      customerId: "cust-1",
      payerCustomerId: "cust-1",
      price: 3000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [],
      members: [
        {
          customerId: "cust-1",
          status: "active",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 5,
              usedQuantity: 0,
              remainingQuantity: 5,
            },
          ],
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [overlappingSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Since customer is both payer and member:
    // Payer count should be 1
    // Beneficiary/Member count should also be 1
    const payerTab = screen.getAllByRole("button", {
      name: /Purchased as Payer/i,
    })[0];
    const beneficiaryTab = screen.getAllByRole("button", {
      name: /Beneficiary Entitlements/i,
    })[0];

    expect(payerTab).toHaveTextContent("1");
    expect(beneficiaryTab).toHaveTextContent("1");

    // Switching to Payer tab shows the card
    fireEvent.click(payerTab);
    expect(screen.getByText("SUB-OVERLAP")).toBeInTheDocument();

    // Switching to Beneficiary tab also shows the card (not excluded!)
    fireEvent.click(beneficiaryTab);
    expect(screen.getByText("SUB-OVERLAP")).toBeInTheDocument();
  });

  it("7. does not allow redemption when member status is exhausted or cancelled", () => {
    const exhaustedMemberSub: Subscription = {
      id: "sub-exhausted",
      subscriptionCode: "SUB-EXHAUSTED",
      organizationId: "org-1",
      customerId: "cust-parent",
      payerCustomerId: "cust-parent",
      price: 2000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [],
      members: [
        {
          customerId: "cust-1",
          status: "exhausted",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 5,
              usedQuantity: 5,
              remainingQuantity: 0,
            },
          ],
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [exhaustedMemberSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Shows Member exhausted badge
    expect(screen.getByText("Member exhausted")).toBeInTheDocument();
    // Quick Redeem should be disabled / not rendered for exhausted member
    expect(screen.queryByRole("button", { name: /Quick Redeem/i })).not.toBeInTheDocument();
  });

  it("8. payer-only customer who is not enrolled as a member cannot Quick Redeem personal entitlements", () => {
    const payerOnlySub: Subscription = {
      id: "sub-payer-only-multi",
      subscriptionCode: "SUB-FAMILY-PAYER",
      organizationId: "org-1",
      customerId: "cust-1",
      payerCustomerId: "cust-1",
      price: 10000,
      status: "active",
      paymentStatus: "paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [
        {
          serviceId: "srv-1",
          serviceName: "Haircut",
          totalQuantity: 10,
          usedQuantity: 0,
          remainingQuantity: 10,
        },
      ],
      members: [
        {
          customerId: "cust-beneficiary-1",
          status: "active",
          entitlements: [
            {
              serviceId: "srv-1",
              serviceName: "Haircut",
              totalQuantity: 10,
              usedQuantity: 0,
              remainingQuantity: 10,
            },
          ],
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [payerOnlySub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Payer Role badge is present
    expect(screen.getByText("Payer Role")).toBeInTheDocument();
    // Does NOT render Quick Redeem for personal use
    expect(screen.queryByRole("button", { name: /Quick Redeem/i })).not.toBeInTheDocument();
    // Displays informative notice that payer has no personal entitlements
    expect(
      screen.getByText(/Payer account: no personal member service entitlements assigned/i),
    ).toBeInTheDocument();
  });

  it("9. allows redemption for active and pending_payment subscriptions when member has remaining entitlements", () => {
    const pendingPaymentSub: Subscription = {
      id: "sub-pending-pay",
      subscriptionCode: "SUB-PENDING-PAY",
      organizationId: "org-1",
      customerId: "cust-1",
      payerCustomerId: "cust-1",
      price: 3000,
      status: "pending_payment",
      paymentStatus: "partially_paid",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      permittedBranchIds: [],
      entitlements: [],
      members: [
        {
          customerId: "cust-1",
          status: "pending_payment",
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
    };

    vi.spyOn(subHooks, "useSubscriptions").mockReturnValue({
      data: {
        data: [pendingPaymentSub],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof subHooks.useSubscriptions>);

    render(<CustomerSubscriptionsTab customerId="cust-1" />);

    // Pending payment subscription allows redemption per business rules
    expect(screen.getByRole("button", { name: /Quick Redeem/i })).toBeInTheDocument();
  });
});
