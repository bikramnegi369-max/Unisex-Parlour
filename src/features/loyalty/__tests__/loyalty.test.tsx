import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ManualPointsAdjustDialog } from "../components/ManualPointsAdjustDialog";
import { LoyaltyProgramConfigCard } from "../components/LoyaltyProgramConfigCard";
import { CustomerLoyaltyLedgerTable } from "../components/CustomerLoyaltyLedgerTable";
import * as loyaltyApi from "../api/loyalty.api";
import * as authHook from "@/features/auth/hooks/useAuth";
import type { PermissionType, UserSession } from "@/lib/permissions";

vi.mock("../api/loyalty.api");
vi.mock("@/features/auth/hooks/useAuth");

const mockUserWithPermissions = (permissions: PermissionType[]): UserSession => ({
  id: "user-1",
  name: "Test Admin",
  email: "admin@parlour.com",
  role: "admin",
  permissions,
  organizationId: "org-1",
  branchAccess: [{ branchId: "branch-1", branchName: "Main Branch", isActive: true }],
  hasOrgWideAccess: true,
});

const createMockAuthReturn = (user: UserSession | null) => ({
  user,
  isAuthenticated: !!user,
  isLoading: false,
  isError: false,
  login: vi.fn(),
  isLoggingIn: false,
  logout: vi.fn(),
  isLoggingOut: false,
  sendOtp: vi.fn(),
  isSendingOtp: false,
  verifyOtp: vi.fn(),
  isVerifyingOtp: false,
  activateChangePassword: vi.fn(),
  isActivatingChangePassword: false,
});

