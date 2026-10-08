import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import uiReducer from "@/store/slices/uiSlice";
import { InvoiceStatusBadge, PaymentStatusBadge } from "../components/InvoiceStatusBadge";
import { InvoicePaymentHistory } from "../components/InvoicePaymentHistory";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import { RecordPaymentDialog } from "../components/RecordPaymentDialog";
import type { Invoice, PaymentRecord } from "../types/billing.types";
import type { Appointment } from "@/features/appointments/types/appointment.types";

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
  });
});
