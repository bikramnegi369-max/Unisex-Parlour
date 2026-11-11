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
import { EditSubscriptionDialog } from "../components/EditSubscriptionDialog";
import * as subscriptionsApi from "../api/subscriptions.api";
import type { Subscription } from "../types/subscription.types";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/subscriptions",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user_owner",
      name: "Owner",
      permissions: ["subscriptions.configure", "subscriptions.view"],
    },
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch_main",
    currentBranch: { id: "branch_main", name: "Main Branch" },
    availableBranches: [
      { id: "branch_main", name: "Main Branch" },
      { id: "branch_downtown", name: "Downtown Branch" },
      { id: "branch_uptown", name: "Uptown Branch" },
    ],
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

  it("configures custom member-level branch access independently from subscription branches", async () => {
    const onSubmit = vi.fn();
    renderDialog({ initialCustomerId: "cust_payer", onSubmit });

    // Switch to multi-member mode
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add service for Payer (inherits subscription branches)
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Add second beneficiary
    const selectCharlieBtn = screen.getAllByTestId("select-beneficiary-btn")[1];
    fireEvent.click(selectCharlieBtn);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    // Allocate Facial to Charlie
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const facialOption = await screen.findByText("Gold Facial");
    fireEvent.click(facialOption);

    // Switch Charlie to Custom Branches
    const customBranchesBtn = screen.getByRole("button", { name: /Custom Branches/i });
    fireEvent.click(customBranchesBtn);

    // Click Downtown branch in Charlie's custom branches list
    const downtownBranchButtons = screen.getAllByRole("button", { name: /Downtown Branch/i });
    fireEvent.click(downtownBranchButtons[0]);

    // Set agreed sale price
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "3000" } });

    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.members).toHaveLength(2);
    // Member 0 (Payer) has inherited branches (empty array defaults to all/subscription)
    expect(payload.members[0].customerId).toBe("cust_payer");
    expect(payload.members[0].permittedBranchIds).toEqual([]);
    // Member 1 (Charlie) has custom branch selection ["branch_downtown"]
    expect(payload.members[1].customerId).toBe("cust_beneficiary_2");
    expect(payload.members[1].permittedBranchIds).toEqual(["branch_downtown"]);
  });

  it("prunes beneficiary custom branch when operator removes it from subscription-level branches", async () => {
    const onSubmit = vi.fn();
    renderDialog({ initialCustomerId: "cust_payer", onSubmit });

    // 1. Select subscription-level branches: Main (A), Downtown (B), Uptown (C)
    // Click Main Branch
    const mainBranchBtns = screen.getAllByRole("button", { name: /Main Branch/i });
    fireEvent.click(mainBranchBtns[mainBranchBtns.length - 1]);
    // Click Downtown Branch
    const downtownBranchBtns = screen.getAllByRole("button", { name: /Downtown Branch/i });
    fireEvent.click(downtownBranchBtns[downtownBranchBtns.length - 1]);
    // Click Uptown Branch
    const uptownBranchBtns = screen.getAllByRole("button", { name: /Uptown Branch/i });
    fireEvent.click(uptownBranchBtns[uptownBranchBtns.length - 1]);

    // Switch to multi-member mode
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add service for Payer
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Add Charlie as beneficiary
    const selectCharlieBtn = screen.getAllByTestId("select-beneficiary-btn")[1];
    fireEvent.click(selectCharlieBtn);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    // Allocate Facial to Charlie
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const facialOption = await screen.findByText("Gold Facial");
    fireEvent.click(facialOption);

    // 2. Configure Charlie with Custom Branches: Main (A) & Downtown (B)
    const customBranchesBtn = screen.getByRole("button", { name: /Custom Branches/i });
    fireEvent.click(customBranchesBtn);

    // Charlie's custom branch options (rendered inside beneficiary panel)
    // Custom button click: Main Branch (already defaults to first if empty, select downtown as well)
    const charlieDowntownBtns = screen.getAllByRole("button", { name: /Downtown Branch/i });
    fireEvent.click(charlieDowntownBtns[0]); // toggle downtown

    // 3. Operator removes Downtown (B) from subscription-level branches
    const subDowntownBtn = screen.getAllByRole("button", { name: /Downtown Branch/i })[1];
    fireEvent.click(subDowntownBtn); // unselect downtown from subscription level

    // Set agreed sale price and submit
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "4000" } });

    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0];
    // Subscription-level permitted branches now only [Main, Uptown]
    expect(payload.permittedBranchIds).toContain("branch_main");
    expect(payload.permittedBranchIds).toContain("branch_uptown");
    expect(payload.permittedBranchIds).not.toContain("branch_downtown");

    // 4. Beneficiary Charlie's custom branches must have pruned Downtown (B), leaving only [Main]
    expect(payload.members[1].customerId).toBe("cust_beneficiary_2");
    expect(payload.members[1].permittedBranchIds).toEqual(["branch_main"]);
  });

  it("switching between Custom Branches and Same as Plan behaves cleanly without restoring invalid branches", async () => {
    const onSubmit = vi.fn();
    renderDialog({ initialCustomerId: "cust_payer", onSubmit });

    // Restrict plan to Main Branch and Uptown Branch
    const mainBranchBtns = screen.getAllByRole("button", { name: /Main Branch/i });
    fireEvent.click(mainBranchBtns[mainBranchBtns.length - 1]);

    // Switch to multi-member
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add service for Payer
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Switch Charlie to Custom Branches
    const customBranchesBtn = screen.getByRole("button", { name: /Custom Branches/i });
    fireEvent.click(customBranchesBtn);

    // Toggle back to "Same as Plan"
    const sameAsPlanBtn = screen.getByRole("button", { name: /Same as Plan/i });
    fireEvent.click(sameAsPlanBtn);

    // Set price & submit
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "2000" } });

    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0];
    // In inherited mode ("Same as Plan"), member permittedBranchIds serializes to [] per backend contract
    expect(payload.members[0].permittedBranchIds).toEqual([]);
  });

  it("proves that a beneficiary configured as inherited remains inherited ([]) even after subscription-level branches change", async () => {
    const onSubmit = vi.fn();
    renderDialog({ initialCustomerId: "cust_payer", onSubmit });

    // Switch to multi-member
    const multiMemberBtn = screen.getByRole("button", {
      name: /\+ Enable Family \/ Multi-Member/i,
    });
    fireEvent.click(multiMemberBtn);

    // Add service for Payer (who is in inherited mode by default)
    fireEvent.click(screen.getByText(/Search & add services by category/i));
    const haircutOption = await screen.findByText("Classic Haircut");
    fireEvent.click(haircutOption);

    // Verify Payer is in "Same as Plan" (inherited)
    expect(screen.getByRole("button", { name: /Same as Plan/i })).toBeDefined();

    // Change subscription-level branches: toggle Main Branch and Downtown Branch
    const mainBranchBtns = screen.getAllByRole("button", { name: /Main Branch/i });
    fireEvent.click(mainBranchBtns[mainBranchBtns.length - 1]);
    const downtownBranchBtns = screen.getAllByRole("button", { name: /Downtown Branch/i });
    fireEvent.click(downtownBranchBtns[0]);

    // Set price & submit
    const priceInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(priceInput, { target: { value: "3000" } });

    const submitBtn = screen.getByRole("button", {
      name: /Sell Subscription/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const payload = onSubmit.mock.calls[0][0];
    // Subscription level branches have both Main & Downtown
    expect(payload.permittedBranchIds).toContain("branch_main");
    expect(payload.permittedBranchIds).toContain("branch_downtown");

    // Inherited beneficiary still strictly serializes []
    expect(payload.members[0].permittedBranchIds).toEqual([]);
  });
});

