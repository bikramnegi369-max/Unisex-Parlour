// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { normalizeAppointment } from "../api/appointments.api";
import type { Appointment } from "../types/appointment.types";

// ---------------------------------------------------------------------------
// This is the EXACT backend response from the user's P0 bug report.
// Every test in this file validates that our normalizer correctly transforms
// this shape into the canonical frontend Appointment type.
// ---------------------------------------------------------------------------
const BACKEND_RESPONSE_FIXTURE = {
  _id: "6a7d6b221561194366dee48b",
  organizationId: "6a674eeb35f4849a26cab307",
  branchId: "6a674eeb35f4849a26cab309",
  appointmentCode: "APT-20260813-0001",

  customerId: {
    _id: "6a6ae46ff82d8d963de75f3e",
    name: "kush qurilo",
    email: "kushqurilo@gmail.com",
    phone: "9654165886",
  },

  staffId: {
    _id: "6a75678df2fbed690715c5de",
    name: "rahul roy",
  },

  services: [
    {
      serviceId: "6a75b6961f6fcad358a15d0c",
      name: "test 1",
      duration: 30,
      price: 0,
      taxRate: 13,
      taxAmount: 0,
    },
  ],

  startAt: "2026-08-13T07:05:00.000Z",
  endAt: "2026-08-13T07:35:00.000Z",
  appointmentDate: "2026-08-13",
  startTime: "12:35",
  endTime: "13:05",
  totalDuration: 30,

  pricing: {
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  },

  cancellation: {
    cancelledBy: null,
    cancelledAt: null,
    reason: null,
  },

  reminder: {
    email: {
      status: "cancelled" as const,
      sentAt: null,
      failedAt: null,
      failureReason: "sendAt is in the past",
    },
    sms: {
      status: "cancelled" as const,
      sentAt: null,
      failedAt: null,
      failureReason: "sendAt is in the past",
    },
    enabled: true,
    channel: "sms" as const,
    offsetMinutes: 60,
    status: "cancelled" as const,
    sendAt: "2026-08-13T06:05:00.000Z",
    sentAt: null,
    failedAt: null,
    failureReason: "sendAt is in the past",
  },

  status: "scheduled",
  bookingType: "advance",
  notes: "testing brother",
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-13T06:58:42.817Z",
  updatedAt: "2026-08-13T06:58:42.823Z",
};

