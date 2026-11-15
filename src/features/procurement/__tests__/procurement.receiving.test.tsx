import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import GoodsReceivingView from "../components/GoodsReceivingView";

// Mock hooks
const mockReceiveMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};

vi.mock("../hooks/useProcurement", () => ({
  useReceiveGoods: vi.fn(() => mockReceiveMutation),
  useGoodsReceipts: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
  usePurchaseOrders: vi.fn(() => ({
    data: {
      data: [
        {
          id: "po-123",
          poNumber: "PO-20261115-001",
          status: "ordered",
          supplier: { name: "L'Oreal Professional" },
          branch: { name: "Central Branch" },
          totalAmount: 5000,
          items: [
            {
              id: "item-1",
              productId: "prod-1",
              targetDomain: "retail_products",
              orderedQuantity: 10,
              receivedQuantity: 0,
              unitCostPrice: 500,
              lineTotal: 5000,
              product: {
                id: "prod-1",
                name: "Shampoo Bottle",
                sku: "SHA-001",
                stockUnit: "bottle",
              },
            },
          ],
        },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: vi.fn(() => ({
    currentBranchId: "branch-1",
  })),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "user-1",
      permissions: ["procurement.orders.update", "procurement.orders.view"],
    },
  })),
}));

describe("GoodsReceivingView Regression & Inward Stock Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pending PO dropdown and allows selecting an order directly from Goods Receiving tab", async () => {
    render(<GoodsReceivingView />);

    expect(screen.getAllByText(/PO-20261115-001/).length).toBeGreaterThan(0);
    expect(screen.getByText("Shampoo Bottle")).toBeInTheDocument();
    expect(screen.getByText("Destination: Retail Products")).toBeInTheDocument();
    expect(screen.getByText("Remaining: 10")).toBeInTheDocument();
  });

  it("submits goods receiving on Confirm & Inward Stock button click and calls API mutation with correct payload", async () => {
    mockReceiveMutation.mutateAsync.mockResolvedValueOnce({
      receipt: { id: "grn-1" },
    });

    render(<GoodsReceivingView />);

    const confirmBtns = screen.getAllByRole("button", { name: /confirm & inward stock/i });
    expect(confirmBtns.length).toBeGreaterThan(0);

    fireEvent.click(confirmBtns[0]);

    await waitFor(() => {
      expect(mockReceiveMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              productId: "prod-1",
              receivedQuantity: 10,
            }),
          ],
        })
      );
    });
  });

  it("switches to Inward Stock tab when clicking the Inward Stock action button", async () => {
    render(<GoodsReceivingView />);

    const historyTabBtns = screen.getAllByRole("button", { name: /receipt history/i });
    fireEvent.click(historyTabBtns[0]);

    expect(screen.getByText(/no receipts on record/i)).toBeInTheDocument();

    // Select the tab button specifically
    const inwardTabBtns = screen.getAllByRole("button", { name: /^inward stock$/i });
    fireEvent.click(inwardTabBtns[0]);

    expect(screen.getAllByText(/PO-20261115-001/).length).toBeGreaterThan(0);
  });

  it("handles API rejection gracefully without false positive success state", async () => {
    mockReceiveMutation.mutateAsync.mockRejectedValueOnce(new Error("Database transaction rolled back"));

    render(<GoodsReceivingView />);

    const confirmBtns = screen.getAllByRole("button", { name: /confirm & inward stock/i });
    fireEvent.click(confirmBtns[0]);

    await waitFor(() => {
      expect(mockReceiveMutation.mutateAsync).toHaveBeenCalled();
    });

    // PO form must remain visible and not claim completed
    expect(screen.getAllByText(/PO-20261115-001/).length).toBeGreaterThan(0);
  });

  it("disables inwarding submission when receiving mutation is pending (double-click guard)", () => {
    // Simulate isPending: true
    mockReceiveMutation.isPending = true;

    render(<GoodsReceivingView />);

    const disabledBtns = screen.getAllByRole("button", { name: /recording receipt/i });
    expect(disabledBtns.length).toBeGreaterThan(0);
    expect(disabledBtns[0]).toBeDisabled();

    // Reset pending state
    mockReceiveMutation.isPending = false;
  });
});
