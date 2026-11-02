// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { CreateSubscriptionDialog } from "../components/CreateSubscriptionDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Customer } from "@/features/customers/types/customer.types";
import type { Service } from "@/features/services/types/service.types";

const createMockCustomer = (id: string, name: string): Customer => ({
  id,
  name,
  phone: "9876543210",
  organizationId: "org_1",
  homeBranchId: "branch_main",
  visitedBranchIds: ["branch_main"],
  loyaltyPoints: 0,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockService = (
  id: string,
  name: string,
  code: string,
  basePrice: number,
): Service => ({
  id,
  name,
  code,
  categoryId: "cat_1",
  duration: 30,
  basePrice,
  displayOrder: 1,
  gender: "unisex",
  isActive: true,
  branchId: "branch_main",
  organizationId: "org_1",
});

// Mock CustomerSelector to simplify selection testing
vi.mock("@/features/customers/components/CustomerSelector", () => ({
  CustomerSelector: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (id: string, customer?: Customer) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="mock-customer-selector">
      <input
        data-testid="customer-selector-input"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          const mockCustomer = createMockCustomer(
            val,
            val === "cust_payer" ? "Alice Payer" : "Bob Beneficiary",
          );
          onChange(val, mockCustomer);
        }}
      />
      <button
        type="button"
        data-testid="select-payer-btn"
        onClick={() => {
          const c = createMockCustomer("cust_payer", "Alice Payer");
          onChange("cust_payer", c);
        }}
      >
        Select Payer
      </button>
      <button
        type="button"
        data-testid="select-beneficiary-btn"
        onClick={() => {
          const c = createMockCustomer(
            "cust_beneficiary_2",
            "Charlie Beneficiary",
          );
          onChange("cust_beneficiary_2", c);
        }}
      >
        Select Charlie
      </button>
    </div>
  ),
}));

// Mock services hook with a catalog of services
const mockServices: Service[] = [
  createMockService("srv_haircut", "Classic Haircut", "HC-01", 500),
  createMockService("srv_facial", "Gold Facial", "FC-01", 1500),
  createMockService("srv_massage", "Deep Tissue Massage", "MS-01", 2000),
];

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: { data: mockServices },
    isLoading: false,
  }),
}));

