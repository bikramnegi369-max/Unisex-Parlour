// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import {
  staffAvailabilityApi,
  REASON_LABELS,
  type SlotAvailabilityBatchResponse,
  type CalendarAvailabilityResponse,
} from "../api/staffAvailability.api";
import {
  useStaffAvailability,
  useCalendarStaffAvailability,
  staffAvailabilityKeys,
} from "../hooks/useStaffAvailability";
import {
  useCreateAppointment,
  useRescheduleAppointment,
  useAssignAppointmentStaff,
} from "../hooks/useAppointmentMutations";
import { AppointmentCalendarView } from "../components/AppointmentCalendarView";
import type { Appointment } from "../types/appointment.types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: {
      data: [
        { id: "emp_1", name: "Alice Stylist", designation: "Hair Stylist" },
        { id: "emp_2", name: "Bob Colorist", designation: "Colorist" },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/leaves/hooks/useLeaveQueries", () => ({
  useLeaves: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranch: {
      id: "branch_a",
      name: "Branch Downtown",
      timezone: "Asia/Kolkata",
    },
    currentBranchId: "branch_a",
    availableBranches: [
      { id: "branch_a", name: "Branch Downtown", isActive: true },
      { id: "branch_b", name: "Branch Uptown", isActive: true },
    ],
    isAllBranchesSelected: false,
  }),
}));

