import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  getStaffDeviceMappings,
  getStaffDeviceMappingById,
  createStaffDeviceMapping,
  updateStaffDeviceMapping,
  deactivateStaffDeviceMapping,
} from "../api/attendance.api";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("StaffDeviceMapping API client methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffDeviceMappings sends GET /attendance/mappings with branchScope: current", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            _id: "m-1",
            organizationId: "org-1",
            branchId: "branch-1",
            provider: "simulator",
            deviceId: "dev-1",
            externalEmployeeCode: "101",
            staffId: { _id: "s-1", name: "John", staffCode: "STF01", isActive: true },
            isActive: true,
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    } as never);

    const result = await getStaffDeviceMappings({ search: "John", provider: "simulator" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/attendance/mappings",
      expect.objectContaining({
        branchScope: "current",
        params: { search: "John", provider: "simulator" },
      })
    );
    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0].externalEmployeeCode).toBe("101");
  });

  it("createStaffDeviceMapping sends POST /attendance/mappings", async () => {
    const payload = {
      staffId: "s-1",
      provider: "simulator",
      deviceId: "dev-1",
      externalEmployeeCode: "101",
      notes: "Initial registration",
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { _id: "m-1", ...payload, isActive: true },
      },
    } as never);

    const result = await createStaffDeviceMapping(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/attendance/mappings",
      payload,
      { branchScope: "current" }
    );
    expect(result._id).toBe("m-1");
  });

  it("updateStaffDeviceMapping sends PATCH /attendance/mappings/:id", async () => {
    const payload = {
      notes: "Updated terminal notes",
      mappingStatus: "mapped" as const,
    };

    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: {
        success: true,
        data: { _id: "m-1", ...payload },
      },
    } as never);

    const result = await updateStaffDeviceMapping("m-1", payload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/attendance/mappings/m-1",
      payload,
      { branchScope: "current" }
    );
    expect(result.notes).toBe("Updated terminal notes");
  });

  it("deactivateStaffDeviceMapping sends DELETE /attendance/mappings/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: {
        success: true,
        data: { _id: "m-1", isActive: false, effectiveTo: "2026-11-19T10:00:00.000Z" },
      },
    } as never);

    const result = await deactivateStaffDeviceMapping("m-1");

    expect(apiClient.delete).toHaveBeenCalledWith(
      "/attendance/mappings/m-1",
      { branchScope: "current" }
    );
    expect(result.isActive).toBe(false);
  });
});
