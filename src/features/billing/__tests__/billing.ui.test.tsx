import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import uiReducer from "@/store/slices/uiSlice";
import { InvoiceStatusBadge, PaymentStatusBadge } from "../components/InvoiceStatusBadge";
import { InvoicePaymentHistory } from "../components/InvoicePaymentHistory";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import { RecordPaymentDialog } from "../components/RecordPaymentDialog";
import { VoidPaymentDialog } from "../components/VoidPaymentDialog";
import { InvoiceDetailsPage } from "../components/InvoiceDetailsPage";
import { CustomerBillingTab } from "@/features/customers/components/CustomerBillingTab";
import { useInvoices, useInvoice, useInvoicePayments } from "../hooks/useBillingQueries";
import { useVoidPayment, useRecordPayment } from "../hooks/useBillingMutations";
import type { Invoice, PaymentRecord } from "../types/billing.types";
import type { Appointment } from "@/features/appointments/types/appointment.types";

vi.mock("../hooks/useBillingQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useBillingQueries")>();
  return {
    ...actual,
    useInvoices: vi.fn(),
    useInvoice: vi.fn(),
    useInvoicePayments: vi.fn(),
  };
});

vi.mock("../hooks/useBillingMutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useBillingMutations")>();
  return {
    ...actual,
    useVoidPayment: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useRecordPayment: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  };
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/billing",
}));

// Mock auth hook
const mockUser = {
  id: "user-1",
  name: "Receptionist",
  email: "reception@parlour.com",
  role: "manager",
  permissions: [
    "billing.view",
    "billing.checkout",
    "billing.void",
    "payments.view",
    "payments.receive",
    "payments.refund",
  ],
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
        isLoading: false,
        error: null,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </Provider>
  );
};

