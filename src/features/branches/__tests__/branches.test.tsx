import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../api/branches.api";
import { useBranches } from "../hooks/useBranches";
import { useCreateBranch } from "../hooks/useCreateBranch";
import { useUpdateBranch } from "../hooks/useUpdateBranch";
import { useDeleteBranch } from "../hooks/useDeleteBranch";
import { createBranchSchema, updateBranchSchema } from "../schemas/branch.schema";
import { apiClient } from "@/lib/api/axios";
import * as tokenStorage from "@/lib/branch/storage";
import { hasPermission, type UserSession, type PermissionType } from "@/lib/permissions";
import { routePermissions } from "@/lib/permissions/routePermissions";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/branch/storage", () => ({
  getStoredBranchId: vi.fn(() => null),
  setStoredBranchId: vi.fn(),
  removeStoredBranchId: vi.fn(),
}));

let mockUserSession: {
  id: string;
  role: string;
  permissions: string[];
  hasOrgWideAccess: boolean;
  branchAccess: Array<{ branchId: string; isActive: boolean }>;
} | null = {
  id: "user-1",
  role: "admin",
  permissions: ["branches.view", "branches.create", "branches.update", "branches.delete"],
  hasOrgWideAccess: true,
  branchAccess: [],
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: !!mockUserSession,
    user: mockUserSession,
  }),
}));

