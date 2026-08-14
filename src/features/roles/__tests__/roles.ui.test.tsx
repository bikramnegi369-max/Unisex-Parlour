// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import RolesPage from "@/app/(dashboard)/roles/page";
import { useAuth } from "@/features/auth/hooks/useAuth";
import * as rolesApiModule from "@/features/roles/api/roles.api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UserSession } from "@/lib/permissions";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/roles/api/roles.api");

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockAuthorizedUser: UserSession = {
  id: "usr_admin",
  name: "Admin User",
  email: "admin@parlour.com",
  role: "Manager",
  permissions: ["roles.view", "roles.create", "roles.update", "roles.delete"],
  organizationId: "org_1",
  branchAccess: [],
};

const mockReadOnlyUser: UserSession = {
  id: "usr_read",
  name: "Read Only User",
  email: "readonly@parlour.com",
  role: "Receptionist",
  permissions: ["roles.view"],
  organizationId: "org_1",
  branchAccess: [],
};

const mockRoles = [
  { id: "role_1", name: "Manager", isSystem: true, permissions: ["customers.view"] },
  { id: "role_2", name: "Custom Stylist", isSystem: false, permissions: ["services.view"] },
];

const mockPermissions = [
  { id: "p1", key: "customers.view", name: "View Customers", module: "Customers" },
  { id: "p2", key: "services.view", name: "View Services", module: "Services" },
];

const mockPaginatedPermissions = {
  data: mockPermissions,
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

describe("Roles Feature UI & RBAC Authorization", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    cleanup();

    vi.spyOn(rolesApiModule, "getRoles").mockResolvedValue(mockRoles);
    vi.spyOn(rolesApiModule, "getPermissions").mockResolvedValue(mockPaginatedPermissions);
    vi.spyOn(rolesApiModule, "getPermissionModules").mockResolvedValue(["Appointments", "Billing & POS", "Customers"]);
    vi.spyOn(rolesApiModule, "deleteRole").mockResolvedValue(undefined);
  });

  it("renders roles page for user with roles.view permission", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthorizedUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Manager").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Custom Stylist").length).toBeGreaterThan(0);
    });
  });

  it("renders dynamic modules in filter dropdown returned from GET /rbac/modules", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthorizedUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Appointments" })).toBeDefined();
      expect(screen.getByRole("option", { name: "Billing & POS" })).toBeDefined();
    });
  });

  it("handles empty dynamic modules array gracefully without crashing", async () => {
    vi.spyOn(rolesApiModule, "getPermissionModules").mockResolvedValue([]);

    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthorizedUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/All Modules/i)).toBeDefined();
    });
  });

  it("shows Create Custom Role button for user with roles.create", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthorizedUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const createButtons = screen.getAllByText("Create Custom Role");
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  it("hides Create Custom Role button for user without roles.create", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockReadOnlyUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Create Custom Role")).toBeNull();
    });
  });

  it("triggers delete confirmation dialog and calls deleteRole on confirm", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAuthorizedUser,
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

    render(
      <QueryClientProvider client={queryClient}>
        <RolesPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Custom Stylist").length).toBeGreaterThan(0);
    });

    const deleteButton = screen.getByTitle("Delete Role");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Delete Custom Role")).toBeDefined();
    });

    const confirmButton = screen.getByRole("button", { name: "Deactivate" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(rolesApiModule.deleteRole).toHaveBeenCalledWith("role_2");
    });
  });
});
