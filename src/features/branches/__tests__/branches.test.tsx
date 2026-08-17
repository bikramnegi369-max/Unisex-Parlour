import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import branchReducer from "@/store/slices/branchSlice";
import { getBranches, getBranch } from "../api/branches.api";
import { useBranches } from "../hooks/useBranches";
import { apiClient } from "@/lib/api/axios";
import * as tokenStorage from "@/lib/branch/storage";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
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
  permissions: ["branches.manage"],
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
      permissions: ["branches.manage"],
      hasOrgWideAccess: true,
      branchAccess: [],
    };
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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
    it("getBranches fetches organization and branches", async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            organization: { id: "org-1", name: "Main Salon Org" },
            branches: [
              { id: "b1", name: "Downtown Branch", isActive: true },
              { id: "b2", name: "Uptown Branch", isActive: true },
            ],
          },
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await getBranches();
      expect(apiClient.get).toHaveBeenCalledWith("/branches");
      expect(result.organization.name).toBe("Main Salon Org");
      expect(result.branches).toHaveLength(2);
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

    it("propagates API errors when fetching branches fails", async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network Error"));
      await expect(getBranches()).rejects.toThrow("Network Error");
    });
  });

  describe("useBranches Hook", () => {
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

    it("does not fetch branches if user is unauthenticated", () => {
      mockUserSession = null;

      const { result } = renderHook(() => useBranches(), { wrapper });

      expect(result.current.branches).toEqual([]);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });
});