describe("Branches Feature Module", () => {
  let queryClient: QueryClient;
  let store: ReturnType<typeof createTestStore>;

  const createTestStore = () =>
    configureStore({
      reducer: {
        branch: branchReducer,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = {
      id: "user-1",
      role: "admin",
      permissions: ["branches.view", "branches.create", "branches.update", "branches.delete"],
      hasOrgWideAccess: true,
      branchAccess: [],
    };
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    store = createTestStore();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  describe("Branches API Layer", () => {
    it("getBranches fetches organization and active branches without operational branch headers", async () => {
      const mockResponse = {
        data: {
          success: true,
          status: "success",
          message: "Branches retrieved successfully",
          data: {
            organization: { id: "org-1", name: "Main Salon Org", logo: null },
            branches: [
              {
                id: "b1",
                name: "Downtown Branch",
                organizationId: "org-1",
                address: "123 Main St",
                phone: "555-0100",
                isActive: true,
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z",
              },
            ],
          },
          meta: null,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getBranches();
      expect(apiClient.get).toHaveBeenCalledWith("/branches");
      expect(result.organization.name).toBe("Main Salon Org");
      expect(result.branches).toHaveLength(1);
    });

    it("getBranch fetches single branch by ID", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: "b1", name: "Downtown Branch", isActive: true },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getBranch("b1");
      expect(apiClient.get).toHaveBeenCalledWith("/branches/b1");
      expect(result.id).toBe("b1");
      expect(result.name).toBe("Downtown Branch");
    });

    it("createBranch sends payload without organizationId, branchId, branchScope, or X-Branch-Id", async () => {
      const payload = { name: "Westside Branch", address: "456 West St", phone: "555-0200" };
      const mockResponse = {
        data: {
          success: true,
          data: { id: "b3", organizationId: "org-1", isActive: true, ...payload },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await createBranch(payload);
      expect(apiClient.post).toHaveBeenCalledWith("/branches", payload);
      expect(result.name).toBe("Westside Branch");

      const callArgs = vi.mocked(apiClient.post).mock.calls[0];
      const sentPayload = callArgs[1] as Record<string, unknown>;
      expect(sentPayload.organizationId).toBeUndefined();
      expect(sentPayload.branchId).toBeUndefined();
      expect(sentPayload.id).toBeUndefined();
    });

    it("updateBranch sends PATCH payload without organizationId or generated fields", async () => {
      const payload = { name: "Updated Downtown", phone: "555-9999" };
      const mockResponse = {
        data: {
          success: true,
          data: { id: "b1", organizationId: "org-1", isActive: true, ...payload },
        },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

      const result = await updateBranch("b1", payload);
      expect(apiClient.patch).toHaveBeenCalledWith("/branches/b1", payload);
      expect(result.name).toBe("Updated Downtown");
    });

    it("deleteBranch sends DELETE request for soft deactivation", async () => {
      const mockResponse = {
        data: {
          success: true,
          status: "success",
          message: "Branch deactivated",
          data: null,
        },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const result = await deleteBranch("b1");
      expect(apiClient.delete).toHaveBeenCalledWith("/branches/b1");
      expect(result).toBeNull();
    });

    it("propagates API errors when fetching branches fails", async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network Error"));
      await expect(getBranches()).rejects.toThrow("Network Error");
    });
  });

  describe("Zod Schemas", () => {
    it("validates createBranchSchema rules", () => {
      expect(createBranchSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createBranchSchema.safeParse({ name: "   " }).success).toBe(false);
      expect(createBranchSchema.safeParse({ name: "Downtown Branch" }).success).toBe(true);
      expect(
        createBranchSchema.safeParse({
          name: "Downtown Branch",
          address: "123 St",
          phone: "555-1234",
        }).success
      ).toBe(true);
    });

    it("validates updateBranchSchema rules", () => {
      expect(updateBranchSchema.safeParse({ name: "   " }).success).toBe(false);
      expect(updateBranchSchema.safeParse({}).success).toBe(true);
      expect(updateBranchSchema.safeParse({ phone: "555 border" }).success).toBe(true);
      expect(updateBranchSchema.safeParse({ isActive: false }).success).toBe(true);
    });
  });

  describe("React Query Mutation Hooks & Invalidation", () => {
    it("useCreateBranch invalidates branches query on success", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { success: true, data: { id: "b-new", name: "New Branch" } },
      });

      const { result } = renderHook(() => useCreateBranch(), { wrapper });

      await result.current.mutateAsync({ name: "New Branch" });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["branches"] });
    });

    it("useUpdateBranch invalidates branches list and detail on success", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: { success: true, data: { id: "b1", name: "Updated Branch" } },
      });

      const { result } = renderHook(() => useUpdateBranch(), { wrapper });

      await result.current.mutateAsync({ id: "b1", payload: { name: "Updated Branch" } });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["branches"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["branches", "b1"] });
    });

    it("useDeleteBranch invalidates branches list and detail on success", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { success: true, data: null },
      });

      const { result } = renderHook(() => useDeleteBranch(), { wrapper });

      await result.current.mutateAsync("b1");

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["branches"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["branches", "b1"] });
    });
  });

  describe("Granular RBAC Permissions", () => {
    const createUserSession = (permissions: string[]): UserSession => ({
      id: "u-test",
      name: "Test User",
      email: "test@test.com",
      role: "custom",
      permissions: permissions as unknown as PermissionType[],
      organizationId: "org-1",
      branchAccess: [],
      hasOrgWideAccess: true,
    });

    it("routePermissions maps /branches to branches.view", () => {
      expect(routePermissions["/branches"]).toBe("branches.view");
    });

    it("branches.view allows Branch page access", () => {
      const viewUser = createUserSession(["branches.view"]);
      expect(hasPermission(viewUser, "branches.view")).toBe(true);
    });

    it("user without branches.view is denied route access", () => {
      const noViewUser = createUserSession(["employees.view"]);
      expect(hasPermission(noViewUser, "branches.view")).toBe(false);
    });

    it("branches.create controls create permission independently", () => {
      const viewOnlyUser = createUserSession(["branches.view"]);
      const createUser = createUserSession(["branches.view", "branches.create"]);

      expect(hasPermission(viewOnlyUser, "branches.create")).toBe(false);
      expect(hasPermission(createUser, "branches.create")).toBe(true);
    });

    it("branches.update controls edit permission independently", () => {
      const viewOnlyUser = createUserSession(["branches.view"]);
      const updateUser = createUserSession(["branches.view", "branches.update"]);

      expect(hasPermission(viewOnlyUser, "branches.update")).toBe(false);
      expect(hasPermission(updateUser, "branches.update")).toBe(true);
    });

    it("branches.delete controls deactivate permission independently", () => {
      const viewOnlyUser = createUserSession(["branches.view"]);
      const deleteUser = createUserSession(["branches.view", "branches.delete"]);

      expect(hasPermission(viewOnlyUser, "branches.delete")).toBe(false);
      expect(hasPermission(deleteUser, "branches.delete")).toBe(true);
    });

    it("branches.create alone does not imply branches.view, update, or delete", () => {
      const createOnlyUser = createUserSession(["branches.create"]);
      expect(hasPermission(createOnlyUser, "branches.view")).toBe(false);
      expect(hasPermission(createOnlyUser, "branches.update")).toBe(false);
      expect(hasPermission(createOnlyUser, "branches.delete")).toBe(false);
    });

    it("branches.update alone does not imply branches.view, create, or delete", () => {
      const updateOnlyUser = createUserSession(["branches.update"]);
      expect(hasPermission(updateOnlyUser, "branches.view")).toBe(false);
      expect(hasPermission(updateOnlyUser, "branches.create")).toBe(false);
      expect(hasPermission(updateOnlyUser, "branches.delete")).toBe(false);
    });

    it("branches.delete alone does not imply branches.view, create, or update", () => {
      const deleteOnlyUser = createUserSession(["branches.delete"]);
      expect(hasPermission(deleteOnlyUser, "branches.view")).toBe(false);
      expect(hasPermission(deleteOnlyUser, "branches.create")).toBe(false);
      expect(hasPermission(deleteOnlyUser, "branches.update")).toBe(false);
    });

    it("branches.manage is not used by Branch Management", () => {
      const manageUser = createUserSession(["branches.manage" as unknown as PermissionType]);
      expect(hasPermission(manageUser, "branches.view")).toBe(false);
      expect(hasPermission(manageUser, "branches.create")).toBe(false);
      expect(hasPermission(manageUser, "branches.update")).toBe(false);
      expect(hasPermission(manageUser, "branches.delete")).toBe(false);
    });
  });

  describe("useBranches Hook & Operational Regression Safeguard", () => {
    it("populates Redux store and returns branch data when query succeeds", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            organization: { id: "org-1", name: "Main Salon Org" },
            branches: [{ id: "b1", name: "Downtown Branch", isActive: true }],
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBranches(), { wrapper });

      await waitFor(() => {
        expect(result.current.branches).toHaveLength(1);
      });

      expect(result.current.organization?.name).toBe("Main Salon Org");
      expect(store.getState().branch.availableBranches).toHaveLength(1);
      expect(store.getState().branch.currentOrganization?.name).toBe("Main Salon Org");
    });

    it("selects first active accessible branch as fallback for non-org-wide user with no stored selection", async () => {
      mockUserSession = {
        id: "user-2",
        role: "staff",
        permissions: ["employees.view"],
        hasOrgWideAccess: false,
        branchAccess: [{ branchId: "b2", isActive: true }],
      };

      vi.mocked(tokenStorage.getStoredBranchId).mockReturnValueOnce(null);

      const mockResponse = {
        data: {
          success: true,
          data: {
            organization: { id: "org-1", name: "Main Salon Org" },
            branches: [
              { id: "b1", name: "Inactive Branch", isActive: false },
              { id: "b2", name: "Uptown Branch", isActive: true },
            ],
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBranches(), { wrapper });

      await waitFor(() => {
        expect(result.current.branches).toHaveLength(2);
      });

      expect(store.getState().branch.currentBranchId).toBe("b2");
      expect(tokenStorage.setStoredBranchId).toHaveBeenCalledWith("b2");
    });

    it("works when stored branch selection is All Branches (null)", async () => {
      vi.mocked(tokenStorage.getStoredBranchId).mockReturnValueOnce("all");

      const mockResponse = {
        data: {
          success: true,
          data: {
            organization: { id: "org-1", name: "Main Salon Org" },
            branches: [{ id: "b1", name: "Downtown Branch", isActive: true }],
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBranches(), { wrapper });

      await waitFor(() => {
        expect(result.current.branches).toHaveLength(1);
      });

      expect(store.getState().branch.currentBranchId).toBeNull();
    });
  });
});
