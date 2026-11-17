import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DomainAllocationModal } from "./DomainAllocationModal";
import type { StockBalance } from "../types/inventory.types";

const mocks = vi.hoisted(() => ({
  allocateDomain: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("../api/inventory.api", () => ({
  inventoryApi: { allocateDomain: mocks.allocateDomain },
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

const balance: StockBalance = {
  id: "balance-1",
  organizationId: "organization-1",
  branchId: "branch-1",
  productId: "product-1",
  product: {
    id: "product-1",
    name: "Treatment Serum",
    sku: "SERUM-1",
    category: "Hair Care",
    usageType: "both",
    stockUnit: "bottle",
    costPrice: 100,
    sellingPrice: 200,
    reorderLevel: 0,
    status: "active",
    organizationId: "organization-1",
  },
  onHand: 10,
  onHandRetail: 0,
  onHandConsumables: 0,
  onHandUnallocated: 10,
  allocated: 0,
  lastMovementAt: "2026-03-01T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("DomainAllocationModal retry idempotency", () => {
  it("reuses the allocation key after a failed request so a retry cannot allocate twice", async () => {
    mocks.allocateDomain
      .mockRejectedValueOnce(new Error("Temporary network failure"))
      .mockResolvedValueOnce({});

    render(
      <DomainAllocationModal
        isOpen
        onClose={vi.fn()}
        balance={balance}
      />,
    );

    const [retailInput, consumablesInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(retailInput, { target: { value: "2" } });
    fireEvent.change(consumablesInput, { target: { value: "3" } });
    fireEvent.change(
      screen.getByPlaceholderText(
        "e.g. Physical inventory count verified by Store Manager",
      ),
      { target: { value: "Verified by manager" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm Allocation" }));
    await waitFor(() => expect(mocks.allocateDomain).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirm Allocation" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm Allocation" }));
    await waitFor(() => expect(mocks.allocateDomain).toHaveBeenCalledTimes(2));

    const firstKey = mocks.allocateDomain.mock.calls[0][1];
    expect(firstKey).toMatch(/^alloc_balance-1_/);
    expect(mocks.allocateDomain.mock.calls[1][1]).toBe(firstKey);
  });
});
