// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SubscriptionList } from "../components/SubscriptionList";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import * as subApiModule from "../api/subscriptions.api";
import { subscriptionPlansApi } from "../api/plans.api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/subscriptions",
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    getBranchName: vi.fn((id: string) => `Branch ${id}`),
    currentBranch: null,
  }),
}));

vi.mock("../api/subscriptions.api", () => ({
  getSubscriptions: vi.fn(),
  getSubscriptionById: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock("../api/plans.api", () => ({
  subscriptionPlansApi: {
    getPlans: vi.fn(),
    getPlanById: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
  },
}));

const mockUser = {
  id: "usr_admin",
  role: "Manager",
  permissions: [
    "subscriptions.view",
    "subscriptions.sell",
    "subscriptions.configure",
    "subscriptions.redeem",
  ],
  organizationId: "org_1",
};

describe("SubscriptionList UI Banner Refresh Functionality", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      isAuthenticated: true,
      isLoading: false,
      isError: false,
      login: vi.fn() as any,
      isLoggingIn: false,
      logout: vi.fn(),
      isLoggingOut: false,
      sendOtp: vi.fn() as any,
      isSendingOtp: false,
      verifyOtp: vi.fn() as any,
      isVerifyingOtp: false,
      activateChangePassword: vi.fn() as any,
      isActivatingChangePassword: false,
    });

    vi.mocked(subApiModule.getSubscriptions).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(subscriptionPlansApi.getPlans).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it("renders Refresh Subscriptions button when subscriptions tab is active and calls refetch", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    const refreshBtn = await screen.findByRole("button", {
      name: /Refresh Subscriptions/i,
    });
    expect(refreshBtn).toBeDefined();

    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(subApiModule.getSubscriptions).toHaveBeenCalled();
    });
  });

  it("switches to Refresh Plans button when Plan Templates Catalog tab is active and calls refetchPlans", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    // Switch tab to plans catalog
    const tabButtons = screen.getAllByRole("button", {
      name: /Plan Templates Catalog/i,
    });
    fireEvent.click(tabButtons[0]);

    const refreshPlansBtn = await screen.findByRole("button", {
      name: /Refresh Plans/i,
    });
    expect(refreshPlansBtn).toBeDefined();

    fireEvent.click(refreshPlansBtn);

    await waitFor(() => {
      expect(subscriptionPlansApi.getPlans).toHaveBeenCalled();
    });
  });

  it("renders shimmer skeleton (.animate-pulse) when subscriptions query is loading", async () => {
    let resolveSub: (val: unknown) => void;
    vi.mocked(subApiModule.getSubscriptions).mockReturnValueOnce(
      new Promise((res) => {
        resolveSub = res;
      })
    );

    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolveSub!({ data: [], meta: { total: 0 } });
    await waitFor(() => {
      expect(subApiModule.getSubscriptions).toHaveBeenCalled();
    });
  });

  it("renders shimmer skeleton (.animate-pulse) when plan templates catalog query is loading", async () => {
    let resolvePlans: (val: unknown) => void;
    vi.mocked(subscriptionPlansApi.getPlans).mockReturnValueOnce(
      new Promise((res) => {
        resolvePlans = res;
      })
    );

    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    const tabButtons = screen.getAllByRole("button", {
      name: /Plan Templates Catalog/i,
    });
    fireEvent.click(tabButtons[0]);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolvePlans!({ data: [], meta: { total: 0 } });
    await waitFor(() => {
      expect(subscriptionPlansApi.getPlans).toHaveBeenCalled();
    });
  });

  it("shows shimmer loading when clicking Refresh Subscriptions button", async () => {
    let resolveSub: (val: unknown) => void;
    vi.mocked(subApiModule.getSubscriptions).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    const refreshBtn = await screen.findByRole("button", {
      name: /Refresh Subscriptions/i,
    });

    vi.mocked(subApiModule.getSubscriptions).mockReturnValueOnce(
      new Promise((res) => {
        resolveSub = res;
      })
    );

    fireEvent.click(refreshBtn);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolveSub!({ data: [], meta: { total: 0 } });
  });

  it("shows shimmer loading when clicking Refresh Plans button", async () => {
    let resolvePlans: (val: unknown) => void;
    vi.mocked(subscriptionPlansApi.getPlans).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <SubscriptionList />
      </QueryClientProvider>
    );

    const tabButtons = screen.getAllByRole("button", {
      name: /Plan Templates Catalog/i,
    });
    fireEvent.click(tabButtons[0]);

    const refreshBtn = await screen.findByRole("button", {
      name: /Refresh Plans/i,
    });

    vi.mocked(subscriptionPlansApi.getPlans).mockReturnValueOnce(
      new Promise((res) => {
        resolvePlans = res;
      })
    );

    fireEvent.click(refreshBtn);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolvePlans!({ data: [], meta: { total: 0 } });
  });
});
