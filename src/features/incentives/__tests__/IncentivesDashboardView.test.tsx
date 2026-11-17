import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
  listSchemes: vi.fn(),
  listAssignments: vi.fn(),
  getStaff: vi.fn(),
  getBranches: vi.fn(),
  currentBranchId: "branch-1" as string | null,
}));

vi.mock("../api/incentives.api", () => ({
  incentivesApi: {
    getSummary: mocks.getSummary,
    listSchemes: mocks.listSchemes,
    listAssignments: mocks.listAssignments,
  },
}));
vi.mock("@/lib/api/axios", () => ({
  apiClient: { get: mocks.getStaff },
}));
vi.mock("@/features/branches/api/branches.api", () => ({
  getBranches: mocks.getBranches,
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { permissions: ["incentives.view"] } }),
}));
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({ currentBranchId: mocks.currentBranchId }),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("../components/StaffEarningsTab", () => ({ StaffEarningsTab: () => null }));
vi.mock("../components/LedgerTab", () => ({ LedgerTab: () => null }));
vi.mock("../components/RecoveryObligationsTab", () => ({ RecoveryObligationsTab: () => null }));
vi.mock("../components/AttendanceBonusPanel", () => ({ AttendanceBonusPanel: () => null }));

import { IncentivesDashboardView } from "../components/IncentivesDashboardView";

const summary = {
  totalAccruedPaise: 0,
  totalClawbackPaise: 0,
  netAccruedPaise: 0,
  outstandingRecoveryPaise: 0,
  pendingFulfillmentCount: 0,
  schemes: { active: 0, draft: 0, paused: 0, archived: 0 },
};

const emptyPage = { success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <IncentivesDashboardView />
      </QueryClientProvider>,
    ),
    queryClient,
  };
};

describe("IncentivesDashboardView", () => {
  beforeEach(() => {
    mocks.currentBranchId = "branch-1";
    mocks.getSummary.mockResolvedValue(summary);
    mocks.listSchemes.mockResolvedValue(emptyPage);
    mocks.listAssignments.mockResolvedValue(emptyPage);
    mocks.getStaff.mockResolvedValue({ data: { data: [] } });
    mocks.getBranches.mockResolvedValue({ branches: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.currentBranchId = "branch-1";
  });

  it("requests and caches summary by branch, and exposes a retry on service failure", async () => {
    mocks.getSummary
      .mockRejectedValueOnce(new Error("Summary service unavailable"))
      .mockResolvedValueOnce(summary);

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Summary service unavailable");
    expect(mocks.getSummary).toHaveBeenCalledWith("branch-1");
    fireEvent.click(screen.getByRole("button", { name: "Retry summary" }));

    await waitFor(() => expect(mocks.getSummary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("omits the all-branches sentinel from staff query parameters", async () => {
    mocks.currentBranchId = "all";

    renderDashboard();

    await waitFor(() => expect(mocks.getSummary).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(mocks.getStaff).toHaveBeenCalledWith(
      "/staff",
      { params: { branchId: undefined } },
    ));
    expect(mocks.getStaff.mock.calls[0][1].params.branchId).not.toBe("all");
  });

  it("refetches summary and staff when the selected branch changes", async () => {
    const dashboard = renderDashboard();

    await waitFor(() => expect(mocks.getSummary).toHaveBeenCalledWith("branch-1"));
    await waitFor(() => expect(mocks.getStaff).toHaveBeenCalledWith(
      "/staff",
      { params: { branchId: "branch-1" } },
    ));

    mocks.currentBranchId = "branch-2";
    dashboard.rerender(
      <QueryClientProvider client={dashboard.queryClient}>
        <IncentivesDashboardView />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.getSummary).toHaveBeenCalledWith("branch-2"));
    await waitFor(() => expect(mocks.getStaff).toHaveBeenCalledWith(
      "/staff",
      { params: { branchId: "branch-2" } },
    ));
  });

  it("shows scheme loading errors and retry instead of a false empty state", async () => {
    mocks.listSchemes
      .mockRejectedValueOnce(new Error("Scheme service unavailable"))
      .mockResolvedValueOnce(emptyPage);

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /Incentive Plans/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Scheme service unavailable");
    expect(screen.queryByText("No incentive schemes found")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry schemes" }));
    expect(await screen.findByText("No incentive schemes found")).toBeInTheDocument();
  });

  it("shows assignment loading errors and an actionable retry", async () => {
    mocks.listAssignments
      .mockRejectedValueOnce(new Error("Assignment service unavailable"))
      .mockResolvedValueOnce(emptyPage);

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /Employee Plan Assignments/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Assignment service unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry assignments" }));
    await waitFor(() => expect(mocks.listAssignments).toHaveBeenCalledTimes(2));
    expect(screen.getByText("No active scheme assignments configured.")).toBeInTheDocument();
  });
});
