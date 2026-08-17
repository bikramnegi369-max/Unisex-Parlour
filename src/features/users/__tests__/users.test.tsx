// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
} from "../api/users.api";
import { linkUserAccount, unlinkUserAccount } from "@/features/employees/api/employees.api";
import { apiClient } from "@/lib/api/axios";

// Mock the axios client
vi.mock("@/lib/api/axios", () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: mockClient,
  };
});

describe("User Module API Contract & Security Tests", () => {
  it("verifies GET /users matches organization-scope contract and does not pass branchScope header", async () => {
    const mockResponse = { data: { success: true, data: [] } };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    await getUsers({ page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/users", {
      params: { page: 1, limit: 10 },
    });
  });

  it("verifies GET /users/:id matches contract without branchScope header", async () => {
    const mockResponse = { data: { success: true, data: { id: "u1" } } };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const user = await getUser("u1");

    expect(apiClient.get).toHaveBeenCalledWith("/users/u1");
    expect(user.id).toBe("u1");
  });

  it("verifies POST /users matches organization-scope contract without branchScope header", async () => {
    const mockResponse = { data: { success: true, data: { id: "u2" } } };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const payload = {
      name: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      roleId: "r1",
      branchAccess: [{ branchId: "b1", branchName: "Main Branch", isActive: true }],
    };

    const user = await createUser(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/users", payload);
    expect(user.id).toBe("u2");
  });

  it("verifies PATCH /users/:id matches contract without branchScope header", async () => {
    const mockResponse = { data: { success: true, data: { id: "u1" } } };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

    const payload = {
      name: "John Updated",
      phone: "0987654321",
      branchAccess: [{ branchId: "b2", branchName: "Branch B", isActive: true }],
      hasOrgWideAccess: false,
    };

    await updateUser("u1", payload);

    expect(apiClient.patch).toHaveBeenCalledWith("/users/u1", payload);
  });

  it("verifies PATCH /users/:id/status matches contract without branchScope header", async () => {
    const mockResponse = { data: { success: true, data: { id: "u1", status: "inactive" } } };
    vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

    await updateUserStatus("u1", "inactive");

    expect(apiClient.patch).toHaveBeenCalledWith("/users/u1/status", { status: "inactive" });
  });
});

describe("User Module Cache and Scoping Keys", () => {
  it("verifies user list and user details queries use canonical organization-level keys", () => {
    const listKeyBranchA = getScopeQueryKey("users", null, [{ page: 1 }]);
    const listKeyBranchB = getScopeQueryKey("users", null, [{ page: 1 }]);
    expect(listKeyBranchA).toEqual(["users", { scope: "organization" }, { page: 1 }]);
    expect(listKeyBranchB).toEqual(["users", { scope: "organization" }, { page: 1 }]);
    expect(listKeyBranchA).toEqual(listKeyBranchB);

    const detailKeyBranchA = getScopeQueryKey("user", null, ["u1"]);
    const detailKeyBranchB = getScopeQueryKey("user", null, ["u1"]);
    expect(detailKeyBranchA).toEqual(["user", { scope: "organization" }, "u1"]);
    expect(detailKeyBranchB).toEqual(["user", { scope: "organization" }, "u1"]);
    expect(detailKeyBranchA).toEqual(detailKeyBranchB);
  });
});

describe("Staff-User Linking Endpoint Contract", () => {
  it("verifies linkUserAccount matches POST /staff/:id/user contract", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } });

    await linkUserAccount("emp_1", "usr_1");

    expect(apiClient.post).toHaveBeenCalledWith("/staff/emp_1/user", { userId: "usr_1" }, {
      branchScope: "current",
    });
  });

  it("verifies unlinkUserAccount matches DELETE /staff/:id/user contract", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    await unlinkUserAccount("emp_1");

    expect(apiClient.delete).toHaveBeenCalledWith("/staff/emp_1/user", {
      branchScope: "current",
    });
  });
});
