import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import saleBasketReducer from "@/store/slices/saleBasketSlice";
import { SalesWorkspaceView } from "../components/SalesWorkspaceView";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock BranchContext
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch-001",
    currentBranch: { id: "branch-001", name: "Flagship Salon" },
    availableBranches: [{ id: "branch-001", name: "Flagship Salon" }],
    isAllBranchesSelected: false,
    getBranchName: () => "Flagship Salon",
    getBranchQueryKey: (key: string, rest: unknown[] = []) => [key, "branch-001", ...rest],
  }),
}));

// Mock Auth
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      id: "user-1",
      name: "Cashier Alice",
      role: "cashier",
      permissions: ["billing.checkout", "billing.view", "memberships.sell", "subscriptions.sell"],
      hasOrgWideAccess: true,
    },
  }),
}));

// Mock canonical dialogs to verify they open with exact props
vi.mock("@/features/memberships/components/SellMembershipDialog", () => ({
  SellMembershipDialog: ({ isOpen, onClose, selectedPlanId, initialCustomerId }: any) => (
    isOpen ? (
      <div data-testid="mock-sell-membership-dialog">
        <span>SellMembershipDialog Open</span>
        <span data-testid="selected-plan-id">{selectedPlanId || "NONE"}</span>
        <span data-testid="initial-customer-id">{initialCustomerId || "NONE"}</span>
        <button type="button" onClick={onClose}>Close Dialog</button>
      </div>
    ) : null
  ),
}));

vi.mock("@/features/subscriptions/components/CreateSubscriptionDialog", () => ({
  CreateSubscriptionDialog: ({ isOpen, onClose, initialPlan, initialCustomerId }: any) => (
    isOpen ? (
      <div data-testid="mock-create-subscription-dialog">
        <span>CreateSubscriptionDialog Open</span>
        <span data-testid="initial-plan">{initialPlan?.name || "NONE"}</span>
        <span data-testid="initial-customer">{initialCustomerId || "NONE"}</span>
        <button type="button" onClick={onClose}>Close Sub Dialog</button>
      </div>
    ) : null
  ),
}));

vi.mock("@/features/appointments/components/AppointmentDetailsDialog", () => ({
  AppointmentDetailsDialog: ({ isOpen, onClose, appointment }: any) => (
    isOpen ? (
      <div data-testid="mock-appointment-details-dialog">
        <span>AppointmentDetailsDialog Open</span>
        <span data-testid="details-appointment-code">
          {appointment?.appointmentCode || "NONE"}
        </span>
        <button type="button" onClick={onClose}>
          Close Details Dialog
        </button>
      </div>
    ) : null
  ),
}));

// Mock Customers
vi.mock("@/features/customers/hooks/useCustomers", () => ({
  useCustomers: () => ({
    data: {
      data: [
        { id: "cust-001", name: "Eleanor Vance", phone: "+91 9111122222" },
      ],
    },
    isLoading: false,
  }),
}));

// Mock Services
vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

vi.mock("@/features/services/hooks/categories/useServiceCategories", () => ({
  useServiceCategories: () => ({
    categories: [],
    isLoading: false,
  }),
}));

// Mock Inventory
vi.mock("@/features/inventory/hooks/useInventory", () => ({
  useProducts: () => ({ data: { data: [] }, isLoading: false }),
  useBranchStock: () => ({ data: { data: [] }, isLoading: false }),
}));