describe("EditSubscriptionDialog & updateMemberBranchAccess API", () => {
  let queryClient: QueryClient;

  const mockSubscriptionWithMembers: Subscription = {
    id: "sub_100",
    subscriptionCode: "SUB-100",
    organizationId: "org_1",
    payerCustomerId: "cust_payer",
    customerId: "cust_payer",
    payer: { id: "cust_payer", name: "Alice Payer", phone: "9876543210" },
    customer: { id: "cust_payer", name: "Alice Payer", phone: "9876543210" },
    price: 5000,
    amountPaid: 5000,
    amountDue: 0,
    permittedBranchIds: ["branch_main", "branch_uptown"],
    status: "active",
    paymentStatus: "paid",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    members: [
      {
        customerId: "cust_payer",
        customer: { id: "cust_payer", name: "Alice Payer", phone: "9876543210" },
        status: "active",
        permittedBranchIds: [], // Inherited
        entitlements: [
          {
            serviceId: "srv_haircut",
            serviceName: "Classic Haircut",
            totalQuantity: 5,
            usedQuantity: 1,
            remainingQuantity: 4,
          },
        ],
      },
      {
        customerId: "cust_beneficiary_2",
        customer: { id: "cust_beneficiary_2", name: "Bob Beneficiary", phone: "9876543211" },
        status: "active",
        permittedBranchIds: ["branch_main"], // Custom
        entitlements: [
          {
            serviceId: "srv_facial",
            serviceName: "Gold Facial",
            totalQuantity: 2,
            usedQuantity: 0,
            remainingQuantity: 2,
          },
        ],
      },
    ],
    entitlements: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

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

  const renderEditDialog = (props?: {
    subscription?: Subscription;
    isLoading?: boolean;
  }) => {
    const sub = props?.subscription || mockSubscriptionWithMembers;
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const utils = render(
      <QueryClientProvider client={queryClient}>
        <EditSubscriptionDialog
          subscription={sub}
          isOpen={true}
          onClose={onClose}
          onSubmit={onSubmit}
          isLoading={props?.isLoading ?? false}
        />
      </QueryClientProvider>
    );

    return { ...utils, onClose, onSubmit };
  };

  it("loads existing beneficiary branch access correctly (inherited vs custom)", () => {
    renderEditDialog();

    // Alice is inherited by default
    expect(screen.getByRole("button", { name: /Same as Plan \(Inherited\)/i })).toBeDefined();

    // Select Bob from dropdown
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust_beneficiary_2" } });

    // Bob has custom branch access
    expect(screen.getByText(/Permitted Branches for Bob Beneficiary/i)).toBeDefined();
  });

  it("calls updateMemberBranchAccess with [] when switching from custom to inherited", async () => {
    const updateSpy = vi.spyOn(subscriptionsApi, "updateMemberBranchAccess").mockResolvedValue({
      ...mockSubscriptionWithMembers,
    });

    renderEditDialog();

    // Select Bob (who initially has custom branch_main)
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust_beneficiary_2" } });

    // Switch Bob to "Same as Plan"
    const inheritBtn = screen.getByRole("button", { name: /Same as Plan \(Inherited\)/i });
    fireEvent.click(inheritBtn);

    // Click Save Member Branch Access
    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("sub_100", "cust_beneficiary_2", []);
    });
  });

  it("calls updateMemberBranchAccess with selected branch IDs for custom access", async () => {
    const updateSpy = vi.spyOn(subscriptionsApi, "updateMemberBranchAccess").mockResolvedValue({
      ...mockSubscriptionWithMembers,
    });

    renderEditDialog();

    // Select Alice (currently inherited)
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust_payer" } });

    // Switch to Custom Branches
    const customBtn = screen.getByRole("button", { name: /Custom Branches/i });
    fireEvent.click(customBtn);

    // Pick Uptown Branch (allowed by plan [Main, Uptown])
    const uptownBtns = screen.getAllByRole("button", { name: /Uptown Branch/i });
    fireEvent.click(uptownBtns[uptownBtns.length - 1]);

    // Click Save Member Branch Access
    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("sub_100", "cust_payer", ["branch_uptown"]);
    });
  });

  it("parent branch removal prunes invalid custom selections for member", async () => {
    const updateSpy = vi.spyOn(subscriptionsApi, "updateMemberBranchAccess").mockResolvedValue({
      ...mockSubscriptionWithMembers,
    });

    renderEditDialog();

    // Select Bob (who has custom [branch_main])
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust_beneficiary_2" } });

    // Plan currently has [Main, Uptown]. Remove Main Branch from plan level!
    const planMainBtns = screen.getAllByRole("button", { name: /Main Branch/i });
    fireEvent.click(planMainBtns[0]); // Plan level button

    // Now save Bob's branch access
    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Main was removed from plan, so Bob's custom selection was pruned to []
      expect(updateSpy).toHaveBeenCalledWith("sub_100", "cust_beneficiary_2", []);
    });
  });

  it("updating one beneficiary does not alter another", async () => {
    const updateSpy = vi.spyOn(subscriptionsApi, "updateMemberBranchAccess").mockResolvedValue({
      ...mockSubscriptionWithMembers,
    });

    renderEditDialog();

    // Switch Bob to Uptown
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "cust_beneficiary_2" } });

    // Toggle Uptown
    const uptownBtns = screen.getAllByRole("button", { name: /Uptown Branch/i });
    fireEvent.click(uptownBtns[uptownBtns.length - 1]);

    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith("sub_100", "cust_beneficiary_2", [
        "branch_main",
        "branch_uptown",
      ]);
    });

    // Alice is untouched
    expect(mockSubscriptionWithMembers.members?.[0].permittedBranchIds).toEqual([]);
  });

  it("displays API error when updateMemberBranchAccess fails", async () => {
    const { toast } = await import("sonner");
    const toastSpy = vi.spyOn(toast, "error");

    vi.spyOn(subscriptionsApi, "updateMemberBranchAccess").mockRejectedValue({
      response: {
        data: {
          message: "Database connection failed",
        },
      },
    });

    renderEditDialog();

    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith("Database connection failed");
    });
  });

  it("disables save and warns when user lacks subscriptions.configure permission", async () => {
    const authModule = await import("@/features/auth/hooks/useAuth");
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: {
        id: "user_viewer",
        name: "Viewer",
        permissions: ["subscriptions.view"],
        role: "viewer",
        organizationId: "org_1",
        branchAccess: [],
      },
    } as unknown as ReturnType<typeof authModule.useAuth>);

    renderEditDialog();

    // Warning banner is rendered
    expect(
      screen.getByText(/You do not have permission to modify member branch permissions/i)
    ).toBeDefined();

    // Save button is disabled
    const saveBtn = screen.getByRole("button", { name: /Save Member Branch Access/i });
    expect(saveBtn).toHaveProperty("disabled", true);
  });
});
