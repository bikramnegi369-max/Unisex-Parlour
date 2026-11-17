import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { incentivesApi } from "@/features/incentives/api/incentives.api";
import { EmployeeIncentivesTab } from "../components/EmployeeIncentivesTab";
import type { IncentiveLedgerEntry, IncentiveRecoveryObligation } from "@/features/incentives/types/incentives.types";

const branchContext = vi.hoisted(() => ({
  currentBranchId: "branch-1" as string | null,
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({ currentBranchId: branchContext.currentBranchId }),
}));

const ledgerEntry = (
  id: string,
  entryType: IncentiveLedgerEntry["entryType"],
  amountInPaise: number,
  fulfillmentStatus: IncentiveLedgerEntry["fulfillmentStatus"] = "confirmed",
) =>
  ({
    id,
    _id: id,
    organizationId: "org-1",
    branchId: "branch-1",
    staffId: { _id: "staff-1", name: "Asha", staffCode: "STF-1" },
    schemeId: { name: "Commission" },
    entryType,
    sourceType: "service_commission",
    fulfillmentStatus,
    amountInPaise,
    createdAt: "2026-03-01T00:00:00.000Z",
  }) as IncentiveLedgerEntry;

const obligation = (
  id: string,
  originalClawbackInPaise: number,
  totalRecoveredInPaise: number,
) =>
  ({
    id,
    _id: id,
    organizationId: "org-1",
    branchId: "branch-1",
    staffId: { _id: "staff-1", name: "Asha", staffCode: "STF-1" },
    clawbackLedgerId: `clawback-${id}`,
    originalClawbackInPaise,
    totalRecoveredInPaise,
    totalReservedInPaise: 0,
    remainingAvailableInPaise: originalClawbackInPaise - totalRecoveredInPaise,
    status: totalRecoveredInPaise ? "partially_recovered" : "pending",
    allocations: [],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  }) as IncentiveRecoveryObligation;

const renderTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EmployeeIncentivesTab
        employeeId="staff-1"
        employeeName="Asha"
        staffCode="STF-1"
      />
    </QueryClientProvider>,
  );
};

describe("EmployeeIncentivesTab", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    branchContext.currentBranchId = "branch-1";
  });

  it("calculates employee summary cards across all branch-scoped ledger and recovery pages", async () => {
    const listLedgerEntries = vi.spyOn(incentivesApi, "listLedgerEntries")
      .mockImplementation(async (params) => {
        if (params?.limit === 10) {
          return {
            success: true,
            data: [ledgerEntry("table-entry", "ACCRUAL", 1000)],
            meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
          };
        }
        return {
          success: true,
          data: params?.page === 1
            ? [
                ledgerEntry("confirmed-1", "ACCRUAL", 10000),
                ledgerEntry("pending-1", "ACCRUAL", 5000, "pending"),
              ]
            : [
                ledgerEntry("confirmed-2", "ACCRUAL", 2000),
                ledgerEntry("clawback-1", "CLAWBACK", 1000),
              ],
          meta: { page: params?.page || 1, limit: 500, total: 4, totalPages: 2 },
        };
      });
    const listRecoveryObligations = vi.spyOn(incentivesApi, "listRecoveryObligations")
      .mockImplementation(async (params) => ({
        success: true,
        data: params?.page === 1
          ? [obligation("first", 3000, 1000)]
          : [obligation("second", 2000, 0)],
        meta: { page: params?.page || 1, limit: 500, total: 2, totalPages: 2 },
      }));

    renderTab();

    expect(await screen.findByText("₹80")).toBeInTheDocument();
    expect(screen.getByText("₹120")).toBeInTheDocument();
    expect(screen.getByText("₹50")).toBeInTheDocument();
    expect(screen.getByText("₹40")).toBeInTheDocument();
    await waitFor(() => {
      expect(listLedgerEntries).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: "branch-1", page: 2, limit: 500 }),
      );
      expect(listRecoveryObligations).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 500 }),
      );
    });
  });

  it("does not send the all-branches sentinel as a ledger branch filter", async () => {
    branchContext.currentBranchId = "all";
    const listLedgerEntries = vi.spyOn(incentivesApi, "listLedgerEntries").mockResolvedValue({
      success: true,
      data: [ledgerEntry("entry", "ACCRUAL", 1000)],
      meta: { page: 1, limit: 500, total: 1, totalPages: 1 },
    });
    vi.spyOn(incentivesApi, "listRecoveryObligations").mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 500, total: 0, totalPages: 1 },
    });

    renderTab();

    await waitFor(() => expect(listLedgerEntries).toHaveBeenCalled());
    expect(listLedgerEntries.mock.calls.every(([params]) => params?.branchId !== "all")).toBe(true);
  });
});