vi.mock("@/features/services/hooks/categories/useServiceCategories", () => ({
  useServiceCategories: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

vi.mock("../hooks/useSubscriptionPlans", () => ({
  useSubscriptionPlans: () => ({
    data: { data: [] },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch_main",
    currentBranch: { id: "branch_main", name: "Main Branch" },
    availableBranches: [{ id: "branch_main", name: "Main Branch" }],
    isAllBranchesSelected: false,
    getBranchQueryKey: vi.fn(),
  }),
}));

describe("CreateSubscriptionDialog - Member-Specific Entitlements", () => {
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

  const renderDialog = (props: {
    isOpen?: boolean;
    onSubmit?: ReturnType<typeof vi.fn>;
    isLoading?: boolean;
    initialCustomerId?: string;
  }) => {
    const onSubmit = props.onSubmit || vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const utils = render(
      <QueryClientProvider client={queryClient}>
        <CreateSubscriptionDialog
          isOpen={props.isOpen ?? true}
          onClose={onClose}
          onSubmit={onSubmit}
          isLoading={props.isLoading ?? false}
          initialCustomerId={props.initialCustomerId}
          branchId="branch_main"
        />
      </QueryClientProvider>,
    );

    return { ...utils, onSubmit, onClose };
  };

  it("submits canonical single-member payload with members array containing 1 element", async () => {
    const { onSubmit } = renderDialog({ initialCustomerId: "cust_payer" });

    // Set price via placeholder
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "1200" } });

    // Open service dropdown & add Haircut
    const serviceDropdownTrigger = screen.getByText(
      /Search & add services by category/i,
    );
    fireEvent.click(serviceDropdownTrigger);

    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Submit form
    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.payerCustomerId).toBe("cust_payer");
    expect(payload.customerId).toBe("cust_payer");
    expect(payload.price).toBe(1200);

    // Verify canonical single-member representation: members array with 1 entry
    expect(payload.members).toHaveLength(1);
    expect(payload.members[0]).toEqual({
      customerId: "cust_payer",
      permittedBranchIds: [],
      notes: undefined,
      entitlements: [
        {
          serviceId: "srv_haircut",
          quantity: 1,
        },
      ],
    });
    // Dual compatibility entitlements matches members[0]
    expect(payload.entitlements).toEqual([
      {
        serviceId: "srv_haircut",
        quantity: 1,
      },
    ]);
  });

  it("configures isolated independent entitlements for each beneficiary in multi-member mode", async () => {
    const { onSubmit } = renderDialog({ initialCustomerId: "cust_payer" });

    // Set agreed sale price
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "3500" } });

    // Switch to multi-member mode
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Allocate Haircut with quantity 2 to Payer
    const serviceDropdownTrigger = screen.getByText(
      /Search & add services by category/i,
    );
    fireEvent.click(serviceDropdownTrigger);
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    const qtyInputs = screen.getAllByRole("spinbutton");
    const sessionQtyInput = qtyInputs.find(
      (el) => el.getAttribute("step") === "1",
    );
    expect(sessionQtyInput).toBeDefined();
    fireEvent.change(sessionQtyInput!, { target: { value: "2" } });

    // Add second beneficiary: Charlie Beneficiary
    const selectCharlieBtn = screen.getAllByTestId("select-beneficiary-btn")[1];
    fireEvent.click(selectCharlieBtn);

    const addMemberBtn = screen.getByRole("button", { name: /Add Member/i });
    fireEvent.click(addMemberBtn);

    // Add Facial to Charlie with quantity 1
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const facialOption = await screen.findByText("Gold Facial");
    fireEvent.click(facialOption);

    // Submit form
    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.payerCustomerId).toBe("cust_payer");
    expect(payload.customerId).toBe("cust_payer");
    expect(payload.price).toBe(3500);

    // Verify multi-member canonical structure
    expect(payload.members).toHaveLength(2);

    // Member 1: Payer has 2 Classic Haircuts
    expect(payload.members[0]).toEqual({
      customerId: "cust_payer",
      permittedBranchIds: [],
      notes: undefined,
      entitlements: [
        {
          serviceId: "srv_haircut",
          quantity: 2,
        },
      ],
    });

    // Member 2: Charlie has 1 Gold Facial
    expect(payload.members[1]).toEqual({
      customerId: "cust_beneficiary_2",
      permittedBranchIds: [],
      notes: undefined,
      entitlements: [
        {
          serviceId: "srv_facial",
          quantity: 1,
        },
      ],
    });

    // Root-level entitlements is undefined for multi-member mode
    expect(payload.entitlements).toBeUndefined();
  });

  it("prevents submission if any member has empty entitlements", async () => {
    const { onSubmit } = renderDialog({ initialCustomerId: "cust_payer" });

    // Set agreed sale price
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "3500" } });

    // Switch to multi-member mode
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add service for Payer
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Add second beneficiary without giving them any services
    const selectCharlieBtn = screen.getAllByTestId("select-beneficiary-btn")[1];
    fireEvent.click(selectCharlieBtn);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    // Try to submit
    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    // Expect validation message and submission blocked
    await waitFor(() => {
      expect(
        screen.getByText(/Please configure at least one service entitlement/i),
      ).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cleans up member allocation completely when a member is removed", async () => {
    renderDialog({ initialCustomerId: "cust_payer" });

    // Switch to multi-member mode
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add second beneficiary
    const selectCharlieBtn = screen.getAllByTestId("select-beneficiary-btn")[1];
    fireEvent.click(selectCharlieBtn);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    // Allocate Facial to Charlie
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const facialOption = await screen.findByText("Gold Facial");
    fireEvent.click(facialOption);

    expect(screen.getByText("Gold Facial")).toBeDefined();

    // Remove Charlie
    const removeButtons = screen.getAllByTitle(/Remove Beneficiary/i);
    const removeCharlieBtn = removeButtons[removeButtons.length - 1];
    fireEvent.click(removeCharlieBtn);

    // Tab switches back to Payer, Gold Facial is not in Payer's tab
    expect(screen.queryByText("Gold Facial")).toBeNull();
  });
});
