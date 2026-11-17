import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { incentivesApi } from "../api/incentives.api";
import { RecoveryObligationsTab } from "../components/RecoveryObligationsTab";
import type { IncentiveRecoveryObligation } from "../types/incentives.types";

const branchContext = vi.hoisted(() => ({
  currentBranchId: "all" as string | null,
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({ currentBranchId: branchContext.currentBranchId }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      permissions: ["payroll.disburse"],
    },
  }),
}));

const obligation: IncentiveRecoveryObligation = {
  _id: "obligation-1",
  organizationId: "org-1",
  branchId: "branch-1",
  staffId: { _id: "staff-1", name: "Synthetic Staff" },
  clawbackLedgerId: "clawback-1",
  originalClawbackInPaise: 1000,
  totalRecoveredInPaise: 0,
  totalReservedInPaise: 0,
  remainingAvailableInPaise: 1000,
  collectibleAvailableInPaise: 1000,
  status: "pending",
  allocations: [],
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

const renderTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecoveryObligationsTab />
    </QueryClientProvider>,
  );
};

describe("RecoveryObligationsTab", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    branchContext.currentBranchId = "all";
  });

  it("requires a specific active branch before allowing recovery actions", async () => {
    vi.spyOn(incentivesApi, "listRecoveryObligations").mockResolvedValue({
      success: true,
      data: [obligation],
      meta: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });

    const { unmount } = renderTab();
    const allBranchesAction = await screen.findByRole("button", { name: "Recover" });
    expect(allBranchesAction).toBeDisabled();
    expect(allBranchesAction).toHaveAttribute(
      "title",
      "Select a specific branch before recording or confirming a recovery payment.",
    );
    expect(
      screen.getByText("Select a specific branch to record or confirm a recovery payment."),
    ).toBeInTheDocument();

    unmount();
    branchContext.currentBranchId = "branch-1";
    renderTab();
    expect(await screen.findByRole("button", { name: "Recover" })).toBeEnabled();
  });
});
