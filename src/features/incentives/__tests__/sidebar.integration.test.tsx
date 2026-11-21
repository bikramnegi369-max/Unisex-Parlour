import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePathname } from "next/navigation";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "@/store/slices/uiSlice";
import { UserSession } from "@/lib/permissions";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Setup window.matchMedia mock
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const createMockAuthReturn = (user: UserSession | null) => ({
  user,
  isAuthenticated: Boolean(user),
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

function createTestStore(collapsed = false) {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
    preloadedState: {
      ui: {
        sidebarOpen: false,
        sidebarCollapsed: collapsed,
        theme: "light" as const,
      },
    },
  });
}

describe("Sidebar Navigation Integration for Incentives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders Incentives link under Finance & Insights when user has incentives.view", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthReturn({
        id: "u1",
        name: "Test Manager",
        email: "manager@salon.com",
        role: "manager",
        organizationId: "org_1",
        branchAccess: [],
        permissions: ["incentives.view"],
      })
    );

    const store = createTestStore(false);
    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    const links = screen.getAllByRole("link", { name: /incentives/i });
    expect(links.length).toBe(1);
    expect(links[0]).toHaveAttribute("href", "/incentives");
  });

  it("does not render Incentives link when user lacks incentives.view", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthReturn({
        id: "u2",
        name: "Basic Staff",
        email: "staff@salon.com",
        role: "stylist",
        organizationId: "org_1",
        branchAccess: [],
        permissions: ["appointments.view"],
      })
    );

    const store = createTestStore(false);
    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    expect(screen.queryByRole("link", { name: /incentives/i })).not.toBeInTheDocument();
  });

  it("applies active styles when current route is /incentives", () => {
    vi.mocked(usePathname).mockReturnValue("/incentives");
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthReturn({
        id: "u1",
        name: "Test Manager",
        email: "manager@salon.com",
        role: "manager",
        organizationId: "org_1",
        branchAccess: [],
        permissions: ["incentives.view"],
      })
    );

    const store = createTestStore(false);
    render(
      <Provider store={store}>
        <Sidebar />
      </Provider>
    );

    const links = screen.getAllByRole("link", { name: /incentives/i });
    expect(links[0].className).toContain("text-primary");
  });

  it("calls onClose when link is clicked in mobile drawer mode", () => {
    const handleClose = vi.fn();
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useAuth).mockReturnValue(
      createMockAuthReturn({
        id: "u1",
        name: "Test Manager",
        email: "manager@salon.com",
        role: "manager",
        organizationId: "org_1",
        branchAccess: [],
        permissions: ["incentives.view"],
      })
    );

    const store = createTestStore(false);
    render(
      <Provider store={store}>
        <Sidebar onClose={handleClose} />
      </Provider>
    );

    const links = screen.getAllByRole("link", { name: /incentives/i });
    fireEvent.click(links[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
