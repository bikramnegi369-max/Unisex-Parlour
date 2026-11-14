import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  adjustAttendance,
  getAttendanceRegister,
  getProviderStatus,
  ingestSimulatorEvents,
  recordLeaveException,
} from "../api/attendance.api";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Attendance API contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests a date/search/status scoped register using the authenticated current branch", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { date: "2026-11-14", data: [], total: 0 } },
    } as never);

    await getAttendanceRegister({ date: "2026-11-14", search: "Mira", status: "missing_punch" });

    expect(apiClient.get).toHaveBeenCalledWith("/attendance/records", {
      params: { date: "2026-11-14", search: "Mira", status: "missing_punch" },
      branchScope: "current",
    });
  });

  it("sends manual adjustment reason and status without tenant identity fields", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: {} } } as never);
    await adjustAttendance({ staffId: "staff-1", date: "2026-11-14", status: "present", reason: "Reviewed punch register" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/attendance/records/adjust",
      { staffId: "staff-1", date: "2026-11-14", status: "present", reason: "Reviewed punch register" },
      { branchScope: "current" },
    );
    expect(JSON.stringify(vi.mocked(apiClient.post).mock.calls[0][1])).not.toContain("organizationId");
  });

  it("loads provider status and posts simulator events through the supported route", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { success: true, data: { configurations: [], syncStates: [] } } } as never);
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: {} } } as never);
    await getProviderStatus();
    await ingestSimulatorEvents({
      checkpoint: "manual-1",
      streamIdentifier: "manual_import",
      events: [{ employeeCode: "E-1", deviceId: "SIM-1" }],
    });
    expect(apiClient.get).toHaveBeenCalledWith("/attendance/providers/status", { branchScope: "current" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/attendance/providers/simulator/events",
      { checkpoint: "manual-1", streamIdentifier: "manual_import", events: [{ employeeCode: "E-1", deviceId: "SIM-1" }] },
      { branchScope: "current" },
    );
  });

  it("records per-date leave exceptions with a reason", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: {} } } as never);
    await recordLeaveException({ leaveId: "leave-1", date: "2026-11-14", decision: "worked", reason: "Verified by manager" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/attendance/leave-exceptions",
      { leaveId: "leave-1", date: "2026-11-14", decision: "worked", reason: "Verified by manager" },
      { branchScope: "current" },
    );
  });
});
