import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { incentivesApi } from "../api/incentives.api";
import { StaffEarningsTab } from "../components/StaffEarningsTab";
import type {
  IncentiveLedgerEntry,
  IncentiveRecoveryObligation,
} from "../types/incentives.types";

const branchContext = vi.hoisted(() => ({
  currentBranchId: "branch-1" as string | null,
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranch: branchContext.currentBranchId && branchContext.currentBranchId !== "all"
      ? { id: branchContext.currentBranchId, name: "Main Branch" }
      : null,
    currentBranchId: branchContext.currentBranchId,
  }),
}));

const staffId = "staff-1";
const ledgerEntry = (
  id: string,
  amountInPaise: number,
  fulfillmentStatus: IncentiveLedgerEntry["fulfillmentStatus"] = "confirmed",
) =>
  ({
    _id: id,
    organizationId: "org-1",
    branchId: "branch-1",
    staffId: { _id: staffId, name: "Asha", staffCode: "STF-1" },
    schemeId: "scheme-1",
    entryType: "ACCRUAL",
    sourceType: "service_commission",
    fulfillmentStatus,
    amountInPaise,
    createdAt: "2026-03-01T00:00:00.000Z",
  }) as IncentiveLedgerEntry;

const obligation = {
  _id: "obligation-1",
  organizationId: "org-1",
  branchId: "branch-1",
  staffId: { _id: staffId, name: "Asha", staffCode: "STF-1" },
  clawbackLedgerId: "clawback-1",
  originalClawbackInPaise: 500,
  totalRecoveredInPaise: 100,
  totalReservedInPaise: 50,
  remainingAvailableInPaise: 350,
  status: "partially_recovered",
  allocations: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
} as IncentiveRecoveryObligation;

const renderTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StaffEarningsTab
        staffList={[{ _id: staffId, name: "Asha", staffCode: "STF-1" }]}
      />
    </QueryClientProvider>,
  );
};

describe("StaffEarningsTab", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    branchContext.currentBranchId = "branch-1";
  });

  it("aggregates every ledger page in branch scope and labels accrual as unpaid commission position", async () => {
    const listLedgerEntries = vi.spyOn(incentivesApi, "listLedgerEntries")
      .mockImplementation(async (params) => ({
        success: true,
        data: params?.page === 2 ? [ledgerEntry("ledger-2", 500)] : [ledgerEntry("ledger-1", 1000)],
        meta: { page: params?.page || 1, limit: 500, total: 2, totalPages: 2 },
      }));
    vi.spyOn(incentivesApi, "listRecoveryObligations").mockResolvedValue({
      success: true,
      data: [obligation],
      meta: { page: 1, limit: 500, total: 1, totalPages: 1 },
    });

    renderTab();
    expect(await screen.findByText("₹15.00")).toBeInTheDocument();
    expect(screen.getByText("₹4.00")).toBeInTheDocument();
    expect(screen.getByText("₹11.00")).toBeInTheDocument();
    expect(screen.getByText("Net Commission Position")).toBeInTheDocument();
    expect(screen.getByText(/not proof of payroll payment/)).toBeInTheDocument();
    await waitFor(() => expect(listLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: "branch-1", page: 2, limit: 500 }),
    ));
  });

  it("shows a clear error state when recovery balances cannot be loaded", async () => {
    vi.spyOn(incentivesApi, "listLedgerEntries").mockResolvedValue({
      success: true,
      data: [ledgerEntry("ledger-1", 1000)],
      meta: { page: 1, limit: 500, total: 1, totalPages: 1 },
    });
    vi.spyOn(incentivesApi, "listRecoveryObligations").mockRejectedValue(
      new Error("Recovery service unavailable"),
    );

    renderTab();
    expect(await screen.findByText("Failed to load employee earnings")).toBeInTheDocument();
  });

  it("omits the all-branches sentinel from ledger API filters", async () => {
    branchContext.currentBranchId = "all";
    const listLedgerEntries = vi.spyOn(incentivesApi, "listLedgerEntries").mockResolvedValue({
      success: true,
      data: [ledgerEntry("ledger-1", 1000)],
      meta: { page: 1, limit: 500, total: 1, totalPages: 1 },
    });
    vi.spyOn(incentivesApi, "listRecoveryObligations").mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 500, total: 0, totalPages: 1 },
    });

    renderTab();
    await waitFor(() => expect(listLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: undefined, page: 1, limit: 500 }),
    ));
    expect(listLedgerEntries.mock.calls[0][0]?.branchId).not.toBe("all");
  });
});
