// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  assignStaffSchema,
  updateStatusSchema,
} from "../schemas/appointment.schema";
import { formatInBranchTimezone } from "@/lib/formatters";

describe("Appointment Schema & API Contract Validation", () => {
  it("validates advance and walk-in appointment creation schemas", () => {
    const advanceValid = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_1",
      serviceIds: ["srv_1", "srv_2"],
      date: "2026-08-20",
      startTime: "14:30",
      bookingType: "advance",
      notes: "Customer prefers window seat",
      reminder: { enabled: true, channel: "both", offsetMinutes: 60 },
    });
    expect(advanceValid.success).toBe(true);

    const walkInValid = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_2",
      serviceIds: ["srv_1"],
      date: "2026-08-13",
      startTime: "11:00",
      bookingType: "walk_in",
    });
    expect(walkInValid.success).toBe(true);
  });

  it("rejects invalid time formats", () => {
    const invalidTime = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_1",
      serviceIds: ["srv_1"],
      date: "2026-08-20",
      startTime: "25:99", // Invalid HH:mm
      bookingType: "advance",
    });
    expect(invalidTime.success).toBe(false);
  });

  it("validates exact backend status enum values (and rejects un-contracted 'confirmed')", () => {
    const validStatuses = ["scheduled", "in_progress", "completed", "cancelled", "no_show"];
    validStatuses.forEach((status) => {
      const res = updateStatusSchema.safeParse({
        branchId: "br_1",
        status,
      });
      expect(res.success).toBe(true);
    });

    const invalidConfirmed = updateStatusSchema.safeParse({
      branchId: "br_1",
      status: "confirmed", // NOT in backend contract!
    });
    expect(invalidConfirmed.success).toBe(false);
  });

  it("validates same-branch rescheduling payload schema", () => {
    const validReschedule = rescheduleAppointmentSchema.safeParse({
      branchId: "br_1",
      date: "2026-08-25",
      startTime: "16:00",
      reason: "Customer requested time change",
    });
    expect(validReschedule.success).toBe(true);
  });

  it("validates staff assignment schema including unassignment (null)", () => {
    const assignStaff = assignStaffSchema.safeParse({
      branchId: "br_1",
      staffId: "emp_100",
    });
    expect(assignStaff.success).toBe(true);

    const unassignStaff = assignStaffSchema.safeParse({
      branchId: "br_1",
      staffId: null,
    });
    expect(unassignStaff.success).toBe(true);
  });

  it("formats appointment ISO datetimes accurately in branch timezones (Asia/Kolkata, UTC, America/New_York)", () => {
    const isoInstant = "2026-08-15T10:00:00.000Z";

    const kolkataTime = formatInBranchTimezone(isoInstant, "Asia/Kolkata");
    expect(kolkataTime).toContain("3:30"); // 10:00 UTC = 15:30 IST

    const utcTime = formatInBranchTimezone(isoInstant, "UTC");
    expect(utcTime).toContain("10:00");

    const nyTime = formatInBranchTimezone(isoInstant, "America/New_York");
    expect(nyTime).toContain("6:00"); // 10:00 UTC = 06:00 EDT (EDT is UTC-4 in August)
  });
});