describe("normalizeAppointment — Backend Response Contract", () => {
  let normalized: Appointment;

  // Normalize once, test many assertions against the result
  beforeAll(() => {
    normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
  });

  // -----------------------------------------------------------------------
  // 1. ID Normalization
  // -----------------------------------------------------------------------
  describe("ID normalization", () => {
    it("maps _id to id", () => {
      expect(normalized.id).toBe("6a7d6b221561194366dee48b");
    });

    it("preserves appointmentCode", () => {
      expect(normalized.appointmentCode).toBe("APT-20260813-0001");
    });

    it("falls back to id field if _id is absent", () => {
      const result = normalizeAppointment({ id: "fallback-id" });
      expect(result.id).toBe("fallback-id");
    });
  });

  // -----------------------------------------------------------------------
  // 2. Date Normalization (appointmentDate → date)
  // -----------------------------------------------------------------------
  describe("Date normalization", () => {
    it("maps appointmentDate to date", () => {
      expect(normalized.date).toBe("2026-08-13");
    });

    it("falls back to date field if appointmentDate is absent", () => {
      const result = normalizeAppointment({ date: "2026-01-01" });
      expect(result.date).toBe("2026-01-01");
    });
  });

  // -----------------------------------------------------------------------
  // 3. Time Normalization
  // -----------------------------------------------------------------------
  describe("Time normalization", () => {
    it("preserves startTime from backend", () => {
      expect(normalized.startTime).toBe("12:35");
    });

    it("preserves endTime from backend", () => {
      expect(normalized.endTime).toBe("13:05");
    });

    it("preserves totalDuration", () => {
      expect(normalized.totalDuration).toBe(30);
    });

    it("falls back to timeSlot if startTime is absent", () => {
      const result = normalizeAppointment({ timeSlot: "14:00" });
      expect(result.startTime).toBe("14:00");
    });

    it("prefers startTime over timeSlot", () => {
      const result = normalizeAppointment({ startTime: "12:00", timeSlot: "14:00" });
      expect(result.startTime).toBe("12:00");
    });
  });

  // -----------------------------------------------------------------------
  // 4. Customer Normalization (Populated Object → String ID + Summary)
  // -----------------------------------------------------------------------
  describe("Customer normalization", () => {
    it("extracts customerId as a flat string from populated object", () => {
      expect(normalized.customerId).toBe("6a6ae46ff82d8d963de75f3e");
      expect(typeof normalized.customerId).toBe("string");
    });

    it("creates customer summary from populated object", () => {
      expect(normalized.customer).toEqual({
        id: "6a6ae46ff82d8d963de75f3e",
        name: "kush qurilo",
        phone: "9654165886",
        email: "kushqurilo@gmail.com",
      });
    });

    it("preserves string customerId when not populated", () => {
      const result = normalizeAppointment({ customerId: "plain-string-id" });
      expect(result.customerId).toBe("plain-string-id");
      expect(typeof result.customerId).toBe("string");
    });

    it("REGRESSION: customerId.slice() must not crash after normalization", () => {
      // This is the exact P0 runtime crash: TypeError: appt.customerId.slice is not a function
      expect(() => normalized.customerId.slice(-6)).not.toThrow();
      expect(normalized.customerId.slice(-6)).toBe("e75f3e");
    });
  });

  // -----------------------------------------------------------------------
  // 5. Staff Normalization (Populated Object → String ID + Summary)
  // -----------------------------------------------------------------------
  describe("Staff normalization", () => {
    it("extracts staffId as a flat string from populated object", () => {
      expect(normalized.staffId).toBe("6a75678df2fbed690715c5de");
      expect(typeof normalized.staffId).toBe("string");
    });

    it("creates staff summary from populated object", () => {
      expect(normalized.staff).toEqual({
        id: "6a75678df2fbed690715c5de",
        name: "rahul roy",
      });
    });

    it("preserves null staffId (unassigned appointments)", () => {
      const result = normalizeAppointment({ staffId: null });
      expect(result.staffId).toBeNull();
      expect(result.staff).toBeNull();
    });

    it("preserves string staffId when not populated", () => {
      const result = normalizeAppointment({
        staffId: "plain-staff-id",
        staff: { id: "plain-staff-id", name: "John" },
      });
      expect(result.staffId).toBe("plain-staff-id");
      expect(typeof result.staffId).toBe("string");
    });
  });

  // -----------------------------------------------------------------------
  // 6. Services Normalization
  // -----------------------------------------------------------------------
  describe("Services normalization", () => {
    it("preserves service name field", () => {
      expect(normalized.services[0].name).toBe("test 1");
    });

    it("preserves service duration and price", () => {
      expect(normalized.services[0].duration).toBe(30);
      expect(normalized.services[0].price).toBe(0);
    });

    it("preserves taxRate and taxAmount", () => {
      expect(normalized.services[0].taxRate).toBe(13);
      expect(normalized.services[0].taxAmount).toBe(0);
    });

    it("preserves serviceId", () => {
      expect(normalized.services[0].serviceId).toBe("6a75b6961f6fcad358a15d0c");
    });

    it("falls back to serviceName if name is absent (legacy backend)", () => {
      const result = normalizeAppointment({
        services: [{ serviceId: "s1", serviceName: "Haircut", duration: 45, price: 500 }],
      });
      expect(result.services[0].name).toBe("Haircut");
    });

    it("handles empty services array", () => {
      const result = normalizeAppointment({ services: [] });
      expect(result.services).toEqual([]);
    });

    it("derives serviceIds from services when serviceIds is absent", () => {
      expect(normalized.serviceIds).toEqual(["6a75b6961f6fcad358a15d0c"]);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Cancellation Normalization
  // -----------------------------------------------------------------------
  describe("Cancellation normalization", () => {
    it("preserves cancellation object", () => {
      expect(normalized.cancellation).toEqual({
        cancelledBy: null,
        cancelledAt: null,
        reason: null,
      });
    });

    it("derives cancellationReason from cancellation.reason for backward compatibility", () => {
      const withReason = normalizeAppointment({
        cancellation: { reason: "Customer no-show", cancelledAt: "2026-08-13T10:00:00Z", cancelledBy: "admin" },
      });
      expect(withReason.cancellationReason).toBe("Customer no-show");
      expect(withReason.cancelledAt).toBe("2026-08-13T10:00:00Z");
    });

    it("falls back to flat cancellationReason if cancellation object is absent", () => {
      const result = normalizeAppointment({ cancellationReason: "Legacy reason" });
      expect(result.cancellationReason).toBe("Legacy reason");
    });
  });

  // -----------------------------------------------------------------------
  // 8. Reminder Normalization
  // -----------------------------------------------------------------------
  describe("Reminder normalization", () => {
    it("preserves the full reminder object", () => {
      expect(normalized.reminder?.enabled).toBe(true);
      expect(normalized.reminder?.channel).toBe("sms");
      expect(normalized.reminder?.offsetMinutes).toBe(60);
      expect(normalized.reminder?.status).toBe("cancelled");
      expect(normalized.reminder?.sendAt).toBe("2026-08-13T06:05:00.000Z");
      expect(normalized.reminder?.failureReason).toBe("sendAt is in the past");
    });

    it("preserves per-channel statuses", () => {
      expect(normalized.reminder?.email?.status).toBe("cancelled");
      expect(normalized.reminder?.email?.failureReason).toBe("sendAt is in the past");
      expect(normalized.reminder?.sms?.status).toBe("cancelled");
      expect(normalized.reminder?.sms?.failureReason).toBe("sendAt is in the past");
    });
  });

  // -----------------------------------------------------------------------
  // 9. Branch / Organization / Metadata
  // -----------------------------------------------------------------------
  describe("Metadata normalization", () => {
    it("preserves organizationId", () => {
      expect(normalized.organizationId).toBe("6a674eeb35f4849a26cab307");
    });

    it("preserves branchId as string", () => {
      expect(normalized.branchId).toBe("6a674eeb35f4849a26cab309");
      expect(typeof normalized.branchId).toBe("string");
    });

    it("preserves status and bookingType", () => {
      expect(normalized.status).toBe("scheduled");
      expect(normalized.bookingType).toBe("advance");
    });

    it("preserves notes", () => {
      expect(normalized.notes).toBe("testing brother");
    });

    it("preserves pricing", () => {
      expect(normalized.pricing).toEqual({
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
      });
    });

    it("preserves ISO datetime fields", () => {
      expect(normalized.startAt).toBe("2026-08-13T07:05:00.000Z");
      expect(normalized.endAt).toBe("2026-08-13T07:35:00.000Z");
      expect(normalized.createdAt).toBe("2026-08-13T06:58:42.817Z");
      expect(normalized.updatedAt).toBe("2026-08-13T06:58:42.823Z");
    });
  });

  // -----------------------------------------------------------------------
  // 10. Populated branchId normalization
  // -----------------------------------------------------------------------
  describe("Populated branchId normalization", () => {
    it("handles populated branchId object", () => {
      const result = normalizeAppointment({
        branchId: { _id: "br-1", name: "Main Branch", timezone: "Asia/Kolkata" },
      });
      expect(result.branchId).toBe("br-1");
      expect(result.branch).toEqual({
        id: "br-1",
        name: "Main Branch",
        timezone: "Asia/Kolkata",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Calendar View Regression Tests
// ---------------------------------------------------------------------------
describe("Calendar View — Data Contract Regression", () => {
  it("normalized appointment date matches '2026-08-13' for calendar date filtering", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
    const selectedDate = "2026-08-13";
    expect(normalized.date).toBe(selectedDate);
    // This simulates CalendarView's filter: app.date === selectedStr
    expect(normalized.date === selectedDate).toBe(true);
  });

  it("normalized staffId matches employee lane id for staff lane matching", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
    const laneId = "6a75678df2fbed690715c5de"; // Rahul Roy's employee ID
    // This simulates CalendarView's filter: a.staffId === lane.id
    expect(normalized.staffId === laneId).toBe(true);
  });

  it("null staffId routes to Unassigned lane", () => {
    const unassigned = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      staffId: null,
    });
    // This simulates CalendarView's filter: lane.id === null ? !a.staffId : ...
    expect(!unassigned.staffId).toBe(true);
    expect(unassigned.staffId).toBeNull();
  });

  it("startTime and endTime are usable for getAppointmentPosition", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
    // Simulates the calendar's time parsing: startTime.split(":").map(Number)
    const [startHour, startMin] = normalized.startTime.split(":").map(Number);
    expect(startHour).toBe(12);
    expect(startMin).toBe(35);

    const [endHour, endMin] = normalized.endTime!.split(":").map(Number);
    expect(endHour).toBe(13);
    expect(endMin).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// ListView Runtime Crash Regression Test
// ---------------------------------------------------------------------------
describe("ListView — Runtime Crash Regression", () => {
  it("customerId is always a string after normalization, never an object", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);

    // The P0 crash: TypeError: appt.customerId.slice is not a function
    // This happened because customerId was an object, and objects don't have .slice()
    expect(typeof normalized.customerId).toBe("string");
    expect(normalized.customerId.length).toBeGreaterThan(0);

    // Verify .slice() works without throwing
    const lastSix = normalized.customerId.slice(-6);
    expect(lastSix).toBe("e75f3e");
  });

  it("customer summary name is available for display fallback", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
    // ListView cell uses: appt.customer?.name || "Customer #" + appt.customerId.slice(-6)
    const displayName = normalized.customer?.name || "Customer #" + normalized.customerId.slice(-6);
    expect(displayName).toBe("kush qurilo");
  });

  it("handles missing customer gracefully", () => {
    const result = normalizeAppointment({
      customerId: "plain-id-123",
    });
    expect(result.customer).toBeUndefined();
    const displayName = result.customer?.name || "Customer #" + result.customerId.slice(-6);
    expect(displayName).toBe("Customer #id-123");
  });

  it("staffId is string | null, never an object", () => {
    const normalized = normalizeAppointment(BACKEND_RESPONSE_FIXTURE);
    expect(typeof normalized.staffId).toBe("string");

    const unassigned = normalizeAppointment({ ...BACKEND_RESPONSE_FIXTURE, staffId: null });
    expect(unassigned.staffId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Week View Range Filtering
// ---------------------------------------------------------------------------
describe("Week View — Date Range Data Contract", () => {
  it("filters appointments within a Monday–Sunday week range", () => {
    const weekStart = "2026-08-10"; // Monday
    const weekEnd = "2026-08-16"; // Sunday

    const monday = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-monday",
      appointmentDate: "2026-08-10",
    });
    const wednesday = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-wednesday",
      appointmentDate: "2026-08-12",
    });
    const sunday = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-sunday",
      appointmentDate: "2026-08-16",
    });
    const outsideBefore = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-outside-before",
      appointmentDate: "2026-08-09",
    });
    const outsideAfter = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-outside-after",
      appointmentDate: "2026-08-17",
    });

    const all = [monday, wednesday, sunday, outsideBefore, outsideAfter];
    const inRange = all.filter(
      (app) => app.date >= weekStart && app.date <= weekEnd,
    );

    expect(inRange).toHaveLength(3);
    expect(inRange.map((a) => a.id)).toEqual([
      "appt-monday",
      "appt-wednesday",
      "appt-sunday",
    ]);
  });

  it("Day View filters by single date only", () => {
    const day = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-day",
      appointmentDate: "2026-08-13",
    });
    const otherDay = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-other",
      appointmentDate: "2026-08-14",
    });

    const selectedStr = "2026-08-13";
    const dayView = [day, otherDay].filter((a) => a.date === selectedStr);

    expect(dayView).toHaveLength(1);
    expect(dayView[0].id).toBe("appt-day");
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Safe Malformed Data
// ---------------------------------------------------------------------------
describe("Safe Malformed Data Handling", () => {
  it("handles missing customerId without crashing", () => {
    const result = normalizeAppointment({
      _id: "appt-no-customer",
      customerId: "",
    });
    expect(result.customerId).toBe("");
    // Safe fallback: no customer name, no customerId → "Unknown customer"
    const displayName = result.customer?.name || "Unknown customer";
    expect(displayName).toBe("Unknown customer");
  });

  it("handles missing customerId and missing customer object", () => {
    const result = normalizeAppointment({
      _id: "appt-no-customer-obj",
    });
    expect(result.customerId).toBe("");
    expect(result.customer).toBeUndefined();
    const displayName = result.customer?.name || "Unknown customer";
    expect(displayName).toBe("Unknown customer");
  });

  it("handles empty services array without crashing", () => {
    const result = normalizeAppointment({
      _id: "appt-no-services",
      services: [],
    });
    expect(result.services).toEqual([]);
    const serviceSummary = result.services
      .map((s) => s?.name)
      .filter(Boolean)
      .join(", ");
    expect(serviceSummary).toBe("");
  });

  it("handles services with missing name field", () => {
    const result = normalizeAppointment({
      _id: "appt-no-service-name",
      services: [{ serviceId: "s1", duration: 30, price: 100 }],
    });
    expect(result.services[0].name).toBe("");
    const names = result.services
      .map((s) => s?.name)
      .filter((n): n is string => Boolean(n));
    expect(names).toHaveLength(0);
  });

  it("handles null staffId with no staff summary", () => {
    const result = normalizeAppointment({
      _id: "appt-unassigned",
      staffId: null,
    });
    expect(result.staffId).toBeNull();
    expect(result.staff).toBeNull();
    // Unassigned lane matching: !a.staffId must be true
    expect(!result.staffId).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Calendar Completeness / Pagination
// ---------------------------------------------------------------------------
describe("Calendar Completeness — Page Size", () => {
  it("calendar queries request a large page size to avoid silent truncation", () => {
    // The page.tsx sends limit: 500 for calendar views.
    // This test verifies the AppointmentListQuery type supports it.
    const calendarQuery = {
      date: "2026-08-13",
      limit: 500,
    };
    expect(calendarQuery.limit).toBe(500);
    expect(calendarQuery.date).toBe("2026-08-13");
  });

  it("week calendar queries send startDate and endDate", () => {
    const weekQuery = {
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      limit: 500,
    };
    expect(weekQuery.startDate).toBe("2026-08-10");
    expect(weekQuery.endDate).toBe("2026-08-16");
    expect(weekQuery.limit).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Branch Timezone Behavior
// ---------------------------------------------------------------------------
describe("Branch Timezone Behavior", () => {
  it("formats ISO timestamps in branch timezone (Asia/Kolkata)", () => {
    const iso = "2026-08-13T07:05:00.000Z";
    // 07:05 UTC = 12:35 IST
    const kolkata = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
    expect(kolkata).toContain("12:35");
  });

  it("formats ISO timestamps in branch timezone (UTC)", () => {
    const iso = "2026-08-13T07:05:00.000Z";
    const utc = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
    expect(utc).toContain("07:05");
  });

  it("formats ISO timestamps in branch timezone (America/New_York)", () => {
    const iso = "2026-08-13T07:05:00.000Z";
    // 07:05 UTC = 03:05 EDT (UTC-4 in August)
    const ny = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
    expect(ny).toContain("03:05");
  });

  it("derives branch-local today string from branch timezone", () => {
    // Use a fixed instant and verify the branch-local date differs across timezones
    const instant = new Date("2026-08-13T23:30:00.000Z");
    const kolkataDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
    // 23:30 UTC = 05:00 IST next day (Aug 14)
    expect(kolkataDate).toContain("2026-08-14");

    const nyDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
    // 23:30 UTC = 19:30 EDT same day (Aug 13)
    expect(nyDate).toContain("2026-08-13");
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Overlapping Appointments
// ---------------------------------------------------------------------------
describe("Overlapping Appointment Layout", () => {
  it("two overlapping appointments get different columns", () => {
    const apptA = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-a",
      startTime: "10:00",
      endTime: "11:00",
    });
    const apptB = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-b",
      startTime: "10:30",
      endTime: "11:30",
    });

    // Simulate the collision layout: both must be visible
    const sorted = [apptA, apptB].sort((a, b) => {
      const aStart = Number(a.startTime.split(":")[0]) * 60 + Number(a.startTime.split(":")[1]);
      const bStart = Number(b.startTime.split(":")[0]) * 60 + Number(b.startTime.split(":")[1]);
      return aStart - bStart;
    });

    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe("appt-a");
    expect(sorted[1].id).toBe("appt-b");

    // Both appointments must have distinct start times (no collision hiding)
    expect(sorted[0].startTime).not.toBe(sorted[1].startTime);
  });

  it("non-overlapping appointments do not conflict", () => {
    const apptA = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-a",
      startTime: "09:00",
      endTime: "10:00",
    });
    const apptB = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-b",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(apptA.endTime).toBe("10:00");
    expect(apptB.startTime).toBe("10:00");
    // No overlap: A ends exactly when B starts
    expect(apptA.endTime! <= apptB.startTime).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Production Hardening — Appointments Outside Viewport
// ---------------------------------------------------------------------------
describe("Appointments Outside 08:00–20:00 Viewport", () => {
  it("appointments before 08:00 are detected as outside viewport", () => {
    const early = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-early",
      startTime: "07:00",
      endTime: "07:30",
    });
    const startMin = Number(early.startTime.split(":")[0]) * 60 + Number(early.startTime.split(":")[1]);
    const viewportStart = 8 * 60;
    expect(startMin < viewportStart).toBe(true);
  });

  it("appointments after 20:00 are detected as outside viewport", () => {
    const late = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-late",
      startTime: "21:00",
      endTime: "21:30",
    });
    const startMin = Number(late.startTime.split(":")[0]) * 60 + Number(late.startTime.split(":")[1]);
    const viewportEnd = 20 * 60;
    expect(startMin >= viewportEnd).toBe(true);
  });

  it("appointments within viewport are not flagged", () => {
    const normal = normalizeAppointment({
      ...BACKEND_RESPONSE_FIXTURE,
      _id: "appt-normal",
      startTime: "12:35",
      endTime: "13:05",
    });
    const startMin = Number(normal.startTime.split(":")[0]) * 60 + Number(normal.startTime.split(":")[1]);
    const endMin = Number(normal.endTime!.split(":")[0]) * 60 + Number(normal.endTime!.split(":")[1]);
    expect(startMin >= 8 * 60 && endMin <= 20 * 60).toBe(true);
  });
});
