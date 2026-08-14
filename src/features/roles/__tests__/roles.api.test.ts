// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRolePermissions,
  deleteRole,
  getPermissions,
  getPermissionModules,
} from "../api/roles.api";
import { apiClient } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Roles API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("getRoles makes GET request to /rbac/roles with branchScope: 'organization'", async () => {
    const mockRolesData = [
      { id: "role_1", name: "Manager", permissions: ["customers.view"] },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockRolesData },
    });

    const result = await getRoles();

    expect(apiClient.get).toHaveBeenCalledWith("/rbac/roles", { branchScope: "organization" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("role_1");
    expect(result[0].name).toBe("Manager");
  });

  it("getRoleById makes GET request to /rbac/roles/:id", async () => {
    const mockRole = { id: "role_123", name: "Stylist", permissions: ["services.view"] };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockRole },
    });

    const result = await getRoleById("role_123");

    expect(apiClient.get).toHaveBeenCalledWith("/rbac/roles/role_123", { branchScope: "organization" });
    expect(result.id).toBe("role_123");
    expect(result.name).toBe("Stylist");
  });

  it("createRole makes POST request to /rbac/roles with payload", async () => {
    const payload = { name: "Custom Stylist", description: "Senior level" };
    const mockResponse = { id: "role_new", name: "Custom Stylist", permissions: [] };

    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockResponse },
    });

    const result = await createRole(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/rbac/roles", payload, { branchScope: "organization" });
    expect(result.id).toBe("role_new");
    expect(result.name).toBe("Custom Stylist");
  });

  it("updateRolePermissions makes PUT request to /rbac/roles/:id/permissions", async () => {
    const payload = { permissions: ["customers.view", "billing.view"] };
    const mockResponse = { id: "role_1", name: "Manager", permissions: payload.permissions };

    (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockResponse },
    });

    const result = await updateRolePermissions("role_1", payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/rbac/roles/role_1/permissions",
      payload,
      { branchScope: "organization" }
    );
    expect(result.permissions).toEqual(payload.permissions);
  });

  it("deleteRole makes DELETE request to /rbac/roles/:id", async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true },
    });

    await deleteRole("role_target");

    expect(apiClient.delete).toHaveBeenCalledWith("/rbac/roles/role_target", {
      branchScope: "organization",
    });
  });

  it("getPermissions makes GET request to /rbac/permissions with pagination params", async () => {
    const mockPermissions = [
      { key: "customers.view", name: "View Customers", module: "Customers" },
    ];
    const mockMeta = { total: 95, page: 1, limit: 10, totalPages: 10 };

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockPermissions, meta: mockMeta },
    });

    const result = await getPermissions({ page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/rbac/permissions", {
      params: { page: 1, limit: 10 },
      branchScope: "none",
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].key).toBe("customers.view");
    expect(result.meta).toEqual(mockMeta);
  });

  it("getPermissionModules makes GET request to /rbac/modules", async () => {
    const mockModules = ["Customers", "Appointments", "Services"];

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: mockModules },
    });

    const result = await getPermissionModules();

    expect(apiClient.get).toHaveBeenCalledWith("/rbac/modules", { branchScope: "none" });
    expect(result).toEqual(mockModules);
  });
});
