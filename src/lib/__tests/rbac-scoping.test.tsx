// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { hasPermission, type UserSession } from "../permissions";
import { getScopeQueryKey } from "../api/queryKeys";
import { apiClient } from "../api/axios";

// Mocking dependencies for axios interceptor tests
vi.mock("@/store", () => {
  return {
    store: {
      getState: () => ({
        branch: {
          currentBranchId: mockCurrentBranchId,
        },
      }),
    },
  };
});

import axios from "axios";

let mockCurrentBranchId: string | null = null;
let mockUserSession: UserSession | null = null;
export const mockInvalidateQueries = vi.fn();

vi.mock("../api/queryClient", () => {
  return {
    queryClient: {
      getQueryData: () => mockUserSession,
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  };
});

interface RequestConfig {
  headers: Record<string, string>;
  branchScope?: string;
}

interface RequestInterceptor {
  handlers: {
    fulfilled: (value: RequestConfig) => Promise<RequestConfig> | RequestConfig;
    rejected?: (error: unknown) => unknown;
  }[];
}

interface ResponseInterceptor {
  handlers: {
    fulfilled?: (value: unknown) => unknown;
    rejected: (error: { config: { url?: string; headers?: Record<string, string>; _retry?: boolean }; response?: { status?: number } }) => Promise<unknown>;
  }[];
}

describe("Frontend RBAC Permission Authorization", () => {
  it("allows user with customers.view to access customer UI", () => {
    const user: UserSession = {
      id: "usr_1",
      name: "Test User",
      email: "test@parlour.com",
      role: "Receptionist",
      permissions: ["customers.view", "appointments.view"],
      organizationId: "org_1",
      branchAccess: [],
    };
    expect(hasPermission(user, "customers.view")).toBe(true);
  });

  it("denies user without customers.view from accessing customer UI", () => {
    const user: UserSession = {
      id: "usr_2",
      name: "Test User 2",
      email: "test2@parlour.com",
      role: "Stylist",
      permissions: ["appointments.view"],
      organizationId: "org_1",
      branchAccess: [],
    };
    expect(hasPermission(user, "customers.view")).toBe(false);
  });

  it("verifies Owner access works through returned permissions, not role-name bypass", () => {
    // Under the new architecture, the owner has the permissions in the permissions array
    const ownerWithPermission: UserSession = {
      id: "usr_owner",
      name: "Owner User",
      email: "owner@parlour.com",
      role: "Owner",
      permissions: ["customers.view"],
      organizationId: "org_1",
      branchAccess: [],
    };

    const ownerWithoutPermission: UserSession = {
      id: "usr_owner_2",
      name: "Owner User 2",
      email: "owner2@parlour.com",
      role: "Owner",
      permissions: [], // no permissions assigned (theoretically)
      organizationId: "org_1",
      branchAccess: [],
    };

    expect(hasPermission(ownerWithPermission, "customers.view")).toBe(true);
    expect(hasPermission(ownerWithoutPermission, "customers.view")).toBe(false); // No bypass!
  });
});

describe("TanStack Query Cache Isolation & Keys", () => {
  it("produces different query keys for Branch A and Branch B", () => {
    const keyA = getScopeQueryKey("customers", "br_A");
    const keyB = getScopeQueryKey("customers", "br_B");
    expect(keyA).not.toEqual(keyB);
    expect(keyA).toEqual(["customers", { scope: "branch", branchId: "br_A" }]);
    expect(keyB).toEqual(["customers", { scope: "branch", branchId: "br_B" }]);
  });

  it("produces different query keys for Branch A and organization-wide scope", () => {
    const keyBranch = getScopeQueryKey("customers", "br_A");
    const keyOrg = getScopeQueryKey("customers", null);
    const keyOrgAll = getScopeQueryKey("customers", "all");

    expect(keyBranch).not.toEqual(keyOrg);
    expect(keyOrg).toEqual(["customers", { scope: "organization" }]);
    expect(keyOrgAll).toEqual(["customers", { scope: "organization" }]);
  });

  it("ensures switching branches (A -> B, A -> All, All -> A) cannot reuse cached data due to distinct query keys", () => {
    const keyA = getScopeQueryKey("customers", "br_A");
    const keyB = getScopeQueryKey("customers", "br_B");
    const keyAll = getScopeQueryKey("customers", null);

    // Assert cache isolation via distinct key references
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyAll));
    expect(JSON.stringify(keyAll)).not.toBe(JSON.stringify(keyB));
  });
});

