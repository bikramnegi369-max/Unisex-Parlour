// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomerSelector } from "../components/CustomerSelector";
import { QuickCustomerDialog } from "../components/QuickCustomerDialog";
import type { Customer } from "../types/customer.types";

// Mock dependencies
const mockCustomers: Customer[] = [
  {
    id: "cust_101",
    _id: "cust_101",
    name: "Alice Johnson",
    phone: "+91 98765 43210",
    email: "alice@example.com",
    gender: "female",
    organizationId: "org_1",
    homeBranchId: "br_1",
    visitedBranchIds: ["br_1"],
    loyaltyPoints: 10,
    status: "active",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "cust_102",
    _id: "cust_102",
    name: "Bob Smith",
    phone: "+91 98765 43211",
    email: "bob@example.com",
    gender: "male",
    organizationId: "org_1",
    homeBranchId: "br_1",
    visitedBranchIds: ["br_1"],
    loyaltyPoints: 0,
    status: "active",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

let mockUserPermissions = ["customers.view", "customers.create", "appointments.create"];
let mockCurrentBranchId: string | null = "br_1";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "usr_1",
      name: "Receptionist",
      email: "receptionist@parlour.com",
      role: "Receptionist",
      permissions: mockUserPermissions,
      organizationId: "org_1",
      branchAccess: [{ branchId: "br_1", isActive: true }],
    },
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: mockCurrentBranchId,
    isAllBranchesSelected: mockCurrentBranchId === null || mockCurrentBranchId === "all",
    getBranchQueryKey: (entity: string, extra: unknown[]) => [entity, mockCurrentBranchId, extra],
  }),
}));

const mockMutateAsync = vi.fn();

vi.mock("../hooks/useCreateCustomer", () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockGetCustomers = vi.fn();

vi.mock("../api/customers.api", () => ({
  getCustomers: (params: { search?: string }) => mockGetCustomers(params),
  createCustomer: (payload: unknown) => mockMutateAsync(payload),
}));

describe("CustomerSelector & QuickCustomerDialog", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUserPermissions = ["customers.view", "customers.create", "appointments.create"];
    mockCurrentBranchId = "br_1";
    mockGetCustomers.mockResolvedValue({
      success: true,
      status: "success",
      data: mockCustomers,
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    mockMutateAsync.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  it("renders search input and allows searching and selecting existing customer", async () => {
    const onChange = vi.fn();

    renderWithClient(<CustomerSelector value="" onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText("Search customer name or phone...");
    expect(searchInput).not.toBeNull();

    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).not.toBeNull();
    });

    const aliceOption = screen.getByText("Alice Johnson");
    fireEvent.click(aliceOption);

    expect(onChange).toHaveBeenCalledWith("cust_101", mockCustomers[0]);
  });

  it("shows empty state and Create New Customer button when no results match", async () => {
    mockGetCustomers.mockResolvedValueOnce({
      success: true,
      status: "success",
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderWithClient(<CustomerSelector value="" onChange={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search customer name or phone...");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    await waitFor(() => {
      expect(screen.getByText("No customer found")).not.toBeNull();
      expect(screen.getByText("Create New Customer")).not.toBeNull();
    });
  });

  it("disables customer creation and shows warning when All Branches is selected", async () => {
    mockCurrentBranchId = null; // All Branches
    mockGetCustomers.mockResolvedValueOnce({
      success: true,
      status: "success",
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderWithClient(<CustomerSelector value="" onChange={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search customer name or phone...");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Test" } });

    await waitFor(() => {
      expect(
        screen.getByText("Select a branch before creating a new customer.")
      ).not.toBeNull();
      expect(screen.queryByRole("button", { name: /Create New Customer/i })).toBeNull();
    });
  });

  it("hides inline customer creation when user lacks customers.create permission", async () => {
    mockUserPermissions = ["customers.view", "appointments.create"]; // No customers.create!
    mockGetCustomers.mockResolvedValueOnce({
      success: true,
      status: "success",
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    renderWithClient(<CustomerSelector value="" onChange={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText("Search customer name or phone...");
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Test" } });

    await waitFor(() => {
      expect(screen.getByText("No customer found")).not.toBeNull();
      expect(screen.queryByText("Create New Customer")).toBeNull();
    });
  });

  it("handles successful Quick Customer creation and auto-selects new customer", async () => {
    const newCust: Customer = {
      id: "cust_201",
      _id: "cust_201",
      name: "Charlie Brown",
      phone: "+91 98765 00000",
      email: "charlie@example.com",
      gender: "male",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockMutateAsync.mockResolvedValueOnce(newCust);

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    renderWithClient(
      <QuickCustomerDialog
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Sarah Jenkins"), {
      target: { value: "Charlie Brown" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. +91 98765 43210"), {
      target: { value: "+91 98765 00000" },
    });

    const submitBtn = screen.getByRole("button", { name: "Create Customer" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: "Charlie Brown",
        phone: "+91 98765 00000",
        gender: "prefer_not_to_say",
      });
      expect(onSuccess).toHaveBeenCalledWith(newCust);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("handles HTTP 409 duplicate customer error gracefully with option to select existing customer", async () => {
    const existingCust = {
      _id: "cust_existing_999",
      name: "Existing Customer",
      phone: "+91 98765 43210",
    };

    const duplicateErrorResponse = {
      response: {
        status: 409,
        data: {
          message: "A customer with phone +91 98765 43210 already exists.",
          errors: {
            existingCustomer: existingCust,
          },
        },
      },
    };

    mockMutateAsync.mockRejectedValueOnce(duplicateErrorResponse);

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    renderWithClient(
      <QuickCustomerDialog
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Sarah Jenkins"), {
      target: { value: "Duplicate User" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. +91 98765 43210"), {
      target: { value: "+91 98765 43210" },
    });

    const submitBtn = screen.getByRole("button", { name: "Create Customer" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Customer Already Exists")).not.toBeNull();
      expect(screen.getByText("Select Existing Customer")).not.toBeNull();
    });

    const selectExistingBtn = screen.getByRole("button", {
      name: "Select Existing Customer",
    });
    fireEvent.click(selectExistingBtn);

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cust_existing_999",
        name: "Existing Customer",
        phone: "+91 98765 43210",
      })
    );
    expect(onClose).toHaveBeenCalled();
  });
});
