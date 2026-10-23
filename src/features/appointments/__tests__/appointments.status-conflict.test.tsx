import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
import { AppointmentStatusDialog } from "../components/AppointmentStatusDialog";
import { calculateLateDelayMins } from "../utils/appointmentTime";
import type { Appointment } from "../types/appointment.types";

let mockUserPermissions: string[] = ["appointments.view", "appointments.update_status"];

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Test Staff",
      email: "staff@example.com",
      role: "Staff",
      permissions: mockUserPermissions,
      organizationId: "org-1",
      branchAccess: [],
    },
    isAuthenticated: true,
    isLoading: false,
    isError: false,
  }),
}));

const mockBaseAppointment: Appointment = {
  id: "appt-101",
  organizationId: "org-1",
  branchId: "branch-main",
  appointmentCode: "APT-101",
  customerId: "cust-1",
  date: "2026-10-21",
  startTime: "10:00",
  endTime: "10:45",
  status: "scheduled",
  bookingType: "advance",
  totalDuration: 45,
  pricing: {
    subtotal: 500,
    total: 500,
  },
  staffId: "staff-99",
  serviceIds: ["srv-1"],
  services: [
    {
      serviceId: "srv-1",
      name: "Hair Cut",
      price: 500,
      duration: 45,
    },
  ],
  customer: {
    id: "cust-1",
    name: "Alex Doe",
    phone: "9876543210",
  },
  branch: {
    id: "branch-main",
    name: "Main Branch",
    timezone: "Asia/Kolkata",
  },
  createdAt: "2026-10-21T00:00:00.000Z",
  updatedAt: "2026-10-21T00:00:00.000Z",
};

describe("Appointment Late-Completion & Conflict Handling", () => {
  describe("calculateLateDelayMins (Timezone & Cross-Midnight)", () => {
    it("returns null for delay when completed on time or early", () => {
      // Scheduled end 10:45 Asia/Kolkata (which is 05:15 UTC)
      // Completed at 10:40 Asia/Kolkata (05:10 UTC)
      const res = calculateLateDelayMins({
        date: "2026-10-21",
        endTime: "10:45",
        completedAt: "2026-10-21T05:10:00.000Z",
        branchTimezone: "Asia/Kolkata",
      });
      expect(res.lateDelayMins).toBeNull();
      expect(res.actualCompletedTimeStr).toBe("10:40");
    });

    it("calculates positive late delay on same-day completion", () => {
      // Scheduled end 10:45 Asia/Kolkata (05:15 UTC)
      // Completed at 11:15 Asia/Kolkata (05:45 UTC) -> +30m
      const res = calculateLateDelayMins({
        date: "2026-10-21",
        endTime: "10:45",
        completedAt: "2026-10-21T05:45:00.000Z",
        branchTimezone: "Asia/Kolkata",
      });
      expect(res.lateDelayMins).toBe(30);
      expect(res.actualCompletedTimeStr).toBe("11:15");
    });

    it("correctly handles cross-midnight appointments across date boundaries", () => {
      // Scheduled 2026-10-21 from 23:30 to 00:15 (ends 2026-10-22 00:15 in Asia/Kolkata)
      // In Asia/Kolkata (+05:30):
      // 2026-10-22 00:15 local = 2026-10-21 18:45 UTC
      // Completed late at 2026-10-22 00:35 local = 2026-10-21 19:05 UTC (+20m late)
      const res = calculateLateDelayMins({
        date: "2026-10-22",
        endTime: "00:15",
        completedAt: "2026-10-21T19:05:00.000Z",
        branchTimezone: "Asia/Kolkata",
      });
      expect(res.lateDelayMins).toBe(20);
      expect(res.actualCompletedTimeStr).toBe("00:35");
    });

    it("correctly handles UTC branch timezone", () => {
      const res = calculateLateDelayMins({
        date: "2026-10-21",
        endTime: "14:00",
        completedAt: "2026-10-21T14:25:00.000Z",
        branchTimezone: "UTC",
      });
      expect(res.lateDelayMins).toBe(25);
      expect(res.actualCompletedTimeStr).toBe("14:25");
    });
  });

  describe("STAFF_OVERDUE_APPOINTMENT 409 Conflict Handling", () => {
    it("displays accessible conflict notice with overdue details on HTTP 409", async () => {
      const mockSubmit = vi.fn().mockRejectedValue({
        response: {
          status: 409,
          data: {
            conflictType: "STAFF_OVERDUE_APPOINTMENT",
            overdueAppointmentCode: "APT-088",
            overdueScheduledEndTime: "09:45",
            overdueMinutes: 25,
            requiresOverride: true,
            message: "Assigned staff member is currently on an overdue appointment.",
          },
        },
      });

      render(
        <AppointmentStatusDialog
          appointment={mockBaseAppointment}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          isLoading={false}
        />
      );

      // Select in_progress and submit (Dialog renders in createPortal to document.body)
      const select = document.querySelector("select[name='status']") as HTMLSelectElement;
      expect(select).toBeTruthy();
      fireEvent.change(select, { target: { value: "in_progress" } });

      const submitBtn = screen.getByRole("button", { name: /update status/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByText(/Staff Overdue Conflict Detected/i)).toBeInTheDocument();
      expect(screen.getByText("APT-088")).toBeInTheDocument();
      expect(screen.getByText("09:45")).toBeInTheDocument();
      expect(screen.getByText("+25m")).toBeInTheDocument();

      // Since mock user does not have appointments.reschedule, permission warning is shown
      expect(
        screen.getByText(/You do not have the required permission/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /confirm & override/i })
      ).not.toBeInTheDocument();
    });

    it("allows override retry with allowOverdueStaffOverride: true when user has appointments.reschedule", async () => {
      mockUserPermissions = [
        "appointments.view",
        "appointments.update_status",
        "appointments.reschedule",
      ];

      let callCount = 0;
      const mockSubmit = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw {
            response: {
              status: 409,
              data: {
                conflictType: "STAFF_OVERDUE_APPOINTMENT",
                overdueAppointmentCode: "APT-088",
                overdueScheduledEndTime: "09:45",
                overdueMinutes: 30,
                requiresOverride: true,
              },
            },
          };
        }
        return Promise.resolve();
      });

      const mockClose = vi.fn();

      render(
        <AppointmentStatusDialog
          appointment={mockBaseAppointment}
          isOpen={true}
          onClose={mockClose}
          onSubmit={mockSubmit}
          isLoading={false}
        />
      );

      const select = document.querySelector("select[name='status']") as HTMLSelectElement;
      expect(select).toBeTruthy();
      fireEvent.change(select, { target: { value: "in_progress" } });

      const submitBtn = screen.getByRole("button", { name: /update status/i });
      fireEvent.click(submitBtn);

      // Overdue conflict block appears with override button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /confirm & override/i })).toBeInTheDocument();
      });

      // Click Confirm & Override
      const overrideBtn = screen.getByRole("button", { name: /confirm & override/i });
      fireEvent.click(overrideBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(2);
      });

      expect(mockSubmit).toHaveBeenLastCalledWith(
        "appt-101",
        expect.objectContaining({
          status: "in_progress",
          allowOverdueStaffOverride: true,
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