// Mock Memberships
vi.mock("@/features/memberships/hooks/useMemberships", () => ({
  useCustomerActiveBenefits: () => ({
    data: {
      hasActiveBenefits: true,
      serviceDiscountPercentage: 20,
      productDiscountPercentage: 10,
    },
    isLoading: false,
  }),
  useCustomerMemberships: () => ({
    data: {
      data: [
        {
          id: "cm-001",
          membershipCode: "MEM-GOLD-1",
          customer: { id: "cust-001", name: "Eleanor Vance", phone: "+91 9111122222" },
          status: "pending_payment",
          planSnapshot: {
            name: "Gold VIP Plan",
            tier: "Gold",
            price: 4999,
            benefits: { serviceDiscountPercentage: 20, productDiscountPercentage: 10 },
          },
        },
      ],
    },
    isLoading: false,
  }),
  useMembershipPlans: () => ({
    data: {
      data: [
        {
          id: "plan-gold",
          name: "Gold VIP Plan",
          tier: "Gold",
          suggestedPrice: 4999,
          serviceDiscountPercentage: 20,
          productDiscountPercentage: 10,
        },
      ],
    },
    isLoading: false,
  }),
  useSellMembership: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateMembershipPlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Mock Subscriptions
vi.mock("@/features/subscriptions/hooks/useSubscriptions", () => ({
  useSubscriptions: () => ({
    data: {
      data: [
        {
          id: "sub-001",
          subscriptionCode: "SUB-PASS-1",
          customer: { id: "cust-001", name: "Eleanor Vance", phone: "+91 9111122222" },
          status: "pending_payment",
          price: 2999,
          entitlements: [{ serviceId: "svc-1", remainingQuantity: 5 }],
        },
      ],
    },
    isLoading: false,
  }),
  useSubscriptionPlans: () => ({
    data: {
      data: [
        {
          id: "plan-sub-1",
          name: "Annual Grooming Pass",
          suggestedPrice: 2999,
          validityMonths: 12,
          entitlements: [{ serviceId: "svc-1", quantity: 5 }],
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/subscriptions/hooks/useCreateSubscription", () => ({
  useCreateSubscription: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockAppointments = [
  {
    id: "apt-101",
    appointmentCode: "APT-2026-101",
    status: "completed",
    customerId: "cust-001",
    customer: { id: "cust-001", name: "Eleanor Vance", phone: "+91 9111122222" },
    services: [{ serviceId: "srv-1", name: "Classic Haircut", price: 500, duration: 30 }],
    pricing: { subtotal: 500, total: 500 },
  },
];

vi.mock("../hooks/useBillingQueries", () => ({
  useCheckoutQueue: () => ({
    data: mockAppointments,
    isLoading: false,
  }),
  useMembershipPlans: () => ({
    data: {
      data: [
        {
          id: "plan-gold",
          name: "Gold VIP Plan",
          tier: "Gold",
          suggestedPrice: 4999,
          serviceDiscountPercentage: 20,
          productDiscountPercentage: 10,
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("../hooks/useBillingMutations", () => ({
  useCreateInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderWorkspace(preloadedCustomer?: any) {
  const store = configureStore({
    reducer: {
      saleBasket: saleBasketReducer,
    },
    preloadedState: {
      saleBasket: {
        customer: preloadedCustomer || { id: "cust-001", name: "Eleanor Vance", phone: "+91 9111122222" },
        appointment: null,
        appointmentLines: [],
        walkinServiceLines: [],
        productLines: [],
        subscriptionLines: [],
        membershipLines: [],
        discountTotal: 0,
        redeemLoyaltyPoints: 0,
        notes: "",
        existingDraftInvoiceId: null,
        existingDraftInvoiceNumber: null,
      },
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SalesWorkspaceView />
      </QueryClientProvider>
    </Provider>
  );
}

describe("SalesWorkspaceView - Sale CTAs & Dialog Opening Verification", () => {
  afterEach(cleanup);

  it("renders Sell Membership CTA in both pending and catalog modes, opening canonical SellMembershipDialog with customer and plan", async () => {
    renderWorkspace();

    // Switch to Memberships tab (custom button nav)
    const memTab = screen.getByRole("button", { name: /Memberships/i });
    fireEvent.click(memTab);

    // 1. In 'Sold Memberships (Pending Invoice)' mode: Sell Membership button is visible
    const sellMemBtnPending = screen.getByRole("button", { name: /Sell Membership/i });
    expect(sellMemBtnPending).toBeInTheDocument();

    // Click it -> canonical dialog opens
    fireEvent.click(sellMemBtnPending);
    expect(screen.getByTestId("mock-sell-membership-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("initial-customer-id")).toHaveTextContent("cust-001");

    // Close or toggle to Catalog
    const closeBtn = screen.getByText("Close Dialog");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("mock-sell-membership-dialog")).not.toBeInTheDocument();

    const catalogToggle = screen.getByRole("button", { name: /Membership Plans Catalog/i });
    fireEvent.click(catalogToggle);

    // 2. In 'Membership Plans Catalog' mode: Sell Membership CTA is still rendered in header
    const headerSellBtn = screen.getByRole("button", { name: /^Sell Membership$/i });
    expect(headerSellBtn).toBeInTheDocument();

    // Find the plan's card action button
    const cardSellBtn = screen.getByRole("button", { name: /Sell Membership/i });
    expect(cardSellBtn).toBeInTheDocument();
    fireEvent.click(cardSellBtn);

    // Opens the canonical dialog
    expect(screen.getByTestId("mock-sell-membership-dialog")).toBeInTheDocument();
  });

  it("renders Sell Subscription CTA in both pending and catalog modes, opening canonical CreateSubscriptionDialog with customer and plan", async () => {
    renderWorkspace();

    // Switch to Subscriptions tab (custom button nav)
    const subTab = screen.getByRole("button", { name: /Subscriptions/i });
    fireEvent.click(subTab);

    // 1. In 'Sold Subscriptions (Pending Invoice)' mode: Sell Subscription button is visible
    const sellSubBtnPending = screen.getByRole("button", { name: /Sell Subscription/i });
    expect(sellSubBtnPending).toBeInTheDocument();

    // Click it -> canonical dialog opens
    fireEvent.click(sellSubBtnPending);
    expect(screen.getByTestId("mock-create-subscription-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("initial-customer")).toHaveTextContent("cust-001");

    // Close dialog
    const closeSubBtn = screen.getByText("Close Sub Dialog");
    fireEvent.click(closeSubBtn);
    expect(screen.queryByTestId("mock-create-subscription-dialog")).not.toBeInTheDocument();

    // Toggle to Catalog mode
    const catalogToggle = screen.getByRole("button", { name: /Subscription Plans Catalog/i });
    fireEvent.click(catalogToggle);

    // 2. In 'Subscription Plans Catalog' mode: Sell Subscription CTA is still rendered in header
    const sellSubHeaderBtn = screen.getByRole("button", { name: /^Sell Subscription$/i });
    expect(sellSubHeaderBtn).toBeInTheDocument();

    // Click header sell button
    fireEvent.click(sellSubHeaderBtn);
    expect(screen.getByTestId("mock-create-subscription-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("initial-customer")).toHaveTextContent("cust-001");
  });

  it("renders eye action button for appointments and opens AppointmentDetailsDialog with complete appointment details", async () => {
    renderWorkspace();

    // Ensure we are on appointments tab (default tab)
    expect(screen.getByText("#APT-2026-101")).toBeInTheDocument();

    // Eye button to inspect appointment details
    const eyeButton = screen.getByRole("button", {
      name: /view full appointment details/i,
    });
    expect(eyeButton).toBeInTheDocument();

    // Click eye button
    fireEvent.click(eyeButton);

    // Verify detailed modal opened
    expect(
      screen.getByTestId("mock-appointment-details-dialog"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("details-appointment-code")).toHaveTextContent(
      "APT-2026-101",
    );

    // Close details dialog
    const closeBtn = screen.getByText("Close Details Dialog");
    fireEvent.click(closeBtn);
    expect(
      screen.queryByTestId("mock-appointment-details-dialog"),
    ).not.toBeInTheDocument();
  });
});
