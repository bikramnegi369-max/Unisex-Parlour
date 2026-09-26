// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ServiceCategoriesList from "../components/common/ServiceCategoriesList";
import ServiceCategoryForm from "../components/service-categories/ServiceCategoryForm";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

const mockCategories = [
  {
    id: "cat_1",
    name: "Hair Services",
    description: "Hair styling and cuts",
    displayOrder: 1,
    isActive: true,
    organizationId: "org_global_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat_2",
    name: "Skin Care",
    description: "Facials and wellness",
    displayOrder: 2,
    isActive: false,
    organizationId: "org_global_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

// Mock dependencies
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/services/categories",
}));

let mockUser: { id: string; role: string; permissions: string[] } | null = {
  id: "user_1",
  role: "manager",
  permissions: ["services.view", "services.create", "services.edit", "services.delete"],
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: mockUser,
  }),
}));

const mockMutateCreate = vi.fn();
const mockMutateUpdate = vi.fn();
const mockMutateDelete = vi.fn();
const mockMutateReactivate = vi.fn();

vi.mock("../hooks/categories/useCreateServiceCategory", () => ({
  useCreateServiceCategory: () => ({
    mutate: mockMutateCreate,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/categories/useUpdateServiceCategory", () => ({
  useUpdateServiceCategory: () => ({
    mutate: mockMutateUpdate,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/categories/useDeleteServiceCategory", () => ({
  useDeleteServiceCategory: () => ({
    mutate: mockMutateDelete,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/categories/useReactivateServiceCategory", () => ({
  useReactivateServiceCategory: () => ({
    mutate: mockMutateReactivate,
    isPending: false,
    error: null,
  }),
}));

const mockCategoriesQueryResult = {
  data: {
    data: mockCategories,
    meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
  },
  isLoading: false,
  isFetching: false,
  isRefetching: false,
  refetch: vi.fn(),
};

vi.mock("../hooks/categories/useServiceCategories", () => ({
  useServiceCategories: vi.fn(() => mockCategoriesQueryResult),
}));

describe("Service Categories Organization-Global Frontend", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockUser = {
      id: "user_1",
      role: "manager",
      permissions: ["services.view", "services.create", "services.edit", "services.delete"],
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe("Query Keys & Scoping Independence", () => {
    it("generates organization scope query key without active branch dependency", () => {
      const filters = { search: "Hair" };
      const keyBranchA = getScopeQueryKey("service-categories", null, [filters]);
      const keyBranchB = getScopeQueryKey("service-categories", "all", [filters]);

      // Both null and "all" resolve to { scope: "organization" }
      expect(keyBranchA).toEqual(["service-categories", { scope: "organization" }, filters]);
      expect(keyBranchB).toEqual(["service-categories", { scope: "organization" }, filters]);
      expect(keyBranchA).toEqual(keyBranchB);
    });
  });

  describe("ServiceCategoriesList Component", () => {
    it("renders categories table when All Branches or specific branch is selected", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ServiceCategoriesList />
        </QueryClientProvider>,
      );

      expect(screen.getAllByText("Hair Services").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Skin Care").length).toBeGreaterThan(0);
      // Should show status badges
      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    });

    it("opens Create Category modal and calls create mutation with clean payload", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ServiceCategoriesList />
        </QueryClientProvider>,
      );

      // Click Add Category button
      const addButtons = screen.getAllByRole("button", { name: /Add Category|Create/i });
      fireEvent.click(addButtons[0]);

      // Fill in form inputs
      const nameInput = screen.getByLabelText(/Category Name/i);
      const descInput = screen.getByLabelText(/Description/i);
      const orderInput = screen.getByLabelText(/Display Order/i);

      fireEvent.change(nameInput, { target: { value: "Body Treatments" } });
      fireEvent.change(descInput, { target: { value: "Full body massages" } });
      fireEvent.change(orderInput, { target: { value: "3" } });

      const saveButton = screen.getByRole("button", { name: /Save Category/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockMutateCreate).toHaveBeenCalledTimes(1);
      });

      const submittedPayload = mockMutateCreate.mock.calls[0][0];
      expect(submittedPayload).toEqual({
        name: "Body Treatments",
        description: "Full body massages",
        displayOrder: 3,
      });

      // Assert no branchId or organizationId was submitted
      expect(submittedPayload.branchId).toBeUndefined();
      expect(submittedPayload.organizationId).toBeUndefined();
    });

    it("hides Add Category button when user lacks services.create permission", () => {
      mockUser = {
        id: "user_no_create",
        role: "staff",
        permissions: ["services.view"],
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ServiceCategoriesList />
        </QueryClientProvider>,
      );

      expect(screen.queryByRole("button", { name: /Add Category/i })).toBeNull();
    });
  });

  describe("ServiceCategoryForm Validation & Payload Cleanness", () => {
    it("ensures form contains only name, description, displayOrder and rejects accidental extra fields", async () => {
      const handleSubmit = vi.fn();
      const handleCancel = vi.fn();

      render(
        <ServiceCategoryForm
          onSubmit={handleSubmit}
          isSubmitting={false}
          onCancel={handleCancel}
        />
      );

      // Verify absence of any branch or organization inputs in DOM
      expect(screen.queryByLabelText(/branch/i)).toBeNull();
      expect(screen.queryByLabelText(/organization/i)).toBeNull();

      // Submit valid form
      fireEvent.change(screen.getByLabelText(/Category Name/i), {
        target: { value: "Coloring" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Save Category/i }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      const values = handleSubmit.mock.calls[0][0];
      expect(values).toEqual({
        name: "Coloring",
        description: "",
        displayOrder: 0,
      });
      expect(values.branchId).toBeUndefined();
      expect(values.organizationId).toBeUndefined();
    });
  });
});
