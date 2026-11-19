import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SellMembershipDialog } from "../components/SellMembershipDialog";
import type { MembershipPlan } from "../types/membership.types";

afterEach(cleanup);

// Mock CustomerSelector
vi.mock("@/features/customers/components/CustomerSelector", () => ({
  CustomerSelector: ({ value, onChange }: { value: string; onChange: (id: string, cust?: any) => void }) => (
    <div data-testid="customer-selector">
      <input
        data-testid="customer-input"
        value={value}
        onChange={(e) => onChange(e.target.value, { id: e.target.value, name: `Customer ${e.target.value}` })}
      />
      <button
        type="button"
        data-testid="select-cust-btn-1"
        onClick={() => onChange("cust-test-1", { id: "cust-test-1", name: "Customer Test 1" })}
      >
        Select Cust 1
      </button>
      <button
        type="button"
        data-testid="select-cust-btn-2"
        onClick={() => onChange("cust-test-2", { id: "cust-test-2", name: "Customer Test 2" })}
      >
        Select Cust 2
      </button>
      <button
        type="button"
        data-testid="select-cust-btn-3"
        onClick={() => onChange("cust-test-3", { id: "cust-test-3", name: "Customer Test 3" })}
      >
        Select Cust 3
      </button>
      <button
        type="button"
        data-testid="select-cust-btn-4"
        onClick={() => onChange("cust-test-4", { id: "cust-test-4", name: "Customer Test 4" })}
      >
        Select Cust 4
      </button>
    </div>
  ),
}));

// Mock StaffAttributionSelect
vi.mock("@/features/employees/components/StaffAttributionSelect", () => ({
  StaffAttributionSelect: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <div data-testid="staff-attribution-select">
      <input
        data-testid="staff-attribution-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

// Mock BranchContext
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({ currentBranchId: "branch-1" }),
}));

// Mock useBranches
vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: () => ({
    branches: [
      { id: "branch-1", name: "Koramangala Flagship" },
      { id: "branch-2", name: "Indiranagar Salon" },
    ],
    isLoading: false,
  }),
}));

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock useServiceCategories and useServices
vi.mock("@/features/services/hooks/categories/useServiceCategories", () => ({
  useServiceCategories: () => ({
    data: { data: [{ id: "cat-1", name: "Hair Care" }] },
    isLoading: false,
  }),
}));

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: { data: [{ id: "srv-1", name: "Hair Spa", isActive: true }] },
    isLoading: false,
  }),
}));

// Mock customer API
vi.mock("@/features/customers/api/customers.api", () => ({
  getCustomer: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({ id, name: `Customer ${id}`, phone: "9876543210" }),
  ),
}));

const mockSinglePlan: MembershipPlan = {
  id: "plan-single-1",
  organizationId: "org-1",
  name: "Individual Basic Plan",
  price: 999,
  validityMonths: 12,
  tier: "Silver",
  maxBeneficiaries: 1, // Default exactly 1
  benefits: {
    serviceDiscountPercentage: 10,
    productDiscountPercentage: 5,
    complimentaryPerks: ["Free Refreshment"],
  },
  isActive: true,
};