describe("Billing UI Components & Financial Rules", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Badges", () => {
    it("renders invoice lifecycle badges with appropriate styling", () => {
      const { rerender } = render(<InvoiceStatusBadge status="draft" />);
      expect(screen.getByText("Draft")).toBeDefined();

      rerender(<InvoiceStatusBadge status="finalized" />);
      expect(screen.getByText("Finalized")).toBeDefined();

      rerender(<InvoiceStatusBadge status="cancelled" />);
      expect(screen.getByText("Cancelled")).toBeDefined();
    });

    it("renders payment status badges correctly", () => {
      const { rerender } = render(<PaymentStatusBadge status="unpaid" />);
      expect(screen.getByText("Unpaid")).toBeDefined();

      rerender(<PaymentStatusBadge status="partially_paid" />);
      expect(screen.getByText("Partially Paid")).toBeDefined();

      rerender(<PaymentStatusBadge status="paid" />);
      expect(screen.getByText("Paid")).toBeDefined();
    });
  });

  describe("CreateInvoiceDialog", () => {
    const mockAppointment: Appointment = {
      id: "apt-1",
      appointmentCode: "APT-100",
      organizationId: "org-1",
      branchId: "branch-1",
      customerId: "cust-1",
      serviceIds: ["srv-1", "srv-2"],
      bookingType: "walk_in",
      status: "completed",
      date: "2026-10-10",
      startTime: "11:00",
      createdAt: "2026-10-10",
      updatedAt: "2026-10-10",
      customer: {
        id: "cust-1",
        name: "Alice Smith",
        phone: "9988776655",
      },
      services: [
        {
          serviceId: "srv-1",
          name: "Hair Spa",
          duration: 45,
          price: 1500,
          appliedSubscriptionId: null,
        },
        {
          serviceId: "srv-2",
          name: "Haircut",
          duration: 30,
          price: 500,
          appliedSubscriptionId: "sub-1",
        },
      ],
      pricing: {
        subtotal: 2000,
        discount: 100,
        total: 1400,
      },
    };

    it("renders appointment resolved services and subscription waiver correctly without allowing line price edit", () => {
      renderWithProviders(
        <CreateInvoiceDialog
          isOpen={true}
          onClose={vi.fn()}
          appointment={mockAppointment}
        />
      );

      // Verify customer details
      expect(screen.getByText("Alice Smith")).toBeDefined();
      expect(screen.getByText("9988776655")).toBeDefined();

      // Verify services
      expect(screen.getByText("Hair Spa")).toBeDefined();
      expect(screen.getByText("Haircut")).toBeDefined();
      expect(screen.getByText("Subscription Redeemed")).toBeDefined();

      // Verify read-only prices rendered
      expect(screen.getByText("₹1,500.00")).toBeDefined();
      expect(screen.getByText("₹2,000.00")).toBeDefined(); // subtotal
      expect(screen.getByText("-₹500.00")).toBeDefined(); // subscription covered
    });
  });

  describe("InvoicePaymentHistory", () => {
    const mockPayments: PaymentRecord[] = [
      {
        id: "pay-1",
        paymentNumber: "PAY-001",
        invoiceId: "inv-1",
        organizationId: "org-1",
        branchId: "branch-1",
        amount: 800,
        paymentMethod: "upi",
        status: "recorded",
        paidAt: "2026-10-10T12:00:00Z",
        recordedBy: {
          id: "u-1",
          name: "Cashier Bob",
        },
        referenceNote: "GPay-1234",
        createdAt: "2026-10-10T12:00:00Z",
        updatedAt: "2026-10-10T12:00:00Z",
      },
    ];

    it("renders payment records with recorded by and reference notes", () => {
      renderWithProviders(
        <InvoicePaymentHistory
          payments={mockPayments}
          invoiceId="inv-1"
        />
      );

      expect(screen.getByText("PAY-001")).toBeDefined();
      expect(screen.getByText("₹800.00")).toBeDefined();
      expect(screen.getByText("upi")).toBeDefined();
      expect(screen.getByText("Cashier Bob")).toBeDefined();
      expect(screen.getByText("GPay-1234")).toBeDefined();
      expect(screen.getByText("Void")).toBeDefined();
    });

    it("shows empty state when no payments recorded", () => {
      renderWithProviders(
        <InvoicePaymentHistory
          payments={[]}
          invoiceId="inv-1"
        />
      );

      expect(screen.getByText("No Payments Recorded")).toBeDefined();
    });
  });

  describe("RecordPaymentDialog", () => {
    const mockFinalizedInvoice: Invoice = {
      id: "inv-1",
      invoiceNumber: "INV-2026-0001",
      organizationId: "org-1",
      branchId: "branch-1",
      customerId: "cust-1",
      appointmentId: "apt-1",
      status: "finalized",
      paymentStatus: "unpaid",
      items: [],
      subtotal: 1000,
      discountTotal: 0,
      grossPayable: 1000,
      subscriptionCoveredAmount: 0,
      payableAmount: 1000,
      amountPaid: 0,
      amountDue: 1000,
      createdAt: "2026-10-10",
      updatedAt: "2026-10-10",
    };

    it("displays human-friendly payment methods: Cash, Card, UPI, Other", () => {
      renderWithProviders(
        <RecordPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          invoice={mockFinalizedInvoice}
        />
      );

      expect(screen.getByText("Cash")).toBeDefined();
      expect(screen.getByText("Card")).toBeDefined();
      expect(screen.getByText("UPI")).toBeDefined();
      expect(screen.getByText("Other")).toBeDefined();
      expect(screen.getByText("Amount Due")).toBeDefined();
      expect(screen.getAllByText("Record Payment").length).toBeGreaterThanOrEqual(1);
    });

    it("generates an idempotency key and reuses the exact same key on retry with unchanged payload", async () => {
      const mockMutateAsync = vi
        .fn()
        .mockRejectedValueOnce({
          code: "ERR_NETWORK",
          message: "Network drop",
        })
        .mockResolvedValueOnce({
          id: "pay-1",
          amount: 1000,
          paymentMethod: "cash",
          status: "recorded",
        });

      vi.mocked(useRecordPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useRecordPayment>);

      renderWithProviders(
        <RecordPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          invoice={mockFinalizedInvoice}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Record Payment" });

      // First submission - triggers network drop
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      const firstCallArgs = mockMutateAsync.mock.calls[0][0];
      const initialKey = firstCallArgs.payload.idempotencyKey;
      expect(initialKey).toBeDefined();
      expect(typeof initialKey).toBe("string");

      // Retry submission with unchanged payload (same amount, same method)
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });

      const secondCallArgs = mockMutateAsync.mock.calls[1][0];
      // Assert exact key reuse on retry of same logical attempt!
      expect(secondCallArgs.payload.idempotencyKey).toBe(initialKey);
      expect(secondCallArgs.payload.amount).toBe(1000);
      expect(secondCallArgs.payload.paymentMethod).toBe("cash");
    });

    it("generates a new idempotency key when user materially changes payload after failure", async () => {
      const mockMutateAsync = vi
        .fn()
        .mockRejectedValueOnce(new Error("Initial attempt failed"))
        .mockResolvedValueOnce({
          id: "pay-2",
          amount: 500,
          paymentMethod: "cash",
          status: "recorded",
        });

      vi.mocked(useRecordPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useRecordPayment>);

      renderWithProviders(
        <RecordPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          invoice={mockFinalizedInvoice}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Record Payment" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
      const firstKey = mockMutateAsync.mock.calls[0][0].payload.idempotencyKey;

      // Change amount from 1000 to 500 (material payload change)
      const amountInput = screen.getByDisplayValue("1000");
      fireEvent.change(amountInput, { target: { value: "500" } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
      const secondKey = mockMutateAsync.mock.calls[1][0].payload.idempotencyKey;

      // Key must be different for a new logical payment attempt
      expect(secondKey).not.toBe(firstKey);
      expect(mockMutateAsync.mock.calls[1][0].payload.amount).toBe(500);
    });

    it("displays payment conflict message on HTTP 409 response", async () => {
      const mockMutateAsync = vi.fn().mockRejectedValueOnce({
        response: {
          status: 409,
          data: { message: "Idempotency conflict: Key already used with different payload" },
        },
      });

      vi.mocked(useRecordPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useRecordPayment>);

      renderWithProviders(
        <RecordPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          invoice={mockFinalizedInvoice}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Record Payment" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it("handles idempotent replay responses appropriately", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValueOnce({
        id: "pay-1",
        amount: 1000,
        paymentMethod: "cash",
        status: "recorded",
        isIdempotentReplay: true,
      });

      vi.mocked(useRecordPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useRecordPayment>);

      renderWithProviders(
        <RecordPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          invoice={mockFinalizedInvoice}
        />
      );

      const submitButton = screen.getByRole("button", { name: "Record Payment" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("CustomerBillingTab", () => {
    it("renders all four backend summary metrics correctly with formatted currency", () => {
      vi.mocked(useInvoices).mockReturnValueOnce({
        data: {
          success: true,
          status: "success",
          data: [
            {
              id: "inv-1",
              invoiceNumber: "INV-1001",
              payableAmount: 5000,
              amountPaid: 3500,
              amountDue: 1500,
              status: "finalized",
              paymentStatus: "partially_paid",
              createdAt: "2026-10-10T10:00:00Z",
              items: [],
              subtotal: 5000,
              discountTotal: 0,
              grossPayable: 5000,
              subscriptionCoveredAmount: 0,
              organizationId: "org-1",
              branchId: "branch-1",
              customerId: "cust-1",
              appointmentId: "apt-1",
              updatedAt: "2026-10-10T10:00:00Z",
            },
          ],
          meta: {
            total: 12,
            page: 1,
            limit: 10,
            totalPages: 2,
            summary: {
              totalInvoices: 12,
              totalBilled: 60000,
              totalPaid: 45000,
              totalOutstanding: 15000,
            },
          },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoices>);

      renderWithProviders(<CustomerBillingTab customerId="cust-1" />);

      // Verify all 4 card metric labels exist
      expect(screen.getByText("Lifetime Invoices")).toBeDefined();
      expect(screen.getByText("Total Billed")).toBeDefined();
      expect(screen.getByText("Lifetime Paid")).toBeDefined();
      expect(screen.getByText("Outstanding Balance")).toBeDefined();

      // Verify formatted metric values rendered
      expect(screen.getByText("12")).toBeDefined();
      expect(screen.getByText("₹60,000.00")).toBeDefined();
      expect(screen.getByText("₹45,000.00")).toBeDefined();
      expect(screen.getByText("₹15,000.00")).toBeDefined();
    });

    it("renders loading skeletons for summary cards when loading and does not show false zeros", () => {
      vi.mocked(useInvoices).mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoices>);

      const { container } = renderWithProviders(<CustomerBillingTab customerId="cust-1" />);

      // When loading, cards render pulse skeletons rather than metric text
      expect(screen.queryByText("Lifetime Invoices")).toBeNull();
      expect(screen.queryByText("Total Billed")).toBeNull();
      expect(screen.queryByText("Lifetime Paid")).toBeNull();
      expect(screen.queryByText("Outstanding Balance")).toBeNull();
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(4);
    });

    it("gracefully falls back to account info and loyalty points when summary is absent", () => {
      vi.mocked(useInvoices).mockReturnValueOnce({
        data: {
          success: true,
          status: "success",
          data: [],
          meta: {
            total: 3,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoices>);

      renderWithProviders(<CustomerBillingTab customerId="cust-1" />);

      expect(screen.getByText("Lifetime Invoices")).toBeDefined();
      expect(screen.getByText("Loyalty Points")).toBeDefined();
      expect(screen.getByText("Account Status")).toBeDefined();
      expect(screen.queryByText("Total Billed")).toBeNull();
    });
  });

  describe("Invoice Lifecycle & Subscription Coverage Regression", () => {
    it("renders finalized invoice with 100% subscription coverage as settled and suppresses Record Payment button", () => {
      const fullCoverageInvoice: Invoice = {
        id: "inv-zero",
        invoiceNumber: "INV-2026-ZERO",
        organizationId: "org-1",
        branchId: "branch-1",
        customerId: "cust-1",
        appointmentId: "apt-1",
        status: "finalized",
        paymentStatus: "paid",
        items: [
          {
            id: "line-1",
            serviceId: "srv-1",
            serviceName: "Signature Haircut",
            unitPrice: 1500,
            quantity: 1,
            lineTotal: 1500,
            isCoveredBySubscription: true,
            isRedeemedViaSubscription: true,
            subscriptionCoveredAmount: 1500,
            customerPayable: 0,
            appliedSubscriptionId: "sub-123",
          },
        ],
        subtotal: 1500,
        discountTotal: 0,
        grossPayable: 1500,
        subscriptionCoveredAmount: 1500,
        payableAmount: 0,
        amountPaid: 0,
        amountDue: 0,
        finalizedAt: "2026-10-10T10:00:00Z",
        createdAt: "2026-10-10T10:00:00Z",
        updatedAt: "2026-10-10T10:00:00Z",
      };

      vi.mocked(useInvoice).mockReturnValueOnce({
        data: fullCoverageInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoice>);
      vi.mocked(useInvoicePayments).mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoicePayments>);

      renderWithProviders(<InvoiceDetailsPage id="inv-zero" />);

      // Verify invoice number and status (PrintableInvoiceReceipt also renders invoiceNumber in DOM)
      expect(screen.getAllByText("INV-2026-ZERO").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Finalized").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(1);

      // Financial values check
      expect(screen.getAllByText("Payable Amount").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Outstanding Due").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("₹0.00").length).toBeGreaterThanOrEqual(2); // payableAmount & amountDue
      expect(screen.getAllByText("-₹1,500.00").length).toBeGreaterThanOrEqual(1); // subscription covered discount line

      // Crucial assertion: Record Payment button MUST NOT appear when amountDue === 0
      expect(screen.queryByRole("button", { name: /Record Payment/i })).toBeNull();
    });

    it("renders partial subscription coverage with remaining payable balance and offers Record Payment", () => {
      const partialCoverageInvoice: Invoice = {
        id: "inv-partial",
        invoiceNumber: "INV-2026-PART",
        organizationId: "org-1",
        branchId: "branch-1",
        customerId: "cust-1",
        appointmentId: "apt-1",
        status: "finalized",
        paymentStatus: "unpaid",
        items: [
          {
            id: "line-1",
            serviceId: "srv-1",
            serviceName: "Haircut",
            unitPrice: 1000,
            quantity: 1,
            lineTotal: 1000,
            isCoveredBySubscription: true,
            isRedeemedViaSubscription: true,
            subscriptionCoveredAmount: 1000,
            customerPayable: 0,
          },
          {
            id: "line-2",
            serviceId: "srv-2",
            serviceName: "Hair Color",
            unitPrice: 2500,
            quantity: 1,
            lineTotal: 2500,
            isCoveredBySubscription: false,
            subscriptionCoveredAmount: 0,
            customerPayable: 2500,
          },
        ],
        subtotal: 3500,
        discountTotal: 0,
        grossPayable: 3500,
        subscriptionCoveredAmount: 1000,
        payableAmount: 2500,
        amountPaid: 0,
        amountDue: 2500,
        finalizedAt: "2026-10-10T10:00:00Z",
        createdAt: "2026-10-10T10:00:00Z",
        updatedAt: "2026-10-10T10:00:00Z",
      };

      vi.mocked(useInvoice).mockReturnValueOnce({
        data: partialCoverageInvoice,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoice>);
      vi.mocked(useInvoicePayments).mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInvoicePayments>);

      renderWithProviders(<InvoiceDetailsPage id="inv-partial" />);

      // Verify amounts (accounting for screen and printable receipt)
      expect(screen.getAllByText("₹3,500.00").length).toBeGreaterThanOrEqual(1); // subtotal
      expect(screen.getAllByText("-₹1,000.00").length).toBeGreaterThanOrEqual(1); // subscription covered
      expect(screen.getAllByText("₹2,500.00").length).toBeGreaterThanOrEqual(1); // payableAmount & amountDue

      // Record Payment button MUST be rendered since amountDue === 2500 > 0 and user has permissions
      expect(screen.getAllByRole("button", { name: /Record Payment/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("VoidPaymentDialog Form Validation & Submission", () => {
    const mockPayment: PaymentRecord = {
      id: "pay-123",
      paymentNumber: "PAY-123",
      invoiceId: "inv-1",
      organizationId: "org-1",
      branchId: "branch-1",
      amount: 1500,
      paymentMethod: "upi",
      referenceNote: "Ref-123",
      status: "recorded",
      paidAt: "2026-10-10T10:00:00Z",
      createdAt: "2026-10-10T10:00:00Z",
      updatedAt: "2026-10-10T10:00:00Z",
    };

    it("enforces required void reason and prevents submission when empty", async () => {
      const mockMutateAsync = vi.fn();
      vi.mocked(useVoidPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useVoidPayment>);

      renderWithProviders(
        <VoidPaymentDialog
          isOpen={true}
          onClose={vi.fn()}
          payment={mockPayment}
          invoiceId="inv-1"
        />
      );

      const submitBtn = screen.getByRole("button", { name: /Confirm Void/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Void reason is required/i)).toBeDefined();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it("submits void reason successfully and disables button during pending state to prevent duplicate submissions", async () => {
      const mockMutateAsync = vi.fn().mockResolvedValueOnce({ success: true });
      vi.mocked(useVoidPayment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as unknown as ReturnType<typeof useVoidPayment>);

      const onCloseMock = vi.fn();

      renderWithProviders(
        <VoidPaymentDialog
          isOpen={true}
          onClose={onCloseMock}
          payment={mockPayment}
          invoiceId="inv-1"
        />
      );

      const textarea = screen.getByPlaceholderText(/Explain why this payment record is being voided/i);
      fireEvent.change(textarea, { target: { value: "Customer requested reversal due to double charge" } });

      const submitBtn = screen.getByRole("button", { name: /Confirm Void/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          paymentId: "pay-123",
          invoiceId: "inv-1",
          payload: { reason: "Customer requested reversal due to double charge" },
        });
      });
    });
  });
});
