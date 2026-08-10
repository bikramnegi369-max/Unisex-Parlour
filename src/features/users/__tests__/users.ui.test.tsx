// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import UsersPage from "@/app/(dashboard)/users/page";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock auth hook
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock users hooks
vi.mock("../hooks/useUsers", () => ({
  useUsers: vi.fn(),
}));

vi.mock("../hooks/useCreateUser", () => ({
  useCreateUser: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}));

vi.mock("../hooks/useUpdateUser", () => ({
  useUpdateUser: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}));

vi.mock("../hooks/useUpdateUserStatus", () => ({
  useUpdateUserStatus: vi.fn(() => ({
    isPending: false,
    mutateAsync: vi.fn(),
  })),
}));

vi.mock("../hooks/useRoles", () => ({
  useRoles: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: vi.fn(() => ({ branches: [], isLoading: false })),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/users",
}));

// Mock branch context with isAllBranchesSelected and currentBranch
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "br_1",
    currentBranch: { id: "br_1", name: "Main Branch" },
    isAllBranchesSelected: false,
    getBranchQueryKey: (name: string, keys: any[] = []) => [
      name,
      "br_1",
      ...keys,
    ],
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("User Management Directory UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // Default auth setup: Admin user
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "admin_1",
        name: "Admin User",
        email: "admin@parlour.com",
        role: "Owner",
        permissions: ["users.view", "users.create", "users.update"],
        organizationId: "org_1",
        branchAccess: [],
        hasOrgWideAccess: true,
      },
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
  });

  it("renders Denied Access when users.view permission is missing", () => {
    // Override auth mock to remove view permission
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "stylist_1",
        name: "Stylist User",
        email: "stylist@parlour.com",
        role: "Stylist",
        permissions: [],
        organizationId: "org_1",
        branchAccess: [],
      },
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

    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as any,
    } as any);

    render(<UsersPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Access Denied")).toBeDefined();
    expect(screen.queryByText("Staff Directory")).toBeNull();
  });

  it("displays loading skeletons when directory is loading", () => {
    vi.mocked(useUsers).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn() as any,
    } as any);

    render(<UsersPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Staff Directory")).toBeDefined();
    // Tables display animated skeleton lines during loading (1 header + 5 body rows)
    const pulseLines = screen.queryAllByRole("row");

    // The DataTable renders header + 5 skeleton rows = 6 rows
    expect(pulseLines.length).toBe(6);
  });

  it("renders real users and tables after loading succeeds", () => {
    const mockUsersData = {
      data: [
        {
          id: "u10",
          name: "Alice Cooper",
          email: "alice@parlour.com",
          phone: "9876543210",
          role: "Manager",
          organizationId: "org_1",
          hasOrgWideAccess: false,
          branchAccess: [
            { branchId: "br_1", branchName: "Main Branch", isActive: true },
          ],
          isVerified: true,
          isFirstLogin: false,
          status: "active",
          createdAt: "2026-08-01T00:00:00Z",
          updatedAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    vi.mocked(useUsers).mockReturnValue({
      data: mockUsersData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn() as any,
    } as any);

    render(<UsersPage />, { wrapper: createWrapper() });

    // Desktop table + mobile card both render the name (responsive views)
    expect(screen.getAllByText("Alice Cooper").length).toBeGreaterThan(0);
    expect(screen.getAllByText("alice@parlour.com").length).toBeGreaterThan(0);
  });
});
