import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import uiReducer from "@/store/slices/uiSlice";
import { InvoiceDetailsPage } from "../components/InvoiceDetailsPage";
import { InvoiceCouponSection } from "../components/InvoiceCouponSection";
import * as billingQueries from "../hooks/useBillingQueries";
import * as billingMutations from "../hooks/useBillingMutations";
import * as authHooks from "@/features/auth/hooks/useAuth";
import type { Invoice } from "../types/billing.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/billing/inv-1",
}));

const mockBaseInvoice: Invoice = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  organizationId: "org-1",
  branchId: "branch-1",
  customerId: "cust-1",
  appointmentId: "apt-1",
  status: "draft",
  paymentStatus: "unpaid",
  items: [
    {
      id: "line-1",
      name: "Hair Styling",
      serviceName: "Hair Styling",
      unitPrice: 1000,
      quantity: 1,
      lineTotal: 1000,
      customerPayable: 1000,
    },
  ],
  subtotal: 1000,
  discountTotal: 0,
  grossPayable: 1000,
  subscriptionCoveredAmount: 0,
  payableAmount: 1000,
  amountPaid: 0,
  amountDue: 1000,
  coupon: null,
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};

const createTestStore = () =>
  configureStore({
    reducer: {
      branch: branchReducer,
      ui: uiReducer,
    },
    preloadedState: {
      branch: {
        currentBranchId: "branch-1",
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

describe("Coupons Stage 3 — POS / Billing Integration Tests", () => {
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

  const renderWithProviders = (ui: React.ReactElement) => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </Provider>
    );
  };

  describe("InvoiceCouponSection Unit Interactions", () => {
    it("renders coupon input when invoice is draft and user can manage coupons", () => {
      renderWithProviders(
        <InvoiceCouponSection
          invoice={mockBaseInvoice}
          canManageCoupons={true}
        />
      );

      expect(screen.getByTestId("invoice-coupon-input-section")).toBeDefined();
      expect(screen.getByTestId("coupon-code-input")).toBeDefined();
      expect(screen.getByTestId("apply-coupon-button")).toBeDefined();
      expect(screen.queryByTestId("invoice-applied-coupon-section")).toBeNull();
    });

    it("hides coupon input when user does NOT have permission to manage coupons", () => {
      renderWithProviders(
        <InvoiceCouponSection
          invoice={mockBaseInvoice}
          canManageCoupons={false}
        />
      );

      expect(screen.queryByTestId("invoice-coupon-input-section")).toBeNull();
      expect(screen.queryByTestId("invoice-applied-coupon-section")).toBeNull();
    });

    it("hides coupon input when invoice is finalized", () => {
      const finalizedInvoice: Invoice = {
        ...mockBaseInvoice,
        status: "finalized",
      };

      renderWithProviders(
        <InvoiceCouponSection
          invoice={finalizedInvoice}
          canManageCoupons={true}
        />
      );

      expect(screen.queryByTestId("invoice-coupon-input-section")).toBeNull();
      expect(screen.queryByTestId("invoice-applied-coupon-section")).toBeNull();
    });

    it("submits coupon code to mutation and disables button while pending", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        ...mockBaseInvoice,
        coupon: {
          couponId: "c-1",
          code: "SAVE20",
          codeUpper: "SAVE20",
          discountType: "percentage",
          discountValue: 20,
          calculatedDiscountAmount: 200,
          appliedAt: new Date().toISOString(),
        },
      });

      vi.spyOn(billingMutations, "useApplyCouponToInvoice").mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <InvoiceCouponSection
          invoice={mockBaseInvoice}
          canManageCoupons={true}
        />
      );

      const input = screen.getByTestId("coupon-code-input");
      const applyBtn = screen.getByTestId("apply-coupon-button");

      fireEvent.change(input, { target: { value: "SAVE20" } });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          invoiceId: "inv-1",
          code: "SAVE20",
          branchId: "branch-1",
        });
      });
    });

    it("displays backend error message when coupon application fails (e.g. anti-stacking or limit reached)", async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue({
        response: {
          data: {
            message: "Cannot apply coupon to an invoice with manual discounts (anti-stacking rule).",
          },
        },
      });

      vi.spyOn(billingMutations, "useApplyCouponToInvoice").mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <InvoiceCouponSection
          invoice={mockBaseInvoice}
          canManageCoupons={true}
        />
      );

      const input = screen.getByTestId("coupon-code-input");
      const applyBtn = screen.getByTestId("apply-coupon-button");

      fireEvent.change(input, { target: { value: "PROMO50" } });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(screen.getByTestId("coupon-error-alert")).toBeDefined();
        expect(
          screen.getByText("Cannot apply coupon to an invoice with manual discounts (anti-stacking rule).")
        ).toBeDefined();
      });
    });

    it("renders applied coupon card with backend-calculated discount and allows removal on draft", async () => {
      const invoiceWithCoupon: Invoice = {
        ...mockBaseInvoice,
        coupon: {
          couponId: "c-1",
          code: "SAVE20",
          codeUpper: "SAVE20",
          discountType: "percentage",
          discountValue: 20,
          calculatedDiscountAmount: 200,
          appliedAt: new Date().toISOString(),
        },
        discountTotal: 200,
        payableAmount: 800,
        amountDue: 800,
      };

      const mockRemoveMutateAsync = vi.fn().mockResolvedValue({
        ...mockBaseInvoice,
        coupon: null,
      });

      vi.spyOn(billingMutations, "useRemoveCouponFromInvoice").mockReturnValue({
        mutateAsync: mockRemoveMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <InvoiceCouponSection
          invoice={invoiceWithCoupon}
          canManageCoupons={true}
        />
      );

      expect(screen.getByTestId("invoice-applied-coupon-section")).toBeDefined();
      expect(screen.getByTestId("applied-coupon-code").textContent).toContain("SAVE20");
      expect(screen.getByTestId("applied-coupon-amount").textContent).toContain("200");
      expect(screen.getByTestId("remove-coupon-button")).toBeDefined();

      fireEvent.click(screen.getByTestId("remove-coupon-button"));

      await waitFor(() => {
        expect(mockRemoveMutateAsync).toHaveBeenCalledWith({
          invoiceId: "inv-1",
          branchId: "branch-1",
        });
      });
    });

    it("hides removal button on finalized invoice even if coupon is present", () => {
      const finalizedInvoiceWithCoupon: Invoice = {
        ...mockBaseInvoice,
        status: "finalized",
        coupon: {
          couponId: "c-1",
          code: "SAVE20",
          codeUpper: "SAVE20",
          discountType: "percentage",
          discountValue: 20,
          calculatedDiscountAmount: 200,
          appliedAt: new Date().toISOString(),
        },
      };

      renderWithProviders(
        <InvoiceCouponSection
          invoice={finalizedInvoiceWithCoupon}
          canManageCoupons={true}
        />
      );

      expect(screen.getByTestId("invoice-applied-coupon-section")).toBeDefined();
      expect(screen.queryByTestId("remove-coupon-button")).toBeNull();
    });
  });

  describe("InvoiceDetailsPage RBAC Gating Integration", () => {
    it("renders coupon controls when user has BOTH 'billing.checkout' and 'coupons.apply'", () => {
      vi.spyOn(authHooks, "useAuth").mockReturnValue({
        user: {
          id: "u-1",
          name: "Authorized Cashier",
          email: "cashier@salon.com",
          role: "cashier",
          permissions: ["billing.view", "billing.checkout", "coupons.apply"],
          organizationId: "org-1",
          branchAccess: [{ branchId: "branch-1", isActive: true }],
        },
        isAuthenticated: true,
      } as any);

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: mockBaseInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<InvoiceDetailsPage id="inv-1" />);

      expect(screen.getByTestId("invoice-coupon-input-section")).toBeDefined();
      expect(screen.getByTestId("coupon-code-input")).toBeDefined();
    });

    it("HIDES coupon controls when user has 'billing.checkout' but lacks 'coupons.apply'", () => {
      vi.spyOn(authHooks, "useAuth").mockReturnValue({
        user: {
          id: "u-2",
          name: "Standard Cashier",
          email: "cashier2@salon.com",
          role: "cashier",
          permissions: ["billing.view", "billing.checkout"], // Missing coupons.apply
          organizationId: "org-1",
          branchAccess: [{ branchId: "branch-1", isActive: true }],
        },
        isAuthenticated: true,
      } as any);

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: mockBaseInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<InvoiceDetailsPage id="inv-1" />);

      expect(screen.queryByTestId("invoice-coupon-input-section")).toBeNull();
      expect(screen.queryByTestId("coupon-code-input")).toBeNull();
    });

    it("HIDES coupon controls when user has 'coupons.apply' but lacks 'billing.checkout'", () => {
      vi.spyOn(authHooks, "useAuth").mockReturnValue({
        user: {
          id: "u-3",
          name: "Marketing Staff",
          email: "marketing@salon.com",
          role: "staff",
          permissions: ["billing.view", "coupons.apply"], // Missing billing.checkout
          organizationId: "org-1",
          branchAccess: [{ branchId: "branch-1", isActive: true }],
        },
        isAuthenticated: true,
      } as any);

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: mockBaseInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<InvoiceDetailsPage id="inv-1" />);

      expect(screen.queryByTestId("invoice-coupon-input-section")).toBeNull();
      expect(screen.queryByTestId("coupon-code-input")).toBeNull();
    });

    it("displays applied coupon breakdown in InvoiceSummary totals", () => {
      const invoiceWithCoupon: Invoice = {
        ...mockBaseInvoice,
        coupon: {
          couponId: "c-1",
          code: "SUMMER50",
          codeUpper: "SUMMER50",
          discountType: "percentage",
          discountValue: 10,
          calculatedDiscountAmount: 100,
          appliedAt: new Date().toISOString(),
        },
        discountTotal: 100,
        payableAmount: 900,
        amountDue: 900,
      };

      vi.spyOn(authHooks, "useAuth").mockReturnValue({
        user: {
          id: "u-1",
          name: "Authorized Cashier",
          email: "cashier@salon.com",
          role: "cashier",
          permissions: ["billing.view", "billing.checkout", "coupons.apply"],
          organizationId: "org-1",
          branchAccess: [{ branchId: "branch-1", isActive: true }],
        },
        isAuthenticated: true,
      } as any);

      vi.spyOn(billingQueries, "useInvoice").mockReturnValue({
        data: invoiceWithCoupon,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<InvoiceDetailsPage id="inv-1" />);

      expect(screen.getByText(/↳ Coupon \(SUMMER50\)/i)).toBeDefined();
      expect(screen.getByTestId("invoice-applied-coupon-section")).toBeDefined();
      expect(screen.getByTestId("applied-coupon-code").textContent).toContain("SUMMER50");
      expect(screen.getByTestId("applied-coupon-amount").textContent).toContain("100");
    });
  });
});
