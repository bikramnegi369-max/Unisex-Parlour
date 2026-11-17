import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  getBranchStock: vi.fn(),
  getMovements: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  recordConsumption: vi.fn(),
  recordAdjustment: vi.fn(),
  recordTransfer: vi.fn(),
  allocateDomain: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: mocks.useBranchContext,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../api/inventory.api", () => ({
  inventoryApi: {
    getProducts: mocks.getProducts,
    getProductById: mocks.getProductById,
    getBranchStock: mocks.getBranchStock,
    getMovements: mocks.getMovements,
    createProduct: mocks.createProduct,
    updateProduct: mocks.updateProduct,
    recordConsumption: mocks.recordConsumption,
    recordAdjustment: mocks.recordAdjustment,
    recordTransfer: mocks.recordTransfer,
    allocateDomain: mocks.allocateDomain,
  },
}));

import {
  INVENTORY_QUERY_KEYS,
  useBranchStock,
  useProducts,
  useStockMovements,
} from "../hooks/useInventory";

const queryClients: QueryClient[] = [];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClients.push(queryClient);
  return function InventoryQueryClientWrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

afterEach(() => {
  cleanup();
  queryClients.forEach((queryClient) => queryClient.clear());
  queryClients.length = 0;
  vi.resetAllMocks();
});

beforeEach(() => {
  mocks.useBranchContext.mockReturnValue({
    currentBranchId: null,
    currentOrganization: { id: "org-1", name: "Salon One" },
  });
  mocks.useAuth.mockReturnValue({
    isAuthenticated: true,
    user: {
      id: "user-1",
      name: "Inventory Manager",
      email: "manager@example.test",
      role: "manager",
      permissions: ["inventory.view"],
      organizationId: "org-1",
      branchAccess: [],
      hasOrgWideAccess: false,
    },
  });
  mocks.getProducts.mockResolvedValue({ data: [] });
  mocks.getProductById.mockResolvedValue({ id: "product-1" });
  mocks.getBranchStock.mockResolvedValue({ data: [] });
  mocks.getMovements.mockResolvedValue({ data: [] });
});

describe("inventory query scoping", () => {
  it("isolates product and stock caches by organization", () => {
    expect(INVENTORY_QUERY_KEYS.products("org-1")).not.toEqual(
      INVENTORY_QUERY_KEYS.products("org-2"),
    );
    expect(INVENTORY_QUERY_KEYS.product("org-1", "product-1")).not.toEqual(
      INVENTORY_QUERY_KEYS.product("org-2", "product-1"),
    );
    expect(
      INVENTORY_QUERY_KEYS.stock("org-1", "branch-1"),
    ).not.toEqual(INVENTORY_QUERY_KEYS.stock("org-2", "branch-1"));
  });

  it("does not fetch branch-scoped stock or movements without an authorized active branch", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => ({
        stock: useBranchStock(),
        movements: useStockMovements(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.stock.fetchStatus).toBe("idle");
      expect(result.current.movements.fetchStatus).toBe("idle");
    });
    expect(mocks.getBranchStock).not.toHaveBeenCalled();
    expect(mocks.getMovements).not.toHaveBeenCalled();
  });

  it("allows organization-wide stock queries for an organization-wide user", async () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "owner-1",
        name: "Owner",
        email: "owner@example.test",
        role: "owner",
        permissions: ["inventory.view"],
        organizationId: "org-1",
        branchAccess: [],
        hasOrgWideAccess: true,
      },
    });
    const wrapper = createWrapper();

    renderHook(
      () => ({
        stock: useBranchStock({ branchId: "all", page: 1 }),
        movements: useStockMovements({ branchId: "all", page: 1 }),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mocks.getBranchStock).toHaveBeenCalledWith({
        page: 1,
        branchId: undefined,
      });
      expect(mocks.getMovements).toHaveBeenCalledWith({
        page: 1,
        branchId: undefined,
      });
    });
  });

  it("does not fetch inventory for users without view permission", async () => {
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-2",
        name: "Cashier",
        email: "cashier@example.test",
        role: "cashier",
        permissions: [],
        organizationId: "org-1",
        branchAccess: [{ branchId: "branch-1", isActive: true }],
        hasOrgWideAccess: false,
      },
    });
    mocks.useBranchContext.mockReturnValue({
      currentBranchId: "branch-1",
      currentOrganization: { id: "org-1", name: "Salon One" },
    });
    const wrapper = createWrapper();

    renderHook(() => useProducts(), { wrapper });

    await waitFor(() => {
      expect(mocks.getProducts).not.toHaveBeenCalled();
    });
  });
});