describe("Axios Request Interceptor & Branch Scoping Headers", () => {
  beforeEach(() => {
    mockCurrentBranchId = null;
    mockUserSession = null;
  });

  it("appends correct X-Branch-Id header for specific branch", async () => {
    mockCurrentBranchId = "br_123";
    mockUserSession = {
      id: "usr_1",
      name: "Test",
      email: "test@test.com",
      role: "Manager",
      permissions: [],
      organizationId: "org_1",
      branchAccess: [],
      hasOrgWideAccess: false,
    };

    const interceptor = (apiClient.interceptors.request as unknown as RequestInterceptor).handlers[0].fulfilled;
    const config: RequestConfig = {
      headers: {},
      branchScope: "current",
    };

    const result = await interceptor(config);
    expect(result.headers["X-Branch-Id"]).toBe("br_123");
  });

  it("omits X-Branch-Id when All Branches is selected for an org-wide user", async () => {
    mockCurrentBranchId = null; // represents All Branches
    mockUserSession = {
      id: "usr_owner",
      name: "Owner",
      email: "owner@test.com",
      role: "Owner",
      permissions: [],
      organizationId: "org_1",
      branchAccess: [],
      hasOrgWideAccess: true,
    };

    const interceptor = (apiClient.interceptors.request as unknown as RequestInterceptor).handlers[0].fulfilled;
    const config: RequestConfig = {
      headers: {},
      branchScope: "current",
    };

    const result = await interceptor(config);
    expect(result.headers["X-Branch-Id"]).toBeUndefined();
  });

  it("throws error for non-org-wide user on branch-scoped request if no branch is selected", async () => {
    mockCurrentBranchId = null;
    mockUserSession = {
      id: "usr_manager",
      name: "Manager",
      email: "manager@test.com",
      role: "Manager",
      permissions: [],
      organizationId: "org_1",
      branchAccess: [],
      hasOrgWideAccess: false,
    };

    const interceptor = (apiClient.interceptors.request as unknown as RequestInterceptor).handlers[0].fulfilled;
    const config: RequestConfig = {
      headers: {},
      branchScope: "current",
    };

    expect(() => interceptor(config)).toThrow(
      "Branch-scoped request failed: No active branch selected."
    );
  });

  it("never sends the 'all' sentinel as X-Branch-Id header", async () => {
    mockCurrentBranchId = "all"; // Mocking storage returning 'all'
    mockUserSession = {
      id: "usr_owner",
      name: "Owner",
      email: "owner@test.com",
      role: "Owner",
      permissions: [],
      organizationId: "org_1",
      branchAccess: [],
      hasOrgWideAccess: true,
    };

    const interceptor = (apiClient.interceptors.request as unknown as RequestInterceptor).handlers[0].fulfilled;
    const config: RequestConfig = {
      headers: {},
      branchScope: "current",
    };

    const result = await interceptor(config);
    expect(result.headers["X-Branch-Id"]).toBeUndefined();
  });
});

describe("Axios Response Interceptor & Auth Refresh Flow", () => {
  let mockPost: MockInstance<typeof axios.post>;
  let originalAdapter: typeof apiClient.defaults.adapter;

  beforeEach(() => {
    mockInvalidateQueries.mockClear();
    mockPost = vi.spyOn(axios, "post");
    originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
      data: { success: true, data: {} }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    apiClient.defaults.adapter = originalAdapter;
  });

  it("invalidates ['auth-user'] query on successful token refresh", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: { accessToken: "new_token_123" }
      }
    });

    const errorInterceptor = (apiClient.interceptors.response as unknown as ResponseInterceptor).handlers[0].rejected;
    
    const fakeError = {
      config: { url: "/some-endpoint", headers: {}, _retry: false },
      response: { status: 401 }
    };

    // We expect the original request to be retried
    void errorInterceptor(fakeError);
    
    // Allow promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      {},
      expect.any(Object)
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth-user"] });
  });

  it("coalesces concurrent 401 requests into a single refresh request", async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { accessToken: "new_token_456" }
      }
    });

    const errorInterceptor = (apiClient.interceptors.response as unknown as ResponseInterceptor).handlers[0].rejected;
    
    const fakeError1 = {
      config: { url: "/endpoint1", headers: {}, _retry: false },
      response: { status: 401 }
    };
    const fakeError2 = {
      config: { url: "/endpoint2", headers: {}, _retry: false },
      response: { status: 401 }
    };

    // Trigger both in parallel
    const p1 = errorInterceptor(fakeError1);
    const p2 = errorInterceptor(fakeError2);

    await Promise.all([p1, p2]);

    // Check that axios.post was only called once
    const refreshCalls = mockPost.mock.calls.filter((call: unknown[]) => typeof call[0] === "string" && call[0].includes("/auth/refresh"));
    expect(refreshCalls.length).toBe(1);
  });

  it("does not enter refresh flow if request is already a retry", async () => {
    const errorInterceptor = (apiClient.interceptors.response as unknown as ResponseInterceptor).handlers[0].rejected;
    
    const fakeError = {
      config: { url: "/some-endpoint", headers: {}, _retry: true },
      response: { status: 401 }
    };

    await expect(errorInterceptor(fakeError)).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("does not enter refresh flow if url is an auth endpoint", async () => {
    const errorInterceptor = (apiClient.interceptors.response as unknown as ResponseInterceptor).handlers[0].rejected;
    
    const fakeError = {
      config: { url: "/auth/refresh", headers: {}, _retry: false },
      response: { status: 401 }
    };

    await expect(errorInterceptor(fakeError)).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
