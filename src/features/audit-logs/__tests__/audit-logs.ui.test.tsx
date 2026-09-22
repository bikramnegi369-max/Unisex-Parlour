import React from "react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuditLogList from "../components/AuditLogList";
import { hasPermission, type UserSession } from "@/lib/permissions";
import { routePermissions } from "@/lib/permissions/routePermissions";
import { apiClient } from "@/lib/api/axios";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/audit-logs",
  useSearchParams: () => mockSearchParams,
}));

// Mock useAuth
const mockUser: UserSession | null = {
  id: "usr_admin",
  name: "Admin User",
  email: "admin@parlour.com",
  role: "Owner",
  permissions: ["logs.view"],
  organizationId: "org_1",
  branchAccess: [
    { branchId: "br_1", branchName: "Indiranagar", isActive: true },
  ],
  hasOrgWideAccess: true,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: !!mockUser,
    user: mockUser,
    isLoading: false,
  }),
}));

// Mock useBranchContext
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: null, // "All Branches"
    isAllBranchesSelected: true,
    availableBranches: [
      {
        id: "br_1",
        name: "Indiranagar Branch",
        organizationId: "org_1",
        isActive: true,
      },
      {
        id: "br_2",
        name: "Koramangala Branch",
        organizationId: "org_1",
        isActive: true,
      },
    ],
    getBranchName: (id: string) =>
      id === "br_1"
        ? "Indiranagar Branch"
        : id === "br_2"
          ? "Koramangala Branch"
          : id,
    getBranchQueryKey: (name: string, keys: unknown[] = []) => [
      name,
      "scope",
      ...keys,
    ],
  }),
}));

// Mock apiClient
vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("Audit Logs Module RBAC & Permissions", () => {
  it("verifies logs.view permission is mapped to /audit-logs route", () => {
    expect(routePermissions["/audit-logs"]).toBe("logs.view");
  });

  it("authorizes a user with logs.view and denies without it", () => {
    const userWithPerm: UserSession = {
      id: "u1",
      name: "Auditor",
      email: "audit@test.com",
      role: "Auditor",
      permissions: ["logs.view"],
      organizationId: "org_1",
      branchAccess: [],
    };
    const userWithoutPerm: UserSession = {
      id: "u2",
      name: "Stylist",
      email: "stylist@test.com",
      role: "Stylist",
      permissions: ["appointments.view"],
      organizationId: "org_1",
      branchAccess: [],
    };

    expect(hasPermission(userWithPerm, "logs.view")).toBe(true);
    expect(hasPermission(userWithoutPerm, "logs.view")).toBe(false);
  });
});

describe("Audit Logs UI & Read-Only Behavior", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders audit log records into the table with formatted fields", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        status: "success",
        data: [
          {
            _id: "log_1",
            organizationId: "org_1",
            branchId: "br_1",
            actorId: {
              _id: "usr_10",
              name: "Priya Sharma",
              email: "priya@parlour.com",
            },
            action: "CUSTOMER_CREATED",
            entityType: "Customer",
            entityId: "cust_99",
            description: "Created customer profile for Ananya Patel",
            metadata: { loyaltyEnrolled: true },
            createdAt: "2026-09-20T14:00:00.000Z",
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    });

    renderWithQueryClient(<AuditLogList />);

    // Header title
    expect(
      screen.getByRole("heading", { name: /audit logs/i }),
    ).toBeInTheDocument();

    // Row content
    // DataTable renders both desktop table and mobile card views simultaneously in JSDOM
    // (CSS display rules are not evaluated), so text elements appear multiple times.
    await waitFor(() => {
      expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        screen.getAllByText("priya@parlour.com").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Customer Created").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Customer").length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText(/Created customer profile for Ananya Patel/).length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText("Indiranagar Branch").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("verifies strictly read-only behavior: NO create, edit, or delete actions exist", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        status: "success",
        data: [
          {
            _id: "log_1",
            action: "CUSTOMER_CREATED",
            entityType: "Customer",
            description: "Some description",
            createdAt: "2026-09-20T14:00:00.000Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    });

    renderWithQueryClient(<AuditLogList />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Some description").length,
      ).toBeGreaterThanOrEqual(1);
    });

    // Assert NO Create / Add / Delete / Edit buttons exist anywhere on the screen
    expect(
      screen.queryByRole("button", { name: /create/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /deactivate/i }),
    ).not.toBeInTheDocument();
  });

  it("opens details modal and displays full record and JSON metadata when clicking View Details", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        status: "success",
        data: [
          {
            _id: "log_2",
            organizationId: "org_1",
            actorId: {
              _id: "usr_20",
              name: "Kush Bhardwaj",
              email: "kush@parlour.com",
            },
            action: "SERVICE_UPDATED",
            entityType: "Service",
            entityId: "srv_55",
            description: "Updated service pricing",
            metadata: { oldPrice: 500, newPrice: 650 },
            createdAt: "2026-09-21T09:30:00.000Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    });

    renderWithQueryClient(<AuditLogList />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Updated service pricing").length,
      ).toBeGreaterThanOrEqual(1);
    });

    // Click View Details button (desktop or mobile)
    const viewButtons = screen.getAllByRole("button", {
      name: /view.*details/i,
    });
    fireEvent.click(viewButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Audit Log Details")).toBeInTheDocument();
      expect(screen.getByText("SERVICE_UPDATED")).toBeInTheDocument();
      expect(screen.getByText(/srv_55/)).toBeInTheDocument();
      expect(screen.getByText(/"newPrice": 650/)).toBeInTheDocument();
    });

    // Dialog has two close controls: the X icon (aria-label="Close dialog") and the footer "Close" button
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders EmptyState when no records are returned", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        status: "success",
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    });

    renderWithQueryClient(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText("No Audit Records Found")).toBeInTheDocument();
    });
  });

  it("renders ErrorState with retry button when query fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(
      new Error("Network connection error"),
    );

    renderWithQueryClient(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Load Audit Logs")).toBeInTheDocument();
      expect(screen.getByText("Network connection error")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument();
    });
  });
});
