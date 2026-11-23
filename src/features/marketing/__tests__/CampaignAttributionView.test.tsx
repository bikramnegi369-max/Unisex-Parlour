import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CampaignAttributionView } from "../components/CampaignAttributionView";
import { marketingApi } from "../api/marketing.api";

const mocks = vi.hoisted(() => ({
  useBranchContext: vi.fn(),
  useAuth: vi.fn(),
  hasPermission: vi.fn(),
  getCampaigns: vi.fn(),
  getCampaignPerformance: vi.fn(),
  createCampaign: vi.fn(),
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

vi.mock("../api/marketing.api", () => ({
  marketingApi: {
    getCampaigns: mocks.getCampaigns,
    getCampaignPerformance: mocks.getCampaignPerformance,
    createCampaign: mocks.createCampaign,
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("CampaignAttributionView Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBranchContext.mockReturnValue({
      currentBranchId: "branch-001",
      currentBranch: { id: "branch-001", name: "Downtown" },
      isAllBranchesSelected: false,
    });
    mocks.useAuth.mockReturnValue({
      user: { id: "usr-01", name: "Finance Manager", role: "manager" },
    });
    mocks.hasPermission.mockImplementation((user, perm) => {
      if (perm === "finance.view") return true;
      if (perm === "finance.create" || perm === "finance.edit") return true;
      return false;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders access restricted when user lacks finance.view", () => {
    mocks.hasPermission.mockReturnValue(false);
    renderWithClient(<CampaignAttributionView />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to view marketing campaigns/i)).toBeInTheDocument();
  });

  it("renders campaign list and empty prompt on initial load", async () => {
    mocks.getCampaigns.mockResolvedValueOnce({
      status: "success",
      data: [
        {
          id: "camp-01",
          _id: "camp-01",
          name: "Diwali Blitz",
          campaignCode: "DIWALI26",
          channel: "instagram",
          status: "active",
          startDate: "2026-11-01",
          budget: 5000,
          attributionWindowDays: 14,
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderWithClient(<CampaignAttributionView />);

    await waitFor(() => {
      expect(screen.getByText("Diwali Blitz")).toBeInTheDocument();
      expect(screen.getByText("DIWALI26")).toBeInTheDocument();
      expect(screen.getByText("Select a Campaign")).toBeInTheDocument();
    });
  });

  it("loads and displays financial attribution metrics and settled ROI breakdown when campaign is clicked", async () => {
    mocks.getCampaigns.mockResolvedValueOnce({
      status: "success",
      data: [
        {
          id: "camp-01",
          _id: "camp-01",
          name: "Summer Blast",
          campaignCode: "SUMMER26",
          channel: "instagram",
          status: "active",
          startDate: "2026-11-01",
          budget: 10000,
          attributionWindowDays: 14,
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    mocks.getCampaignPerformance.mockResolvedValueOnce({
      status: "success",
      data: {
        campaign: {
          id: "camp-01",
          name: "Summer Blast",
          campaignCode: "SUMMER26",
          channel: "instagram",
          status: "active",
          budget: 10000,
        },
        financialMetrics: {
          attributedGrossRevenue: 15000,
          attributedGrossRevenuePaise: 1500000,
          attributedRefunds: 1000,
          attributedRefundsPaise: 100000,
          refundCount: 1,
          attributedNetRevenue: 14000,
          attributedNetRevenuePaise: 1400000,
          invoiceCount: 8,
          expenseObligations: 4000,
          settledExpenses: 2500,
          unpaidExpenses: 1500,
          expenseCount: 2,
          netAttributedContribution: 11500,
          netAttributedContributionPaise: 1150000,
          attributedRevenueToSpendRatio: 5.6,
        },
        disclosureNotice: "ROI reflects settled cash disbursements.",
      },
    });

    renderWithClient(<CampaignAttributionView />);

    const campaignCard = await screen.findByText("Summer Blast");
    fireEvent.click(campaignCard);

    await waitFor(() => {
      expect(screen.getByText("Attributed Gross Revenue")).toBeInTheDocument();
      expect(screen.getByText("₹15000.00")).toBeInTheDocument();
      expect(screen.getByText("-₹1000.00")).toBeInTheDocument();
      expect(screen.getByText("₹14000.00")).toBeInTheDocument();
      expect(screen.getByText("5.6x")).toBeInTheDocument();
      expect(screen.getByText(/Settled vs. Approved Expenses/i)).toBeInTheDocument();
    });
  });
});