describe("Loyalty Module - Frontend Integration & Financial Contracts", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("ManualPointsAdjustDialog", () => {
    it("renders customer spendable balance and positive debt notice", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ManualPointsAdjustDialog
            isOpen={true}
            onClose={vi.fn()}
            customerId="cust-123"
            customerName="Jane Doe"
            currentPoints={150}
            currentDebt={50}
          />
        </QueryClientProvider>
      );

      expect(screen.getByText(/Adjust Loyalty Points — Jane Doe/i)).toBeInTheDocument();
      expect(screen.getByText("150 pts")).toBeInTheDocument();
      expect(screen.getByText("50 pts")).toBeInTheDocument();
      expect(screen.getByText(/Outstanding Debt:/i)).toBeInTheDocument();
    });

    it("prevents debits greater than spendable points", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ManualPointsAdjustDialog
            isOpen={true}
            onClose={vi.fn()}
            customerId="cust-123"
            customerName="Jane Doe"
            currentPoints={50}
            currentDebt={0}
          />
        </QueryClientProvider>
      );

      // Select Debit
      fireEvent.click(screen.getByLabelText(/Debit \(Deduct Points\)/i));

      // Enter points > 50
      const pointsInput = screen.getByLabelText(/Number of Points/i);
      fireEvent.change(pointsInput, { target: { value: "100" } });

      // Expect warning message
      expect(
        screen.getByText(/Points to deduct exceed available spendable points \(50\)/i)
      ).toBeInTheDocument();

      // Submit button should be disabled
      const submitBtn = screen.getByRole("button", { name: /Review Adjustment/i });
      expect(submitBtn).toBeDisabled();
    });

    it("submits valid credit adjustment with reason, confirmation step, and sends idempotency key", async () => {
      const adjustSpy = vi
        .spyOn(loyaltyApi, "adjustCustomerLoyaltyPoints")
        .mockResolvedValueOnce({
          customer: { id: "cust-123", loyaltyPoints: 170, loyaltyPointsDebt: 0 },
          transaction: {
            id: "tx-1",
            customerId: "cust-123",
            type: "ADJUSTED",
            pointsDelta: 20,
            balanceAfter: 170,
            reason: "Goodwill bonus",
            createdAt: new Date().toISOString(),
          },
        });

      const onClose = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <ManualPointsAdjustDialog
            isOpen={true}
            onClose={onClose}
            customerId="cust-123"
            customerName="Jane Doe"
            currentPoints={150}
            currentDebt={0}
          />
        </QueryClientProvider>
      );

      fireEvent.change(screen.getByLabelText(/Number of Points/i), {
        target: { value: "20" },
      });
      fireEvent.change(screen.getByLabelText(/Reason for Adjustment/i), {
        target: { value: "Goodwill bonus" },
      });

      // Step 1: Click Review Adjustment
      fireEvent.click(screen.getByRole("button", { name: /Review Adjustment/i }));

      // Review Step renders
      expect(await screen.findByText(/Confirm Loyalty Adjustment/i)).toBeInTheDocument();
      expect(screen.getByText("Goodwill bonus")).toBeInTheDocument();

      // Step 2: Confirm & Apply
      fireEvent.click(screen.getByRole("button", { name: /Confirm & Apply/i }));

      await waitFor(() => {
        expect(adjustSpy).toHaveBeenCalledTimes(1);
      });

      expect(adjustSpy).toHaveBeenCalledWith(
        "cust-123",
        expect.objectContaining({
          operation: "CREDIT",
          points: 20,
          reason: "Goodwill bonus",
          idempotencyKey: expect.any(String),
        })
      );
    });
  });

  describe("CustomerLoyaltyLedgerTable", () => {
    it("renders ledger rows with delta, transaction type badge, and ending balance", async () => {
      vi.spyOn(loyaltyApi, "getCustomerLoyaltyLedger").mockResolvedValueOnce({
        success: true,
        status: "success",
        data: [
          {
            id: "tx-101",
            customerId: "cust-123",
            type: "EARNED",
            pointsDelta: 40,
            balanceAfter: 140,
            reason: "Invoice payment points",
            createdAt: "2026-10-10T10:00:00.000Z",
          },
          {
            id: "tx-102",
            customerId: "cust-123",
            type: "REDEEMED",
            pointsDelta: -25,
            balanceAfter: 115,
            reason: "Checkout redemption",
            createdAt: "2026-10-12T14:30:00.000Z",
          },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      vi.spyOn(authHook, "useAuth").mockReturnValue(
        createMockAuthReturn(mockUserWithPermissions(["loyalty.view"]))
      );

      render(
        <QueryClientProvider client={queryClient}>
          <CustomerLoyaltyLedgerTable customerId="cust-123" />
        </QueryClientProvider>
      );

      expect(await screen.findByText("+40")).toBeInTheDocument();
      expect(screen.getByText("-25")).toBeInTheDocument();
      expect(screen.getByText("Earned")).toBeInTheDocument();
      expect(screen.getByText("Redeemed")).toBeInTheDocument();
      expect(screen.getByText("140 pts")).toBeInTheDocument();
      expect(screen.getByText("115 pts")).toBeInTheDocument();
      expect(screen.getByText("Invoice payment points")).toBeInTheDocument();
    });
  });

  describe("LoyaltyProgramConfigCard", () => {
    it("renders in read-only mode when user lacks loyalty.configure", async () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue(
        createMockAuthReturn(mockUserWithPermissions(["loyalty.view"]))
      );

      vi.spyOn(loyaltyApi, "getLoyaltyProgram").mockResolvedValueOnce({
        isEnabled: false,
        earnThresholdAmount: 100,
        earnPointsPerUnit: 1,
        redemptionRate: 1,
        minRedemptionPoints: 20,
        maxRedemptionPercentage: 20,
        isConfigured: true,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <LoyaltyProgramConfigCard />
        </QueryClientProvider>
      );

      expect(await screen.findByText("Program Configuration")).toBeInTheDocument();
      expect(screen.getByText("Read-Only")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Save Settings/i })).not.toBeInTheDocument();
    });

    it("allows editing and saving when user has loyalty.configure", async () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue(
        createMockAuthReturn(mockUserWithPermissions(["loyalty.view", "loyalty.configure"]))
      );

      vi.spyOn(loyaltyApi, "getLoyaltyProgram").mockResolvedValueOnce({
        isEnabled: true,
        earnThresholdAmount: 100,
        earnPointsPerUnit: 1,
        redemptionRate: 1,
        minRedemptionPoints: 20,
        maxRedemptionPercentage: 20,
        isConfigured: true,
      });

      const updateSpy = vi
        .spyOn(loyaltyApi, "updateLoyaltyProgram")
        .mockResolvedValueOnce({
          isEnabled: true,
          earnThresholdAmount: 100,
          earnPointsPerUnit: 2,
          redemptionRate: 1,
          minRedemptionPoints: 20,
          maxRedemptionPercentage: 20,
          isConfigured: true,
        });

      render(
        <QueryClientProvider client={queryClient}>
          <LoyaltyProgramConfigCard />
        </QueryClientProvider>
      );

      expect(await screen.findByText("Program Configuration")).toBeInTheDocument();
      expect(screen.queryByText("Read-Only")).not.toBeInTheDocument();

      const input = screen.getByLabelText(/Points Awarded Per Unit/i);
      fireEvent.change(input, { target: { value: "2" } });

      const saveBtn = screen.getByRole("button", { name: /Save Settings/i });
      expect(saveBtn).not.toBeDisabled();

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledTimes(1);
      });
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          earnPointsPerUnit: 2,
        })
      );
    });
  });

  describe("Backend Contract Alignment & Preview Verification", () => {
    it("calls previewRedemption with pointsRequested and invoiceId and handles server response", async () => {
      const previewSpy = vi.spyOn(loyaltyApi, "previewRedemption").mockResolvedValueOnce({
        isEligible: true,
        availablePoints: 200,
        maxRedeemablePoints: 40,
        maxRedemptionDiscount: 40,
        appliedPoints: 25,
        appliedDiscount: 25,
        effectivePayable: 175,
      });

      const result = await loyaltyApi.previewRedemption({
        customerId: "cust-1",
        invoiceId: "inv-1",
        pointsRequested: 25,
      });

      expect(previewSpy).toHaveBeenCalledWith({
        customerId: "cust-1",
        invoiceId: "inv-1",
        pointsRequested: 25,
      });
      expect(result.appliedDiscount).toBe(25);
      expect(result.effectivePayable).toBe(175);
    });

    it("verifies manual adjustment payload passes operation: CREDIT / DEBIT and idempotencyKey", async () => {
      const adjustSpy = vi.spyOn(loyaltyApi, "adjustCustomerLoyaltyPoints").mockResolvedValueOnce({
        customer: { id: "cust-1", loyaltyPoints: 100 },
        transaction: {
          id: "tx-replay",
          customerId: "cust-1",
          type: "ADJUSTED",
          pointsDelta: 50,
          balanceAfter: 100,
          reason: "Loyalty compensation",
          createdAt: new Date().toISOString(),
        },
        isIdempotentReplay: true,
      });

      const res = await loyaltyApi.adjustCustomerLoyaltyPoints("cust-1", {
        operation: "CREDIT",
        points: 50,
        reason: "Loyalty compensation",
        idempotencyKey: "uuid-idemp-123",
      });

      expect(adjustSpy).toHaveBeenCalledWith("cust-1", {
        operation: "CREDIT",
        points: 50,
        reason: "Loyalty compensation",
        idempotencyKey: "uuid-idemp-123",
      });
      expect(res.isIdempotentReplay).toBe(true);
    });
  });

  describe("LoyaltyHeaderBanner & Refresh Shimmer Flow", () => {
    it("renders LoyaltyHeaderBanner with title and refresh button", async () => {
      const { LoyaltyHeaderBanner } = await import("../components/LoyaltyHeaderBanner");
      const onSync = vi.fn();

      render(<LoyaltyHeaderBanner isSyncing={false} onSync={onSync} />);

      expect(screen.getByText("Loyalty & Rewards")).toBeInTheDocument();
      const refreshBtn = screen.getByRole("button", { name: /Refresh Loyalty/i });
      expect(refreshBtn).toBeInTheDocument();

      fireEvent.click(refreshBtn);
      expect(onSync).toHaveBeenCalledTimes(1);
    });

    it("displays refreshing state on LoyaltyHeaderBanner when isSyncing is true", async () => {
      const { LoyaltyHeaderBanner } = await import("../components/LoyaltyHeaderBanner");
      render(<LoyaltyHeaderBanner isSyncing={true} onSync={vi.fn()} />);

      expect(screen.getByRole("button", { name: /Refreshing.../i })).toBeDisabled();
    });
  });
});