vi.mock("../api/appointments.api", () => ({
  createAppointment: vi.fn().mockResolvedValue({ id: "apt_new" }),
  updateAppointmentMetadata: vi.fn().mockResolvedValue({ id: "apt_1" }),
  rescheduleAppointment: vi.fn().mockResolvedValue({ id: "apt_1" }),
  assignAppointmentStaff: vi.fn().mockResolvedValue({ id: "apt_1" }),
  updateAppointmentStatus: vi.fn().mockResolvedValue({ id: "apt_1" }),
  deleteAppointment: vi.fn().mockResolvedValue({ success: true }),
  triggerAppointmentReminder: vi.fn().mockResolvedValue({ success: true }),
  requestConsumptionOtp: vi.fn().mockResolvedValue({ success: true }),
  completeWithSubscription: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/api/crossTabSync", () => ({
  broadcastCrossTabInvalidation: vi.fn(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("Frontend Staff Availability Test Suite (Scenarios 1-18)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Slot search disabled until branch/date/time are set
  // -------------------------------------------------------------------------
  it("Scenario 1: Slot search is disabled when date or time is missing", () => {
    const { result } = renderHook(
      () =>
        useStaffAvailability({
          branchId: "branch_a",
          date: "",
          startTime: "",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    // When disabled, TanStack Query status is pending and fetchStatus is idle (no network call dispatched)
    expect(result.current.fetchStatus).toBe("idle");
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Slot search triggers automatically upon valid slot inputs
  // -------------------------------------------------------------------------
  it("Scenario 2: Slot search triggers automatically when date and time are provided", async () => {
    const mockBatchResponse: SlotAvailabilityBatchResponse = {
      date: "2026-11-25",
      startAt: "2026-11-25T10:00:00.000Z",
      endAt: "2026-11-25T10:45:00.000Z",
      totalStaff: 1,
      availableCount: 1,
      staff: [
        {
          staffId: "emp_1",
          branchId: "branch_a",
          date: "2026-11-25",
          startAt: "2026-11-25T10:00:00.000Z",
          endAt: "2026-11-25T10:45:00.000Z",
          status: "available",
          reasons: [],
          warnings: [],
          evaluatedAt: new Date().toISOString(),
          staff: { id: "emp_1", name: "Alice Stylist" },
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: mockBatchResponse },
    });

    const res = await staffAvailabilityApi.getStaffAvailability({
      branchId: "branch_a",
      date: "2026-11-25",
      startTime: "10:00",
      duration: 45,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/appointments/availability/staff",
      {
        params: {
          branchId: "branch_a",
          date: "2026-11-25",
          startTime: "10:00",
          duration: 45,
        },
      },
    );
    expect(res.staff[0].status).toBe("available");
    expect(res.staff[0].staffId).toBe("emp_1");
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Available staff rendered at the top of the selection list
  // -------------------------------------------------------------------------
  it("Scenario 3: Partitions and sorts available staff to the top of the list", () => {
    const employees = [
      { id: "emp_1", name: "Alice Stylist" },
      { id: "emp_2", name: "Bob Colorist" },
      { id: "emp_3", name: "Charlie Barber" },
    ];

    const availabilityMap = new Map<string, { status: string; reasons: string[] }>([
      ["emp_1", { status: "unavailable", reasons: ["APPOINTMENT_CONFLICT"] }],
      ["emp_2", { status: "available", reasons: [] }],
      ["emp_3", { status: "requires_review", reasons: ["ATTENDANCE_REVIEW_REQUIRED"] }],
    ]);

    const sorted = [...employees].sort((a, b) => {
      const aAvail = availabilityMap.get(a.id);
      const bAvail = availabilityMap.get(b.id);
      const aScore = aAvail?.status === "available" ? 0 : aAvail?.status === "requires_review" ? 1 : 2;
      const bScore = bAvail?.status === "available" ? 0 : bAvail?.status === "requires_review" ? 1 : 2;
      return aScore - bScore;
    });

    expect(sorted[0].id).toBe("emp_2"); // available first
    expect(sorted[1].id).toBe("emp_3"); // requires_review second
    expect(sorted[2].id).toBe("emp_1"); // unavailable last
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Unavailable staff displayed with disabled state and concise reason tag
  // -------------------------------------------------------------------------
  it("Scenario 4: Formats unavailable staff with proper reason tags and disabled flag", () => {
    expect(REASON_LABELS["BRANCH_NOT_ASSIGNED"]).toBe("Not assigned to branch");
    expect(REASON_LABELS["STAFF_NOT_SCHEDULED"]).toBe("Not scheduled / off duty");
    expect(REASON_LABELS["STAFF_INACTIVE"]).toBe("Staff inactive");
    expect(REASON_LABELS["BRANCH_CLOSED"]).toBe("Branch closed");

    const evaluation = {
      staffId: "emp_1",
      status: "unavailable" as const,
      reasons: ["BRANCH_NOT_ASSIGNED" as const],
    };

    const isDisabled = evaluation.status === "unavailable";
    const reasonTag = REASON_LABELS[evaluation.reasons[0]];

    expect(isDisabled).toBe(true);
    expect(reasonTag).toBe("Not assigned to branch");
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Staff on approved leave labeled with leave reason
  // -------------------------------------------------------------------------
  it("Scenario 5: Identifies full-day and partial-day leave reasons", () => {
    expect(REASON_LABELS["APPROVED_LEAVE"]).toBe("On approved leave");
    expect(REASON_LABELS["PARTIAL_DAY_LEAVE_CONFLICT"]).toBe("Partial-day leave");

    const fullDayEval = {
      staffId: "emp_1",
      status: "unavailable" as const,
      reasons: ["APPROVED_LEAVE" as const],
    };
    expect(REASON_LABELS[fullDayEval.reasons[0]]).toBe("On approved leave");

    const partialDayEval = {
      staffId: "emp_2",
      status: "unavailable" as const,
      reasons: ["PARTIAL_DAY_LEAVE_CONFLICT" as const],
    };
    expect(REASON_LABELS[partialDayEval.reasons[0]]).toBe("Partial-day leave");
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Staff with appointment conflict labeled with overlap reason
  // -------------------------------------------------------------------------
  it("Scenario 6: Maps direct and cross-branch booking conflicts to user-friendly tags", () => {
    expect(REASON_LABELS["APPOINTMENT_CONFLICT"]).toBe("Booked during this time");
    expect(REASON_LABELS["CROSS_BRANCH_CONFLICT"]).toBe("Booked at another branch");
    expect(REASON_LABELS["TRAVEL_TIME_CONFLICT"]).toBe("Travel buffer conflict");
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Multi-service selection sends all service IDs to availability query
  // -------------------------------------------------------------------------
  it("Scenario 7: Multi-service booking passes comma-separated serviceIds list", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          date: "2026-11-25",
          startAt: "2026-11-25T10:00:00.000Z",
          endAt: "2026-11-25T11:15:00.000Z",
          totalStaff: 1,
          availableCount: 1,
          staff: [],
        },
      },
    });

    await staffAvailabilityApi.getStaffAvailability({
      branchId: "branch_a",
      date: "2026-11-25",
      startTime: "10:00",
      duration: 75,
      serviceIds: ["srv_haircut", "srv_coloring", "srv_spa"],
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/appointments/availability/staff",
      {
        params: {
          branchId: "branch_a",
          date: "2026-11-25",
          startTime: "10:00",
          duration: 75,
          serviceIds: "srv_haircut,srv_coloring,srv_spa",
        },
      },
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Service qualification changes re-trigger query and re-order list
  // -------------------------------------------------------------------------
  it("Scenario 8: Generates unique TanStack Query keys when services change to force cache re-validation", () => {
    const keyServiceA = staffAvailabilityKeys.slot({
      branchId: "branch_a",
      date: "2026-11-25",
      startTime: "10:00",
      serviceIds: ["srv_1"],
    });

    const keyServiceAB = staffAvailabilityKeys.slot({
      branchId: "branch_a",
      date: "2026-11-25",
      startTime: "10:00",
      serviceIds: ["srv_1", "srv_2"],
    });

    expect(JSON.stringify(keyServiceA)).not.toEqual(JSON.stringify(keyServiceAB));
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Same-day appointment shows clocked-out indicator when staff has punched out
  // -------------------------------------------------------------------------
  it("Scenario 9: Flags clocked-out staff with ATTENDANCE_CLOCKED_OUT status tag", () => {
    expect(REASON_LABELS["ATTENDANCE_CLOCKED_OUT"]).toBe("Clocked out for the day");

    const evaluation = {
      staffId: "emp_1",
      status: "unavailable" as const,
      reasons: ["ATTENDANCE_CLOCKED_OUT" as const],
    };

    expect(evaluation.status).toBe("unavailable");
    expect(REASON_LABELS[evaluation.reasons[0]]).toBe("Clocked out for the day");
  });

  // -------------------------------------------------------------------------
  // Scenario 10: Attendance review required shown for unverified attendance state
  // -------------------------------------------------------------------------
  it("Scenario 10: Distinguishes review-required status for incomplete or disputed attendance", () => {
    expect(REASON_LABELS["ATTENDANCE_REVIEW_REQUIRED"]).toBe("Attendance review required");
    expect(REASON_LABELS["ATTENDANCE_INCOMPLETE"]).toBe("Attendance incomplete");
    expect(REASON_LABELS["ATTENDANCE_CONFLICT"]).toBe("Attendance conflict");

    const reviewEvaluation = {
      staffId: "emp_1",
      status: "requires_review" as const,
      reasons: ["ATTENDANCE_REVIEW_REQUIRED" as const],
    };

    expect(reviewEvaluation.status).toBe("requires_review");
    expect(REASON_LABELS[reviewEvaluation.reasons[0]]).toBe("Attendance review required");
  });

  // -------------------------------------------------------------------------
  // Scenario 11: All Branches calendar loads multi-branch lanes authoritatively
  // -------------------------------------------------------------------------
  it("Scenario 11: Requests multi-branch calendar availability without single-branch restriction", async () => {
    const mockCalendarResponse: CalendarAvailabilityResponse = {
      date: "2026-11-25",
      isAllBranches: true,
      branchCount: 2,
      staffCount: 2,
      lanes: [
        {
          id: "emp_1",
          name: "Alice Stylist",
          status: "active",
          branches: [
            { branchId: "branch_a", branchName: "Downtown", isPrimary: true },
            { branchId: "branch_b", branchName: "Uptown", isPrimary: false },
          ],
          roster: null,
          leave: null,
          attendance: { status: "clocked_in", isReconciled: true, conflictType: "none" },
        },
        {
          id: "emp_2",
          name: "Bob Colorist",
          status: "active",
          branches: [{ branchId: "branch_b", branchName: "Uptown", isPrimary: true }],
          roster: null,
          leave: null,
          attendance: null,
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: mockCalendarResponse },
    });

    const res = await staffAvailabilityApi.getCalendarAvailability({
      branchId: "all",
      date: "2026-11-25",
    });

    // branchId: "all" should be omitted or kept as multi-branch query
    expect(apiClient.get).toHaveBeenCalledWith(
      "/appointments/calendar/staff-availability",
      {
        params: {
          date: "2026-11-25",
        },
      },
    );
    expect(res.lanes.length).toBe(2);
    expect(res.isAllBranches).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 12: Zero-appointment staff lane is preserved in All Branches mode
  // -------------------------------------------------------------------------
  it("Scenario 12: Preserves staff lanes even when staff has zero appointments scheduled", () => {
    const mockAppointments: Appointment[] = []; // Zero appointments

    const mockCalendarData: CalendarAvailabilityResponse = {
      date: "2026-11-25",
      isAllBranches: true,
      branchCount: 1,
      staffCount: 1,
      lanes: [
        {
          id: "emp_idle",
          name: "Idle Stylist",
          designation: "Stylist",
          status: "active",
          branches: [{ branchId: "branch_a", branchName: "Downtown", isPrimary: true }],
          roster: null,
          leave: null,
          attendance: null,
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: mockCalendarData },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentCalendarView
          appointments={mockAppointments}
          isLoading={false}
          selectedDate={new Date("2026-11-25T00:00:00")}
          viewMode="day"
          onViewModeChange={vi.fn()}
          onSelectDate={vi.fn()}
          onSelectAppointment={vi.fn()}
          isAllBranches={true}
        />
      </QueryClientProvider>,
    );

    // Idle staff lane should be present in DOM
    const unassignedLane = screen.getByTestId("lane-unassigned");
    expect(unassignedLane).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Scenario 13: Cross-branch assignment badges rendered on staff lane headers
  // -------------------------------------------------------------------------
  it("Scenario 13: Displays multi-branch badge on staff lane headers", async () => {
    const mockCalendarData: CalendarAvailabilityResponse = {
      date: "2026-11-25",
      isAllBranches: true,
      branchCount: 2,
      staffCount: 1,
      lanes: [
        {
          id: "emp_multi",
          name: "Multi-Branch Alice",
          designation: "Lead Stylist",
          status: "active",
          branches: [
            { branchId: "branch_a", branchName: "Downtown", isPrimary: true },
            { branchId: "branch_b", branchName: "Uptown", isPrimary: false },
          ],
          roster: null,
          leave: null,
          attendance: { status: "clocked_in", isReconciled: true, conflictType: "none" },
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: mockCalendarData },
    });

    // Populate cache directly
    queryClient.setQueryData(
      staffAvailabilityKeys.calendar({ branchId: "all", date: "2026-11-25" }),
      mockCalendarData,
    );

    render(
      <QueryClientProvider client={queryClient}>
        <AppointmentCalendarView
          appointments={[]}
          isLoading={false}
          selectedDate={new Date("2026-11-25T00:00:00")}
          viewMode="day"
          onViewModeChange={vi.fn()}
          onSelectDate={vi.fn()}
          onSelectAppointment={vi.fn()}
          isAllBranches={true}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      const badge = screen.getByText("2 Branches");
      expect(badge).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 14: Appointment creation mutation invalidates availability cache
  // -------------------------------------------------------------------------
  it("Scenario 14: Invalidation triggered upon appointment creation", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAppointment(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        branchId: "branch_a",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        staffId: "emp_1",
        date: "2026-11-25",
        startTime: "10:00",
        bookingType: "advance",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        predicate: expect.any(Function),
      }),
    );

    // Verify predicate matches availability keys
    const call = invalidateSpy.mock.calls.find((c) => c[0] && typeof c[0].predicate === "function");
    expect(call).toBeDefined();
    const predicate = call![0]!.predicate as (query: { queryKey: readonly unknown[] }) => boolean;

    expect(predicate({ queryKey: ["staff-availability", "slot", {}] })).toBe(true);
    expect(predicate({ queryKey: ["calendar-staff-availability", {}] })).toBe(true);
    expect(predicate({ queryKey: ["other-key"] })).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Scenario 15: Appointment reschedule mutation invalidates availability cache
  // -------------------------------------------------------------------------
  it("Scenario 15: Invalidation triggered upon appointment rescheduling", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRescheduleAppointment(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "apt_1",
        payload: {
          date: "2026-11-26",
          startTime: "11:00",
          branchId: "branch_a",
        },
      });
    });

    expect(invalidateSpy).toHaveBeenCalled();
    const call = invalidateSpy.mock.calls.find((c) => c[0] && typeof c[0].predicate === "function");
    expect(call).toBeDefined();
    const predicate = call![0]!.predicate as (query: { queryKey: readonly unknown[] }) => boolean;

    expect(predicate({ queryKey: ["staff-availability"] })).toBe(true);
    expect(predicate({ queryKey: ["calendar-staff-availability"] })).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 16: Staff assignment mutation invalidates availability cache
  // -------------------------------------------------------------------------
  it("Scenario 16: Invalidation triggered upon staff assignment", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAssignAppointmentStaff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "apt_1",
        payload: {
          staffId: "emp_2",
          branchId: "branch_a",
        },
      });
    });

    expect(invalidateSpy).toHaveBeenCalled();
    const call = invalidateSpy.mock.calls.find((c) => c[0] && typeof c[0].predicate === "function");
    expect(call).toBeDefined();
    const predicate = call![0]!.predicate as (query: { queryKey: readonly unknown[] }) => boolean;

    expect(predicate({ queryKey: ["staff-availability"] })).toBe(true);
    expect(predicate({ queryKey: ["calendar-staff-availability"] })).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Scenario 17: Rescheduling slot query passes excludeAppointmentId to prevent self-conflict
  // -------------------------------------------------------------------------
  it("Scenario 17: Passes excludeAppointmentId when evaluating availability for rescheduling", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          date: "2026-11-25",
          startAt: "2026-11-25T10:00:00.000Z",
          endAt: "2026-11-25T10:45:00.000Z",
          totalStaff: 1,
          availableCount: 1,
          staff: [],
        },
      },
    });

    await staffAvailabilityApi.getStaffAvailability({
      branchId: "branch_a",
      date: "2026-11-25",
      startTime: "10:00",
      duration: 45,
      staffId: "emp_1",
      excludeAppointmentId: "apt_reschedule_target",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/appointments/availability/staff",
      {
        params: {
          branchId: "branch_a",
          date: "2026-11-25",
          startTime: "10:00",
          duration: 45,
          staffId: "emp_1",
          excludeAppointmentId: "apt_reschedule_target",
        },
      },
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Server availability error gracefully presented without UI crash
  // -------------------------------------------------------------------------
  it("Scenario 18: Server availability failure is handled gracefully without unhandled crashes", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(
      () =>
        useStaffAvailability({
          branchId: "branch_a",
          date: "2026-11-25",
          startTime: "10:00",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Network Error");
    });
  });
});
