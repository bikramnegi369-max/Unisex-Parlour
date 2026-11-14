import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";

// Mock dependencies
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch_main_1",
    getBranchQueryKey: (key: string, rest: unknown[]) => [key, "branch_main_1", ...rest],
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: "user_1", role: "cashier", permissions: ["billing.create", "services.view"], hasOrgWideAccess: false },
  }),
}));

vi.mock("@/features/customers/hooks/useCustomers", () => ({
  useCustomers: () => ({
    data: {
      data: [
        { id: "cust_1", name: "Diana Prince", phone: "+919999988888", loyaltyPoints: 200 },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/customers/hooks/useCustomer", () => ({
  useCustomer: () => ({
    data: { id: "cust_1", name: "Diana Prince", phone: "+919999988888", loyaltyPoints: 200 },
    isLoading: false,
  }),
}));

vi.mock("@/features/loyalty/hooks/useLoyaltyQueries", () => ({
  useRedemptionPreview: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: {
      data: [
        { id: "srv_fac", name: "Hydra Facial", duration: 45, pricing: { basePrice: 1000 } },
        { id: "srv_mas", name: "Aromatherapy Massage", duration: 60, pricing: { basePrice: 2000 } },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/subscriptions/hooks/useSubscriptionPlans", () => ({
  useSubscriptionPlans: () => ({
    data: {
      data: [
        {
          id: "sub_plan_5",
          name: "Hydra Facial 5-Session Pack",
          suggestedPrice: 4500,
          entitlements: [{ serviceId: "srv_fac", quantity: 5 }],
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("../hooks/useBillingQueries", () => ({
  useMembershipPlans: () => ({
    data: [
      {
        id: "mem_gold",
        _id: "mem_gold",
        name: "VIP Gold",
        tier: "Gold",
        price: 2999,
        benefits: {
          serviceDiscountPercentage: 15,
          productDiscountPercentage: 10,
        },
      },
    ],
    isLoading: false,
  }),
}));

const mockCreateInvoice = vi.fn().mockResolvedValue({ id: "inv_123", invoiceNumber: "INV-2026-0099" });

vi.mock("../hooks/useBillingMutations", () => ({
  useCreateInvoice: () => ({
    mutateAsync: mockCreateInvoice,
    isPending: false,
  }),
}));

function renderComponent(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateInvoiceDialog
        isOpen={true}
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("UnifiedCheckoutDialog (CreateInvoiceDialog Unified Engine)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders walk-in unified checkout mode with catalog tabs", () => {
    renderComponent();

    expect(screen.getByText("Unified POS Checkout")).toBeDefined();
    expect(screen.getByText(/Select Customer \(Walk-in Unified Checkout\)/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Products/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Services/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Packages/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Memberships/i })).toBeDefined();
  });

  it("adds a walk-in service and updates estimated totals in real time", async () => {
    renderComponent();

    // Switch to Services tab
    const tabs = screen.getAllByRole("button", { name: /Services/i });
    fireEvent.click(tabs[0]);

    const serviceSelects = document.body.querySelectorAll("select");
    const serviceSelect = serviceSelects[1]; // 0 is customer, 1 is service catalog
    fireEvent.change(serviceSelect, { target: { value: "srv_mas" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));

    expect(screen.getByText("Aromatherapy Massage")).toBeDefined();
    expect(screen.getAllByText("₹2,000.00").length).toBeGreaterThanOrEqual(1);
  });

  it("adds a membership plan and displays live in-flight tier discount preview", async () => {
    const { unmount } = renderComponent();

    // 1. Add Service
    const svcTabs = screen.getAllByRole("button", { name: /Services/i });
    fireEvent.click(svcTabs[0]);
    const serviceSelect = document.body.querySelectorAll("select")[1];
    fireEvent.change(serviceSelect, { target: { value: "srv_mas" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));

    // 2. Add Membership Plan
    const memTabs = screen.getAllByRole("button", { name: /Memberships/i });
    fireEvent.click(memTabs[0]);
    const memSelect = screen.getByDisplayValue(/Select membership tier plan/i);
    fireEvent.change(memSelect, { target: { value: "mem_gold" } });
    fireEvent.click(screen.getByRole("button", { name: /Enroll Membership/i }));

    expect(screen.getByText(/VIP Gold — Gold Tier Plan/i)).toBeDefined();

    // 15% discount preview on ₹2,000 massage = ₹300 discount
    expect(screen.getByText(/Membership Tier Discount Preview \(Gold\)/i)).toBeDefined();
    expect(screen.getByText("-₹300.00")).toBeDefined();

    // Subtotal: 2000 (svc) + 2999 (mem) = 4999
    // Estimated Payable: 4999 - 300 = 4699
    expect(screen.getByText("₹4,699.00")).toBeDefined();
    unmount();
  });

  it("submits 4-in-1 multi-line unified payload matching backend contract", async () => {
    const { unmount } = renderComponent();

    // Select customer
    const custSelect = screen.getByDisplayValue(/Choose registered customer/i);
    fireEvent.change(custSelect, { target: { value: "cust_1" } });

    // Add service
    const svcTabs = screen.getAllByRole("button", { name: /Services/i });
    fireEvent.click(svcTabs[0]);
    const svcSelect = screen.getByDisplayValue(/Select service catalog item/i);
    fireEvent.change(svcSelect, { target: { value: "srv_mas" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Service/i }));

    // Add membership
    const memTabs = screen.getAllByRole("button", { name: /Memberships/i });
    fireEvent.click(memTabs[0]);
    const memSelect = screen.getByDisplayValue(/Select membership tier plan/i);
    fireEvent.change(memSelect, { target: { value: "mem_gold" } });
    fireEvent.click(screen.getByRole("button", { name: /Enroll Membership/i }));

    // Add subscription
    const pkgTabs = screen.getAllByRole("button", { name: /Packages/i });
    fireEvent.click(pkgTabs[0]);
    const subSelect = screen.getByDisplayValue(/Select subscription package/i);
    fireEvent.change(subSelect, { target: { value: "sub_plan_5" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Package/i }));

    // Submit
    const genBtn = screen.getByRole("button", { name: /Generate Draft Invoice/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: "branch_main_1",
          customerId: "cust_1",
          serviceLines: [{ serviceId: "srv_mas", quantity: 1 }],
          membershipLines: [{ membershipPlanId: "mem_gold", quantity: 1 }],
          subscriptionLines: [{ planId: "sub_plan_5" }],
        })
      );
    });
    unmount();
  });
});
