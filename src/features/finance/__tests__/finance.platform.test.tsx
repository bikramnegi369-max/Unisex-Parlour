import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  getBranchPerformance: vi.fn(),
  getTransactions: vi.fn(),
  getAuditHistory: vi.fn(),
  getFinancialReports: vi.fn(),
  exportFinancialReport: vi.fn(),
  getOperatingProfit: vi.fn(),
  getFinancialAlerts: vi.fn(),
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

vi.mock("../api/finance.api", () => ({
  financeApi: {
    getBranchPerformance: mocks.getBranchPerformance,
    getTransactions: mocks.getTransactions,
    getAuditHistory: mocks.getAuditHistory,
    getFinancialReports: mocks.getFinancialReports,
    exportFinancialReport: mocks.exportFinancialReport,
    getOperatingProfit: mocks.getOperatingProfit,
    getFinancialAlerts: mocks.getFinancialAlerts,
  },
}));

vi.mock("../hooks", async () => {
  const actual = await vi.importActual<any>("../hooks");
  return {
    ...actual,
    useBranchPerformance: () => ({
      data: {
        period: { startDate: "2026-11-01", endDate: "2026-11-30" },
        branches: [
          {
            branchId: "b-1",
            branchName: "Downtown Salon",
            grossRevenue: 50000,
            refunds: 1000,
            netRevenue: 49000,
            invoiceCount: 40,
            operatingExpenses: 10000,
            finalizedGrossPayroll: 15000,
            actualDisbursedPayroll: 12000,
            operatingResult: 24000,
            operatingMarginPercentage: 48.98,
            unreconciledClosuresCount: 0,
            pendingExpenseApprovalsCount: 1,
            timezone: "Asia/Kolkata",
          },
        ],
        consolidated: {
          grossRevenue: 50000,
          refunds: 1000,
          netRevenue: 49000,
          invoiceCount: 40,
          totalCollected: 49000,
          operatingExpenses: 10000,
          finalizedGrossPayroll: 15000,
          actualDisbursedPayroll: 12000,
          operatingResult: 24000,
          operatingMarginPercentage: 48.98,
        },
      },
      isLoading: false,
    }),
    useOperatingProfit: () => ({
      data: {
        period: { startDate: "2026-11-01", endDate: "2026-11-30", timezone: "Asia/Kolkata" },
        costCoverageNotice:
          "Operating Result reflects Net Revenue minus Approved Operating Expenses and Finalized Gross Payroll. Stock consumption (COGS) is excluded due to lack of batch valuation.",
        grossRevenue: 100000,
        refunds: 2000,
        netRevenue: 98000,
        invoiceCount: 75,
        revenueStreams: {
          services: 70000,
          retailProducts: 20000,
          memberships: 5000,
          subscriptions: 5000,
        },
        collections: {
          cash: 25000,
          card: 35000,
          upi: 36000,
          other: 2000,
          totalCollected: 98000,
          netCollections: 96000,
        },
        operatingExpenses: {
          utilities: 8000,
          maintenance: 4000,
          total: 12000,
        },
        workforceCosts: {
          finalizedGrossPayroll: 35000,
          approvedStaffCount: 8,
          actualDisbursedPayroll: 30000,
          disbursedPaymentsCount: 7,
        },
        operatingProfit: 51000,
        operatingResult: 51000,
        operatingMarginPercentage: 52.04,
      },
      isLoading: false,
      refetch: vi.fn(),
    }),
    useFinancialAlerts: () => ({
      data: {
        pendingExpenseApprovals: { count: 3, totalAmount: 7500 },
        unreconciledClosures: { count: 2, totalDiscrepancy: 450 },
        outstandingSupplierInvoices: { count: 4, totalUnpaidAmount: 22000 },
        outstandingPayrollObligations: { count: 3, totalUnpaidAmount: 18000 },
      },
      isLoading: false,
    }),
    useFinancialTransactions: () => ({
      data: {
        items: [
          {
            id: "tx-1",
            sourceType: "customer_payment",
            sourceId: "pay-101",
            eventDate: "2026-11-15T10:00:00Z",
            amount: 1500,
            direction: "inflow",
            method: "upi",
            category: "Customer Payment",
            referenceNumber: "TXN-INV-001",
            description: "Hair Styling invoice settlement",
            status: "completed",
          },
          {
            id: "tx-2",
            sourceType: "expense",
            sourceId: "exp-201",
            eventDate: "2026-11-16T14:30:00Z",
            amount: 3200,
            direction: "outflow",
            method: "bank_transfer",
            category: "utilities",
            referenceNumber: "EXP-002",
            description: "Salon electricity bill",
            status: "completed",
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        summary: { totalInflow: 1500, totalOutflow: 3200, netCashFlow: -1700 },
      },
      isLoading: false,
    }),
    useFinanceAuditHistory: () => ({
      data: {
        items: [
          {
            id: "audit-1",
            entityType: "day_closure",
            action: "closure_approved",
            timestamp: "2026-11-20T18:00:00Z",
            actorName: "Operations Manager",
            actorEmail: "manager@salon.com",
            referenceNumber: "DC-2026-11-20",
            amount: 25000,
            noteOrReason: "Verified drawer physical cash tally against register",
            details: { discrepancy: 0 },
          },
          {
            id: "audit-2",
            entityType: "expense",
            action: "expense_rejected",
            timestamp: "2026-11-19T11:20:00Z",
            actorName: "Finance Director",
            actorEmail: "director@salon.com",
            referenceNumber: "EXP-889",
            amount: 4500,
            noteOrReason: "Missing tax invoice receipt attachment",
          },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
    }),
    useFinancialReports: () => ({
      data: {
        grossRevenue: 100000,
        refunds: 2000,
        netRevenue: 98000,
        operatingExpenses: { utilities: 8000, total: 8000 },
        workforceCosts: { finalizedGrossPayroll: 35000, approvedStaffCount: 8 },
        operatingResult: 55000,
        operatingMarginPercentage: 56.12,
        collections: { cash: 25000, card: 35000, upi: 36000, totalCollected: 96000, netCollections: 94000 },
      },
      isLoading: false,
    }),
    useExportFinancialReport: () => ({
      mutate: mocks.exportFinancialReport,
      isPending: false,
    }),
  };
});

import FinanceNavigation from "../components/FinanceNavigation";
import BranchPerformanceMatrix from "../components/BranchPerformanceMatrix";
import RevenueCollectionsView from "../components/RevenueCollectionsView";
import PayrollCostsView from "../components/PayrollCostsView";
import SupplierObligationsView from "../components/SupplierObligationsView";
import ProfitabilityView from "../components/ProfitabilityView";
import FinancialReportsView from "../components/FinancialReportsView";
import FinanceAuditHistoryView from "../components/FinanceAuditHistoryView";
import FinancialTransactionsRegister from "../components/FinancialTransactionsRegister";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("Finance Platform UI Components & Mentorship Coverage", () => {
  beforeEach(() => {
    mocks.useBranchContext.mockReturnValue({
      currentBranch: { id: "branch-1", name: "Downtown Salon", timezone: "Asia/Kolkata" },
      currentBranchId: "branch-1",
      isAllBranchesSelected: false,
      getBranchQueryKey: (entity: string, extra: any[] = []) => [entity, "branch-1", ...extra],
    });
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "user-1", name: "Salon Owner", role: "owner", hasOrgWideAccess: true },
    });
    mocks.hasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("FinanceNavigation Role-Adaptive Navigation", () => {
    it("renders all 11 sub-navigation areas for Owner with active badges", () => {
      const onSelectTab = vi.fn();
      render(
        <FinanceNavigation
          activeTab="overview"
          onSelectTab={onSelectTab}
          pendingApprovalsCount={3}
          unreconciledClosuresCount={2}
        />
      );

      expect(screen.getByText("Financial Overview")).toBeInTheDocument();
      expect(screen.getByText("Revenue & Collections")).toBeInTheDocument();
      expect(screen.getByText("Operating Expenses")).toBeInTheDocument();
      expect(screen.getByText("Petty Cash Drawer")).toBeInTheDocument();
      expect(screen.getByText("Daily Register Closing")).toBeInTheDocument();
      expect(screen.getByText("Payroll Costs")).toBeInTheDocument();
      expect(screen.getByText("Supplier Obligations")).toBeInTheDocument();
      expect(screen.getByText("Profitability & Branches")).toBeInTheDocument();
      expect(screen.getByText("Financial Transactions")).toBeInTheDocument();
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("Audit History")).toBeInTheDocument();

      // Check badges
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2 Unreconciled")).toBeInTheDocument();
    });

    it("restricts cashier to daily-closing and revenue, hiding executive tabs", () => {
      mocks.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: "user-2", name: "Cashier Alice", role: "cashier", hasOrgWideAccess: false },
      });
      // Cashier lacks finance.view
      mocks.hasPermission.mockImplementation((user, perm) => perm === "finance.create");

      const onSelectTab = vi.fn();
      render(
        <FinanceNavigation
          activeTab="daily-closing"
          onSelectTab={onSelectTab}
        />
      );

      expect(screen.getByText("Daily Register Closing")).toBeInTheDocument();
      expect(screen.queryByText("Financial Overview")).not.toBeInTheDocument();
      expect(screen.queryByText("Operating Expenses")).not.toBeInTheDocument();
      expect(screen.queryByText("Profitability & Branches")).not.toBeInTheDocument();
      expect(screen.queryByText("Audit History")).not.toBeInTheDocument();
    });
  });

  describe("BranchPerformanceMatrix Component", () => {
    it("renders side-by-side branch comparison matrix and consolidated figures", () => {
      renderWithClient(<BranchPerformanceMatrix />);
      expect(screen.getAllByText("Downtown Salon").length).toBeGreaterThan(0);
      expect(screen.getByText("Consolidated Net Revenue")).toBeInTheDocument();
      expect(screen.getAllByText("48.98%").length).toBeGreaterThan(0);
    });
  });

  describe("RevenueCollectionsView Component", () => {
    it("displays invoiced revenue streams vs tender collections and net collections", () => {
      renderWithClient(<RevenueCollectionsView />);
      expect(screen.getByText("Gross Invoiced Revenue")).toBeInTheDocument();
      expect(screen.getByText("Actual Collections by Payment Tender")).toBeInTheDocument();
      expect(screen.getByText("Invoiced Revenue by Category")).toBeInTheDocument();
      expect(screen.getByText("Salon Hair & Beauty Services")).toBeInTheDocument();
    });
  });

  describe("PayrollCostsView Component", () => {
    it("displays recognized gross payroll, actual disbursements, and non-double-counting explanation", () => {
      renderWithClient(<PayrollCostsView />);
      expect(screen.getAllByText("Recognized Payroll Expense").length).toBeGreaterThan(0);
      expect(screen.getByText("Actual Cash Disbursed")).toBeInTheDocument();
      expect(screen.getByText("Outstanding Salary Obligations")).toBeInTheDocument();
      expect(
        screen.getByText(/Authoritative Payroll Cost Accounting Principle/i)
      ).toBeInTheDocument();
    });
  });

  describe("SupplierObligationsView Component", () => {
    it("renders supplier accounts payable and explains inventory non-double-counting safeguard", () => {
      renderWithClient(<SupplierObligationsView />);
      expect(screen.getByText("Supplier Accounts Payable")).toBeInTheDocument();
      expect(
        screen.getByText(/Procurement Double-Counting Safeguard/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Vendor Obligations Register")).toBeInTheDocument();
    });
  });

  describe("ProfitabilityView Component", () => {
    it("renders Statement of Operating Results, cost coverage notice, and margin %", () => {
      renderWithClient(<ProfitabilityView />);
      expect(
        screen.getByText("Statement of Operating Results (Before Stock Consumption)")
      ).toBeInTheDocument();
      expect(screen.getByText(/Stock consumption \(COGS\) is excluded/i)).toBeInTheDocument();
      expect(screen.getByText("Operating Margin:")).toBeInTheDocument();
      expect(screen.getByText("52.04%")).toBeInTheDocument();
    });
  });

  describe("FinancialReportsView Component", () => {
    it("renders report type tabs and handles export CSV mutation trigger", () => {
      renderWithClient(<FinancialReportsView />);
      expect(screen.getByText("Authoritative Financial Reports & Exports")).toBeInTheDocument();
      expect(screen.getAllByText("Operating P&L Statement").length).toBeGreaterThan(0);
      expect(screen.getByText("Tender Reconciliation")).toBeInTheDocument();
      expect(screen.getByText("Operating Expenses Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Revenue Streams Summary")).toBeInTheDocument();

      const exportBtn = screen.getByRole("button", { name: /Export CSV/i });
      fireEvent.click(exportBtn);
      expect(mocks.exportFinancialReport).toHaveBeenCalled();
    });
  });

  describe("FinanceAuditHistoryView Component", () => {
    it("renders audit trail items, entity badges, and opens inspection dialog", () => {
      renderWithClient(<FinanceAuditHistoryView />);
      expect(
        screen.getByText("Financial Audit History & Sign-Off Trail")
      ).toBeInTheDocument();
      expect(screen.getByText("DC-2026-11-20")).toBeInTheDocument();
      expect(screen.getByText("EXP-889")).toBeInTheDocument();
      expect(screen.getByText("Operations Manager")).toBeInTheDocument();

      // Inspect click
      const inspectButtons = screen.getAllByRole("button", { name: /Inspect/i });
      fireEvent.click(inspectButtons[0]);
      expect(screen.getByText("Audit Event Deep Inspection")).toBeInTheDocument();
    });
  });

  describe("FinancialTransactionsRegister Component", () => {
    it("renders multi-stream searchable ledger with deterministic pagination", () => {
      renderWithClient(<FinancialTransactionsRegister />);
      expect(screen.getByText("Unified Financial Register")).toBeInTheDocument();
      expect(screen.getByText("TXN-INV-001")).toBeInTheDocument();
      expect(screen.getByText("EXP-002")).toBeInTheDocument();
      expect(screen.getByText("Hair Styling invoice settlement")).toBeInTheDocument();
    });
  });
});
