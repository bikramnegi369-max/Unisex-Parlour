import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AttendanceWorkspace from "../components/AttendanceWorkspace";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranch: { name: "Main branch", timezone: "Asia/Kolkata" },
    currentBranchId: "branch-1",
    isAllBranchesSelected: false,
  }),
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: () => false,
}));

vi.mock("../hooks/useAttendance", () => ({
  useAdjustAttendance: () => ({ mutate: vi.fn(), isPending: false }),
  useAttendanceDetail: () => ({ isLoading: false, isError: false, data: null }),
  useAttendanceProviderStatus: () => ({ isLoading: false, isError: false, data: null }),
  useAttendanceRegister: () => ({
    data: {
      date: "2026-11-16",
      timezone: "Asia/Kolkata",
      operatingHours: null,
      total: 1,
      data: [{
        staff: { _id: "staff-1", name: "Mira", staffCode: "ST-1", email: "", designation: "Stylist" },
        record: { _id: "attendance-1", status: "present", isReconciled: false },
        punches: [
          { _id: "punch-in", punchType: "in", punchAt: "2026-11-16T04:00:00.000Z", provider: "simulator", mappingStatus: "mapped" },
          { _id: "punch-out", punchType: "out", punchAt: "2026-11-16T12:00:00.000Z", provider: "simulator", mappingStatus: "mapped" },
        ],
        status: "present",
      }],
    },
    isLoading: false,
    isError: false,
  }),
  useBranchAttendanceConflicts: () => ({ isLoading: false, isError: false, data: [] }),
  useIngestSimulatorEvents: () => ({ mutate: vi.fn(), isPending: false }),
  useLeaveAppointmentConflicts: () => ({ isLoading: false, isError: false, data: { data: [] } }),
  useRecordLeaveException: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveBranchAttendanceConflict: () => ({ mutate: vi.fn(), isPending: false }),
  useResolveLeaveAppointmentConflict: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordStaffPunch: () => ({ mutate: vi.fn(), isPending: false }),
  useMonthlyMusterRoll: () => ({ isLoading: false, isError: false, data: null }),
}));

afterEach(cleanup);

describe("Attendance eligibility register", () => {
  it("shows a verified present day and explains the punch and correction rules", () => {
    render(<AttendanceWorkspace />);

    expect(screen.getByText("Mira")).toBeTruthy();
    expect(screen.getByText("present", { selector: "span" })).toBeTruthy();
    expect(
      screen.getByText(/a chronological in-punch followed by an out-punch is required to record present/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/branch opening hours do not determine individual late arrivals/i),
    ).toBeTruthy();
  });
});
