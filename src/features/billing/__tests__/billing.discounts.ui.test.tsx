import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import uiReducer from "@/store/slices/uiSlice";
import { ApplyDiscountDialog } from "../components/ApplyDiscountDialog";
import { ModifyDiscountDialog } from "../components/ModifyDiscountDialog";
import { RemoveDiscountDialog } from "../components/RemoveDiscountDialog";
import { DiscountHistoryDialog } from "../components/DiscountHistoryDialog";
import { InvoiceDetailsPage } from "../components/InvoiceDetailsPage";
import * as billingQueries from "../hooks/useBillingQueries";
import * as billingMutations from "../hooks/useBillingMutations";
import type { Invoice, AppliedDiscount, DiscountHistoryEntry } from "../types/billing.types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/billing",
}));

vi.mock("../hooks/useBillingMutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useBillingMutations")>();
  return {
    ...actual,
    useApplyInvoiceDiscount: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useModifyInvoiceDiscount: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useRemoveInvoiceDiscount: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  };
});
const mockUser = {
  id: "user-1",
  name: "Receptionist",
  email: "reception@parlour.com",
  role: "manager",
  permissions: ["billing.view", "billing.checkout", "payments.receive", "billing.void"],
  organizationId: "org-1",
  branchAccess: [{ branchId: "branch-1", isActive: true }],
  hasOrgWideAccess: false,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

const createTestStore = (currentBranchId: string | null = "branch-1") =>
  configureStore({
    reducer: {
      branch: branchReducer,
      ui: uiReducer,
    },
    preloadedState: {
      branch: {
        currentBranchId,
        availableBranches: [
          {
            id: "branch-1",
            organizationId: "org-1",
            name: "Downtown Branch",
            code: "DT",
            isActive: true,
            isMainBranch: true,
            timezone: "Asia/Kolkata",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
        currentOrganization: null,
      },
    },
  });

const mockDraftInvoice: Invoice = {
  id: "inv-1",
  invoiceNumber: "INV-2026-0001",
  organizationId: "org-1",
  branchId: "branch-1",
  customerId: "cust-1",
  appointmentId: "apt-1",
  invoiceType: "service",
  status: "draft",
  paymentStatus: "unpaid",
  subtotal: 1000,
  lineDiscountsTotal: 0,
  invoiceDiscountsTotal: 0,
  discountTotal: 0,
  grossPayable: 1000,
  subscriptionCoveredAmount: 0,
  payableAmount: 1000,
  amountPaid: 0,
  amountDue: 1000,
  items: [
    {
      id: "line-1",
      serviceId: "srv-1",
      serviceName: "Regular Haircut",
      unitPrice: 600,
      quantity: 1,
      lineTotal: 600,
      customerPayable: 600,
    },
    {
      id: "line-2",
      serviceId: "srv-2",
      serviceName: "Beard Trim (Sub Covered)",
      unitPrice: 400,
      quantity: 1,
      lineTotal: 400,
      isCoveredBySubscription: true,
      subscriptionCoveredAmount: 400,
      customerPayable: 0,
    },
  ],
  createdAt: "2026-10-30T10:00:00Z",
  updatedAt: "2026-10-30T10:00:00Z",
};

describe("Billing Discounts — UI Components & Flow Verification", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("ApplyDiscountDialog", () => {
    it("renders scope buttons, multi-line selection, and excludes subscription covered lines", () => {
      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
            />
          </QueryClientProvider>
        </Provider>
      );

      expect(screen.getByRole("heading", { name: /Apply Discount/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Entire Invoice/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Selected Services/i })).toBeDefined();

      // Click Selected Services
      fireEvent.click(screen.getByRole("button", { name: /Selected Services/i }));

      // The subscription-covered item (Beard Trim) must NOT be present as an option
      expect(screen.queryByText(/Beard Trim \(Sub Covered\)/)).toBeNull();
      // The regular haircut must be available
      expect(screen.getByText(/Regular Haircut/)).toBeDefined();
    });

    it("requires mandatory reason of minimum 3 characters before submitting", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(billingMutations.useApplyInvoiceDiscount).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof billingMutations.useApplyInvoiceDiscount>);

      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
            />
          </QueryClientProvider>
        </Provider>
      );

      const valueInput = screen.getByPlaceholderText("10");
      fireEvent.change(valueInput, { target: { value: "15" } });

      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Reason must be at least 3 characters/i)).toBeDefined();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it("submits apply discount and triggers onConflictRefresh on 409 error", async () => {
      const onConflictRefresh = vi.fn();
      const conflictError = {
        response: { status: 409, data: { message: "Version conflict" } },
      };
      const mockMutateAsync = vi.fn().mockRejectedValue(conflictError);

      vi.mocked(billingMutations.useApplyInvoiceDiscount).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof billingMutations.useApplyInvoiceDiscount>);

      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
              onConflictRefresh={onConflictRefresh}
            />
          </QueryClientProvider>
        </Provider>
      );

      fireEvent.change(screen.getByPlaceholderText("10"), { target: { value: "15" } });
      fireEvent.change(
        screen.getByPlaceholderText(/Provide mandatory operational or business justification/i),
        { target: { value: "Manager discount" } }
      );

      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onConflictRefresh).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("ModifyDiscountDialog & RemoveDiscountDialog", () => {
    const mockDiscount: AppliedDiscount = {
      id: "disc-1",
      level: "invoice",
      type: "fixed",
      enteredValue: 100,
      calculatedDiscount: 100,
      reason: "Initial discount",
    };

    it("renders ModifyDiscountDialog and updates value with required reason", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(billingMutations.useModifyInvoiceDiscount).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof billingMutations.useModifyInvoiceDiscount>);

      const onClose = vi.fn();
      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ModifyDiscountDialog
              isOpen={true}
              onClose={onClose}
              invoice={mockDraftInvoice}
              discount={mockDiscount}
            />
          </QueryClientProvider>
        </Provider>
      );

      expect(screen.getByRole("heading", { name: /Modify Discount Value/i })).toBeDefined();

      const valueInput = screen.getByRole("spinbutton");
      fireEvent.change(valueInput, { target: { value: "120" } });

      const reasonInput = screen.getByPlaceholderText(/Mandatory reason for updating discount/i);
      fireEvent.change(reasonInput, { target: { value: "Corrected amount" } });

      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          invoiceId: "inv-1",
          discountId: "disc-1",
          payload: expect.objectContaining({
            enteredValue: 120,
            reason: "Corrected amount",
          }),
        });
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("renders RemoveDiscountDialog and enforces mandatory reason", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(billingMutations.useRemoveInvoiceDiscount).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof billingMutations.useRemoveInvoiceDiscount>);

      const { container } = render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <RemoveDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
              discount={mockDiscount}
            />
          </QueryClientProvider>
        </Provider>
      );

      expect(screen.getByText(/Are you sure you want to remove this discount\?/i)).toBeDefined();

      const form = container.querySelector("form");
      // Submit without reason
      if (form) {
        fireEvent.submit(form);
      } else {
        fireEvent.click(screen.getByRole("button", { name: /Remove Discount/i }));
      }

      await waitFor(() => {
        expect(screen.getByText(/Reason must be at least 3 characters/i)).toBeDefined();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();

      // Enter valid reason
      fireEvent.change(screen.getByPlaceholderText(/Mandatory justification for audit trail/i), {
        target: { value: "Removed after coupon expired" },
      });

      if (form) {
        fireEvent.submit(form);
      } else {
        fireEvent.click(screen.getByRole("button", { name: /Remove Discount/i }));
      }

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          invoiceId: "inv-1",
          discountId: "disc-1",
          payload: expect.objectContaining({
            reason: "Removed after coupon expired",
          }),
        });
      });
    });
  });

  describe("DiscountHistoryDialog", () => {
    it("renders history entries with actors, actions, reasons, and financial comparison", () => {
      const mockHistory: DiscountHistoryEntry[] = [
        {
          id: "hist-1",
          invoiceId: "inv-1",
          discountId: "disc-1",
          action: "applied",
          discountLevel: "invoice",
          discountType: "fixed",
          enteredValue: 150,
          calculatedDiscount: 150,
          reason: "Manager approval for loyalty delay",
          performedBy: {
            id: "user-1",
            name: "Jane Manager",
            email: "jane@parlour.com",
          },
          performedAt: "2026-10-30T10:15:00Z",
          beforeSnapshot: {
            subtotal: 1000,
            lineDiscountsTotal: 0,
            invoiceDiscountsTotal: 0,
            discountTotal: 0,
            grossPayable: 1000,
            subscriptionCoveredAmount: 0,
            payableAmount: 1000,
            amountPaid: 0,
            amountDue: 1000,
          },
          afterSnapshot: {
            subtotal: 1000,
            lineDiscountsTotal: 0,
            invoiceDiscountsTotal: 150,
            discountTotal: 150,
            grossPayable: 850,
            subscriptionCoveredAmount: 0,
            payableAmount: 850,
            amountPaid: 0,
            amountDue: 850,
          },
        },
      ];

      vi.spyOn(billingQueries, "useInvoiceDiscountHistory").mockReturnValue({
        data: mockHistory,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof billingQueries.useInvoiceDiscountHistory>);

      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <DiscountHistoryDialog
              isOpen={true}
              onClose={vi.fn()}
              invoiceId="inv-1"
              invoiceNumber="INV-2026-0001"
            />
          </QueryClientProvider>
        </Provider>
      );

      expect(screen.getByRole("heading", { name: /Discount Audit Trail — INV-2026-0001/i })).toBeDefined();
      expect(screen.getByText("Jane Manager")).toBeDefined();
      expect(screen.getByText(/"Manager approval for loyalty delay"/i)).toBeDefined();
      expect(screen.getByText("Applied")).toBeDefined();
      expect(screen.getAllByText("₹850.00").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("InvoiceDetailsPage Integration & State Enforcements", () => {
    it("shows discount mutation actions for draft invoices and hides them for finalized invoices", () => {
      // 1. DRAFT INVOICE
      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: mockDraftInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof billingQueries.useInvoice>);

      vi.spyOn(billingQueries, "useInvoicePayments").mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof billingQueries.useInvoicePayments>);

      const { rerender } = render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <InvoiceDetailsPage id="inv-1" />
          </QueryClientProvider>
        </Provider>
      );

      // Draft state offers Apply Discount, Add Discount and line discount buttons
      const applyButtons = screen.getAllByRole("button", { name: /Apply Discount/i });
      expect(applyButtons.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("button", { name: /Discount History/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Finalize Invoice/i })).toBeDefined();

      // 2. FINALIZED INVOICE
      const finalizedInvoice: Invoice = {
        ...mockDraftInvoice,
        status: "finalized",
        paymentStatus: "unpaid",
      };

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: finalizedInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof billingQueries.useInvoice>);

      rerender(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <InvoiceDetailsPage id="inv-1" />
          </QueryClientProvider>
        </Provider>
      );

      // Finalized state must NOT offer discount mutation actions
      expect(screen.queryByRole("button", { name: /Apply Discount/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Add Discount/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Finalize Invoice/i })).toBeNull();
      // But Discount History audit trail remains viewable
      expect(screen.getByRole("button", { name: /Discount History/i })).toBeDefined();
    });

    it("displays granular financial breakdown with line discounts and invoice discounts", () => {
      const invoiceWithMultipleDiscounts: Invoice = {
        ...mockDraftInvoice,
        subtotal: 1500,
        lineDiscountsTotal: 200,
        invoiceDiscountsTotal: 100,
        discountTotal: 300,
        grossPayable: 1200,
        payableAmount: 1200,
        amountDue: 1200,
        appliedDiscounts: [
          {
            id: "disc-1",
            level: "line",
            lineId: "line-1",
            type: "fixed",
            enteredValue: 200,
            calculatedDiscount: 200,
            reason: "Line promo",
          },
          {
            id: "disc-2",
            level: "invoice",
            type: "percentage",
            enteredValue: 10,
            calculatedDiscount: 100,
            reason: "VIP discount",
          },
        ],
      };

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: invoiceWithMultipleDiscounts,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof billingQueries.useInvoice>);

      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <InvoiceDetailsPage id="inv-1" />
          </QueryClientProvider>
        </Provider>
      );

      expect(screen.getByText("↳ Line Item Discounts")).toBeDefined();
      expect(screen.getByText("↳ Invoice Level Discounts")).toBeDefined();
      expect(screen.getByText("Total Discounts")).toBeDefined();
      expect(screen.getByText("Applied Discounts (2)")).toBeDefined();
    });

    it("handles multi-line selection, live percentage and fixed preview calculations correctly in ApplyDiscountDialog", () => {
      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
            />
          </QueryClientProvider>
        </Provider>
      );

      // Select 'Selected Services' scope
      fireEvent.click(screen.getByRole("button", { name: /Selected Services/i }));

      // Check for Select All and Clear Selection
      const clearBtn = screen.getByRole("button", { name: /Clear Selection/i });
      fireEvent.click(clearBtn);
      expect(screen.getByText(/0 selected/i)).toBeDefined();

      const selectAllBtn = screen.getByRole("button", { name: /Select All/i });
      fireEvent.click(selectAllBtn);
      expect(screen.getAllByText(/1 selected/i).length).toBeGreaterThanOrEqual(1);

      // Enter percentage value 20%
      const valInput = screen.getByPlaceholderText("10");
      fireEvent.change(valInput, { target: { value: "20" } });

      // Live breakdown preview should display
      expect(screen.getByText(/Live Allocation Breakdown/i)).toBeDefined();
      expect(screen.getAllByText("Regular Haircut").length).toBeGreaterThanOrEqual(2); // In table and in preview
      expect(screen.getAllByText("-₹120.00").length).toBeGreaterThanOrEqual(1); // 20% of 600
      expect(screen.getByText("₹480.00")).toBeDefined(); // final
    });

    it("verifies accurate payload serialization on submission for invoice vs selected_lines discounts", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      vi.mocked(billingMutations.useApplyInvoiceDiscount).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof billingMutations.useApplyInvoiceDiscount>);

      const { unmount } = render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
            />
          </QueryClientProvider>
        </Provider>
      );

      // Default scope is "invoice"
      fireEvent.change(screen.getByPlaceholderText("10"), { target: { value: "10" } });
      fireEvent.change(
        screen.getByPlaceholderText(/Provide mandatory operational or business justification/i),
        { target: { value: "Invoice-wide promotion" } }
      );

      const form = document.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      // Verify that invoice-level discount payload omits lineId and lineIds (no null)
      const invoicePayload = mockMutateAsync.mock.calls[0][0].payload;
      expect(invoicePayload.discountLevel).toBe("invoice");
      expect(invoicePayload).not.toHaveProperty("lineId");
      expect(invoicePayload).not.toHaveProperty("lineIds");
      expect(invoicePayload.lineId).toBeUndefined();
      expect(invoicePayload.lineIds).toBeUndefined();

      unmount();
      mockMutateAsync.mockClear();

      // Now test selected_lines
      render(
        <Provider store={createTestStore()}>
          <QueryClientProvider client={queryClient}>
            <ApplyDiscountDialog
              isOpen={true}
              onClose={vi.fn()}
              invoice={mockDraftInvoice}
            />
          </QueryClientProvider>
        </Provider>
      );

      fireEvent.click(screen.getByRole("button", { name: /Selected Services/i }));
      fireEvent.change(screen.getByPlaceholderText("10"), { target: { value: "15" } });
      fireEvent.change(
        screen.getByPlaceholderText(/Provide mandatory operational or business justification/i),
        { target: { value: "Selected services promo" } }
      );

      const form2 = document.querySelector("form")!;
      fireEvent.submit(form2);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      const selectedPayload = mockMutateAsync.mock.calls[0][0].payload;
      expect(selectedPayload.discountLevel).toBe("selected_lines");
      expect(selectedPayload.lineIds).toEqual(["line-1"]);
      expect(selectedPayload).not.toHaveProperty("lineId");
      expect(selectedPayload.lineId).toBeUndefined();
    });
  });
});
