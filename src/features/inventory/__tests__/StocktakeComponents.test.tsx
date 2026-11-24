import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  listStocktakes: vi.fn(),
  getStocktakeById: vi.fn(),
  getStocktakeDiscrepancies: vi.fn(),
  createStocktake: vi.fn(),
  recordStocktakeCounts: vi.fn(),
  postStocktake: vi.fn(),
  cancelStocktake: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: mocks.useBranchContext,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../api/inventory.api", () => ({
  inventoryApi: {
    listStocktakes: mocks.listStocktakes,
    getStocktakeById: mocks.getStocktakeById,
    getStocktakeDiscrepancies: mocks.getStocktakeDiscrepancies,
    createStocktake: mocks.createStocktake,
    recordStocktakeCounts: mocks.recordStocktakeCounts,
    postStocktake: mocks.postStocktake,
    cancelStocktake: mocks.cancelStocktake,
  },
}));

import { StocktakeListView } from "../components/StocktakeListView";
import { StocktakeCountModal } from "../components/StocktakeCountModal";
import { StocktakeReviewModal } from "../components/StocktakeReviewModal";
import { CreateStocktakeModal } from "../components/CreateStocktakeModal";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Stocktake Frontend Lifecycle Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useBranchContext.mockReturnValue({
      currentBranchId: "branch-001",
      currentBranch: { id: "branch-001", name: "Main Salon Branch" },
      currentOrganization: { id: "org-001", name: "Test Salon Org" },
    });

    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-admin",
        name: "Inventory Manager",
        role: "manager",
        permissions: ["inventory.view", "inventory.stocktake"],
        organizationId: "org-001",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. StocktakeListView", () => {
    it("renders stocktake sessions list with domain scope and status", async () => {
      mocks.listStocktakes.mockResolvedValueOnce({
        data: [
          {
            id: "stk-1",
            stocktakeNumber: "STK-202611-0001",
            title: "End of Month Audit",
            targetDomain: "all",
            status: "in_progress",
            totalItems: 10,
            countedItemsCount: 6,
            discrepancyCount: 2,
            createdAt: new Date().toISOString(),
            initiatedBy: { id: "user-admin", name: "Inventory Manager" },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      renderWithClient(<StocktakeListView />);

      await waitFor(() => {
        expect(screen.getByText("STK-202611-0001")).toBeInTheDocument();
        expect(screen.getByText("End of Month Audit")).toBeInTheDocument();
        expect(screen.getByText("All Domains")).toBeInTheDocument();
        expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
        expect(screen.getByText("6 / 10")).toBeInTheDocument();
      });
    });

    it("hides initiate button when user lacks inventory.stocktake permission", async () => {
      mocks.useAuth.mockReturnValueOnce({
        isAuthenticated: true,
        user: {
          id: "viewer-1",
          name: "Viewer",
          role: "stylist",
          permissions: ["inventory.view"], // lacks inventory.stocktake
          organizationId: "org-001",
        },
      });

      mocks.listStocktakes.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });

      renderWithClient(<StocktakeListView />);

      await waitFor(() => {
        expect(screen.queryByText(/Initiate Stocktake/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("2. CreateStocktakeModal", () => {
    it("submits stocktake initiation payload with domain scope", async () => {
      mocks.createStocktake.mockResolvedValueOnce({
        id: "stk-new",
        stocktakeNumber: "STK-202611-0002",
        title: "Weekly Count",
        targetDomain: "salon_consumables",
      });

      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      renderWithClient(
        <CreateStocktakeModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByText("Initiate Stocktake Session")).toBeInTheDocument();
      expect(screen.getByText("Main Salon Branch")).toBeInTheDocument();

      const titleInput = screen.getByPlaceholderText(/End of Month Inventory Audit/i);
      fireEvent.change(titleInput, { target: { value: "Initial Count" } });

      const startButton = screen.getByRole("button", { name: /Start Stocktake/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mocks.createStocktake).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Initial Count",
            branchId: "branch-001",
            targetDomain: "all",
          }),
          expect.stringMatching(/^stk_init_/)
        );
      });
    });
  });

  describe("3. StocktakeCountModal", () => {
    const mockStocktakeDetail = {
      id: "stk-1",
      stocktakeNumber: "STK-202611-0001",
      title: "Active Count Session",
      status: "in_progress",
      items: [
        {
          id: "item-discrete",
          productId: "prod-shampoo",
          product: { name: "Shampoo Bottle", sku: "SHAMP-001", stockUnit: "bottle" },
          stockDomain: "retail_products",
          stockUnit: "bottle",
          snapshotQuantity: 20,
          countedQuantity: null, // Uncounted initially
          status: "uncounted",
        },
        {
          id: "item-fractional",
          productId: "prod-color",
          product: { name: "Color Dye", sku: "COLOR-002", stockUnit: "ml" },
          stockDomain: "salon_consumables",
          stockUnit: "ml",
          snapshotQuantity: 500,
          countedQuantity: 0, // Explicit zero count (out of stock)
          status: "counted",
        },
        {
          id: "item-recount",
          productId: "prod-spray",
          product: { name: "Hair Spray", sku: "SPRAY-003", stockUnit: "bottle" },
          stockDomain: "retail_products",
          stockUnit: "bottle",
          snapshotQuantity: 15,
          countedQuantity: 14,
          status: "recount_required",
        },
      ],
    };

    it("displays discrete and fractional lines, distinguishing uncounted from explicit zero count", async () => {
      mocks.getStocktakeById.mockResolvedValueOnce(mockStocktakeDetail);

      renderWithClient(
        <StocktakeCountModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Shampoo Bottle")).toBeInTheDocument();
        expect(screen.getByText("Color Dye")).toBeInTheDocument();
        expect(screen.getByText("Hair Spray")).toBeInTheDocument();
      });

      // Recount Required badge displayed
      expect(screen.getByText("Recount Required Only")).toBeInTheDocument();
      expect(screen.getByText(/require a physical recount/i)).toBeInTheDocument();
    });

    it("validates discrete integer counts and rejects decimal input for discrete units", async () => {
      mocks.getStocktakeById.mockResolvedValueOnce(mockStocktakeDetail);

      renderWithClient(
        <StocktakeCountModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Shampoo Bottle")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      // First input is Shampoo Bottle (discrete unit: bottle)
      fireEvent.change(inputs[0], { target: { value: "15.5" } });

      await waitFor(() => {
        expect(screen.getByText("Whole number required for bottle")).toBeInTheDocument();
      });
    });

    it("submits recorded counts including explicit 0 count", async () => {
      mocks.getStocktakeById.mockResolvedValueOnce(mockStocktakeDetail);
      mocks.recordStocktakeCounts.mockResolvedValueOnce({
        stocktakeId: "stk-1",
        itemsCounted: 2,
      });

      renderWithClient(
        <StocktakeCountModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Shampoo Bottle")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      // Set Shampoo Bottle to 18
      fireEvent.change(inputs[0], { target: { value: "18" } });

      const saveButton = screen.getAllByRole("button", { name: /Save Progress/i })[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mocks.recordStocktakeCounts).toHaveBeenCalledWith(
          "stk-1",
          expect.objectContaining({
            branchId: "branch-001",
            items: expect.arrayContaining([
              expect.objectContaining({
                productId: "prod-shampoo",
                countedQuantity: 18,
              }),
              expect.objectContaining({
                productId: "prod-color",
                countedQuantity: 0, // explicit 0 preserved!
              }),
            ]),
          })
        );
      });
    });

    it("renders and saves counts when items use raw MongoDB _id and populated productId object", async () => {
      const rawMongoStocktake = {
        _id: "stk-mongo-1",
        stocktakeNumber: "STK-202611-0099",
        title: "Raw Mongo Session",
        status: "in_progress",
        items: [
          {
            _id: "mongo-item-1",
            productId: {
              _id: "prod-mongo-1",
              name: "Herbal Shampoo",
              sku: "HERBAL-101",
              stockUnit: "bottle",
            },
            stockDomain: "retail_products",
            stockUnit: "bottle",
            snapshotQuantity: 10,
            countedQuantity: null,
            status: "uncounted",
          },
        ],
      };

      mocks.getStocktakeById.mockResolvedValueOnce(rawMongoStocktake);
      mocks.recordStocktakeCounts.mockResolvedValueOnce({
        stocktakeId: "stk-mongo-1",
        updatedCount: 1,
      });

      renderWithClient(
        <StocktakeCountModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-mongo-1"
        />
      );

      // Product name and SKU should be resolved from populated productId object
      await waitFor(() => {
        expect(screen.getByText("Herbal Shampoo")).toBeInTheDocument();
        expect(screen.getByText("HERBAL-101")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Uncounted");
      fireEvent.change(input, { target: { value: "8" } });

      const saveButton = screen.getAllByRole("button", { name: /Save Progress/i })[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mocks.recordStocktakeCounts).toHaveBeenCalledWith(
          "stk-mongo-1",
          expect.objectContaining({
            items: [
              expect.objectContaining({
                productId: "prod-mongo-1",
                countedQuantity: 8,
              }),
            ],
          })
        );
      });
    });
  });

  describe("4. StocktakeReviewModal", () => {
    const mockReadySummary = {
      stocktakeId: "stk-1",
      stocktakeNumber: "STK-202611-0001",
      status: "in_progress",
      totalItems: 2,
      countedItems: 2,
      uncountedItems: 0,
      discrepantItems: 1,
      matchedItems: 1,
      recountRequiredCount: 0,
      canPost: true,
      blockers: [],
      discrepancies: [
        {
          itemId: "item-1",
          productId: "prod-1",
          productName: "Shampoo Bottle",
          sku: "SHAMP-001",
          stockDomain: "retail_products",
          stockUnit: "bottle",
          snapshotQuantity: 20,
          liveBalance: 20,
          countedQuantity: 18,
          varianceAgainstLive: -2,
          status: "counted",
        },
        {
          itemId: "item-2",
          productId: "prod-2",
          productName: "Conditioner",
          sku: "COND-002",
          stockDomain: "retail_products",
          stockUnit: "bottle",
          snapshotQuantity: 10,
          liveBalance: 10,
          countedQuantity: 10,
          varianceAgainstLive: 0,
          status: "counted",
        },
      ],
    };

    const mockBlockedSummary = {
      ...mockReadySummary,
      canPost: false,
      recountRequiredCount: 1,
      blockers: ["1 item(s) require a recount due to concurrent movements"],
    };

    it("displays variance comparison against live balance and enables post when ready", async () => {
      mocks.getStocktakeDiscrepancies.mockResolvedValueOnce(mockReadySummary);

      renderWithClient(
        <StocktakeReviewModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("READY TO POST")).toBeInTheDocument();
        expect(screen.getByText("-2")).toBeInTheDocument();
        expect(screen.getByText("Shampoo Bottle")).toBeInTheDocument();
      });

      const postButton = screen.getAllByRole("button", { name: /Approve & Post Reconciliation/i })[0];
      expect(postButton).not.toBeDisabled();
    });

    it("disables post button and renders warning banner when posting is blocked", async () => {
      mocks.getStocktakeDiscrepancies.mockResolvedValueOnce(mockBlockedSummary);

      renderWithClient(
        <StocktakeReviewModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("BLOCKED")).toBeInTheDocument();
        expect(screen.getByText(/1 item\(s\) require a recount/i)).toBeInTheDocument();
      });

      const postButton = screen.getAllByRole("button", { name: /Approve & Post Reconciliation/i })[0];
      expect(postButton).toBeDisabled();
    });

    it("handles HTTP 409 conflict during post by alerting user and refetching discrepancies", async () => {
      mocks.getStocktakeDiscrepancies.mockResolvedValueOnce(mockReadySummary);
      mocks.postStocktake.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            message: "Stock movements occurred after physical counts were recorded. Recount required for flagged lines.",
          },
        },
      });

      renderWithClient(
        <StocktakeReviewModal
          isOpen={true}
          onClose={vi.fn()}
          stocktakeId="stk-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("READY TO POST")).toBeInTheDocument();
      });

      const postButton = screen.getAllByRole("button", { name: /Approve & Post Reconciliation/i })[0];
      fireEvent.click(postButton);

      await waitFor(() => {
        expect(mocks.postStocktake).toHaveBeenCalledWith(
          "stk-1",
          expect.objectContaining({ branchId: "branch-001" }),
          expect.stringMatching(/^stk_post_/)
        );
        // On 409, refetch should be called to refresh live discrepancy state
        expect(mocks.getStocktakeDiscrepancies).toHaveBeenCalledTimes(2);
      });
    });
  });
});
