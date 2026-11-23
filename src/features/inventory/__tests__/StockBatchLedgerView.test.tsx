import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StockBatchLedgerView } from "../components/StockBatchLedgerView";
import { inventoryApi } from "../api/inventory.api";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  getBatches: vi.fn(),
  valueBatch: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: mocks.useBranchContext,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: mocks.hasPermission,
}));

vi.mock("../api/inventory.api", () => ({
  inventoryApi: {
    getBatches: mocks.getBatches,
    valueBatch: mocks.valueBatch,
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("StockBatchLedgerView Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBranchContext.mockReturnValue({
      currentBranchId: "branch-001",
      currentBranch: { id: "branch-001", name: "Flagship" },
      isAllBranchesSelected: false,
    });
    mocks.useAuth.mockReturnValue({
      user: { id: "usr-01", name: "Manager User", role: "manager" },
    });
    mocks.hasPermission.mockImplementation((user, perm) => {
      if (perm === "inventory.view") return true;
      if (perm === "inventory.adjust") return true;
      return false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders access restricted when user lacks inventory.view permission", () => {
    mocks.hasPermission.mockReturnValue(false);
    renderWithClient(<StockBatchLedgerView />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to view inventory batch subledgers/i)).toBeInTheDocument();
  });

  it("renders empty state when no batches are returned", async () => {
    mocks.getBatches.mockResolvedValueOnce({
      status: "success",
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    renderWithClient(<StockBatchLedgerView />);

    await waitFor(() => {
      expect(screen.getByText(/No inventory batches found matching current filters/i)).toBeInTheDocument();
    });
  });

  it("renders batches list with valued and unvalued lots", async () => {
    mocks.getBatches.mockResolvedValueOnce({
      status: "success",
      data: [
        {
          _id: "batch-1",
          batchNumber: "BAT-VAL-001",
          productId: { name: "Keratin Shampoo", stockUnit: "bottles" },
          stockDomain: "retail",
          receivedAt: "2026-11-20T10:00:00Z",
          receivedQuantityMilli: 5000,
          remainingQuantityMilli: 5000,
          unitCostPaise: 25000,
          isValued: true,
          sourceMovementType: "procurement_grn",
        },
        {
          _id: "batch-2",
          batchNumber: "BAT-UNVAL-002",
          productId: { name: "Hair Dye Brown", stockUnit: "tubes" },
          stockDomain: "salon_consumables",
          receivedAt: "2026-11-21T10:00:00Z",
          receivedQuantityMilli: 3000,
          remainingQuantityMilli: 3000,
          unitCostPaise: null,
          isValued: false,
          sourceMovementType: "opening_stock",
        },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    renderWithClient(<StockBatchLedgerView />);

    await waitFor(() => {
      expect(screen.getByText("BAT-VAL-001")).toBeInTheDocument();
      expect(screen.getByText("BAT-UNVAL-002")).toBeInTheDocument();
      expect(screen.getByText("₹250.00")).toBeInTheDocument();
      expect(screen.getByText("Unvalued")).toBeInTheDocument();
      expect(screen.getByText("Value Lot")).toBeInTheDocument();
    });
  });

  it("validates unit cost and notes when opening valuation modal", async () => {
    mocks.getBatches.mockResolvedValueOnce({
      status: "success",
      data: [
        {
          _id: "batch-unval",
          batchNumber: "BAT-OPEN-099",
          productId: { name: "Conditioner", stockUnit: "bottles" },
          stockDomain: "retail",
          receivedAt: "2026-11-21T10:00:00Z",
          receivedQuantityMilli: 4000,
          remainingQuantityMilli: 4000,
          unitCostPaise: null,
          isValued: false,
          sourceMovementType: "opening_stock",
        },
      ],
    });

    renderWithClient(<StockBatchLedgerView />);

    const valueBtn = await screen.findByRole("button", { name: /Value Lot/i });
    fireEvent.click(valueBtn);

    expect(screen.getByText(/Value Opening Stock Batch: BAT-OPEN-099/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Confirm Valuation/i });
    fireEvent.click(submitBtn);

    // Form validation keeps required fields intact
    expect(mocks.valueBatch).not.toHaveBeenCalled();
  });
});