const mockFamilyPlan: MembershipPlan = {
  id: "plan-family-4",
  organizationId: "org-1",
  name: "Family VIP Plan (4 Members)",
  price: 4999,
  validityMonths: 12,
  tier: "VIP",
  maxBeneficiaries: 4, // Multi-member capacity = 4
  benefits: {
    serviceDiscountPercentage: 20,
    productDiscountPercentage: 10,
    complimentaryPerks: ["VIP Drink", "Priority Booking"],
  },
  isActive: true,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SellMembershipDialog - Canonical Single Source of Truth & UX Parity", () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Default plan allows exactly one beneficiary and indicates 1 max capacity", () => {
    renderWithClient(
      <SellMembershipDialog
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
        plans={[mockSinglePlan]}
        selectedPlanId="plan-single-1"
        initialCustomerId="cust-test-1"
      />,
    );

    // Initial purchaser is enrolled as primary beneficiary
    expect(screen.getByText(/Capacity Reached \(1\/1\)/i)).toBeInTheDocument();
  });

  it("2. Plan with capacity four allows adding up to four beneficiaries and displays remaining slots", async () => {
    renderWithClient(
      <SellMembershipDialog
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
        plans={[mockFamilyPlan]}
        selectedPlanId="plan-family-4"
        initialCustomerId="cust-test-1"
      />,
    );

    // Initial: 1 of 4 added, 3 slots remaining
    expect(screen.getByText(/3 slots remaining/i)).toBeInTheDocument();

    // Add Member 2
    const addMemberInputs2 = screen.getAllByTestId("select-cust-btn-2");
    fireEvent.click(addMemberInputs2[1]);

    await waitFor(() => {
      expect(screen.getByText(/2 slots remaining/i)).toBeInTheDocument();
    });

    // Add Member 3
    const addMemberInputs3 = screen.getAllByTestId("select-cust-btn-3");
    fireEvent.click(addMemberInputs3[1]);

    await waitFor(() => {
      expect(screen.getByText(/1 slot remaining/i)).toBeInTheDocument();
    });

    // Add Member 4
    const addMemberInputs4 = screen.getAllByTestId("select-cust-btn-4");
    fireEvent.click(addMemberInputs4[1]);

    await waitFor(() => {
      expect(screen.getByText(/Capacity Reached \(4\/4\)/i)).toBeInTheDocument();
    });

    // 4. Adding a fifth member is prevented when capacity is four
    expect(
      screen.getByText(/Maximum member limit of 4 reached/i),
    ).toBeInTheDocument();
  });

  it("5. Duplicate customer selection is prevented", async () => {
    renderWithClient(
      <SellMembershipDialog
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
        plans={[mockFamilyPlan]}
        selectedPlanId="plan-family-4"
        initialCustomerId="cust-test-1"
      />,
    );

    // Try adding cust-test-1 again
    const addMemberInputs1 = screen.getAllByTestId("select-cust-btn-1");
    fireEvent.click(addMemberInputs1[1]);

    // Slots remaining still 3
    expect(screen.getByText(/3 slots remaining/i)).toBeInTheDocument();
  });

  it("6. Removing a member does not affect other members", async () => {
    renderWithClient(
      <SellMembershipDialog
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
        plans={[mockFamilyPlan]}
        selectedPlanId="plan-family-4"
        initialCustomerId="cust-test-1"
      />,
    );

    // Add Member 2
    const addMemberInputs2 = screen.getAllByTestId("select-cust-btn-2");
    fireEvent.click(addMemberInputs2[1]);

    await waitFor(() => {
      expect(screen.getByText(/2 slots remaining/i)).toBeInTheDocument();
    });

    // Remove Member 2
    const removeButtons = screen.getAllByTitle("Remove Member");
    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/3 slots remaining/i)).toBeInTheDocument();
    });
  });

  it("7. Individual benefit changes do not leak to other members and Step 2 displays exact configured benefits", async () => {
    renderWithClient(
      <SellMembershipDialog
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isLoading={false}
        plans={[mockFamilyPlan]}
        selectedPlanId="plan-family-4"
        initialCustomerId="cust-test-1"
      />,
    );

    // Add Member 2
    const addMemberInputs2 = screen.getAllByTestId("select-cust-btn-2");
    fireEvent.click(addMemberInputs2[1]);

    await waitFor(() => {
      expect(screen.getByText(/2 slots remaining/i)).toBeInTheDocument();
    });

    // Tailor Perks for Member 2
    const tailorButtons = screen.getAllByRole("button", { name: /tailor perks/i });
    fireEvent.click(tailorButtons[1]); // open second member's editor

    // Modify Member 2's service discount
    const discountInputs = screen.getAllByDisplayValue("20");
    fireEvent.change(discountInputs[0], { target: { value: "35" } });

    // Step 1 check: Customized Perks badge shown
    expect(screen.getByText(/Customized Perks/i)).toBeInTheDocument();

    // Proceed to Step 2
    const nextButton = screen.getByRole("button", { name: /next: review & payment/i });
    fireEvent.click(nextButton);

    // Step 2 assertions:
    // 8. Step 2 displays the exact beneficiaries configured in Step 1
    expect(screen.getByText(/Subscription Review & Privilege Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 4 member slots enrolled/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tailored Perks/i).length).toBeGreaterThan(0);

    // 9. Step 2 contains NO duplicate member-creation or maximum-member controls
    expect(screen.queryByText(/Add Member to Membership:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Select or Build Plan/i)).not.toBeInTheDocument();

    // 10. Back navigation preserves every member and benefit override
    const backButton = screen.getByRole("button", { name: /back to edit members/i });
    fireEvent.click(backButton);

    expect(screen.getByText(/2 slots remaining/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Customized Perks/i).length).toBeGreaterThan(0);
  });
});
