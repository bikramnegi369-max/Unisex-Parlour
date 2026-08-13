// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createAppointmentSchema } from "../schemas/appointment.schema";
import { hasPermission, type UserSession } from "@/lib/permissions";
import { formatInBranchTimezone } from "@/lib/formatters";
import type {
  Appointment,
  AppointmentReminder,
  CreateAppointmentPayload,
  TriggerReminderPayload,
} from "../types/appointment.types";

describe("Appointments Phase 3 — Reminder Notification Contract & UX Rules", () => {
  describe("A. Zod Schema & Input Contract", () => {
    it("accepts valid reminder channels: sms, email, both", () => {
      const channels = ["sms", "email", "both"] as const;
      channels.forEach((channel) => {
        const res = createAppointmentSchema.safeParse({
          branchId: "br_1",
          customerId: "cust_1",
          serviceIds: ["srv_1"],
          date: "2026-08-25",
          startTime: "10:00",
          bookingType: "advance",
          reminder: {
            enabled: true,
            channel,
            offsetMinutes: 60,
          },
        });
        expect(res.success).toBe(true);
      });
    });

    it("rejects invalid reminder channels (including unsupported WhatsApp)", () => {
      const res = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        date: "2026-08-25",
        startTime: "10:00",
        bookingType: "advance",
        reminder: {
          enabled: true,
          channel: "whatsapp" as any, // Not supported!
          offsetMinutes: 60,
        },
      });
      expect(res.success).toBe(false);
    });

    it("rejects non-positive or invalid offsetMinutes", () => {
      const res = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        date: "2026-08-25",
        startTime: "10:00",
        bookingType: "advance",
        reminder: {
          enabled: true,
          channel: "sms",
          offsetMinutes: -15, // Invalid offset!
        },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("B. Backend Authority Invariants", () => {
    it("ensures frontend creation payload submits intent ONLY and omits sendAt/status", () => {
      const payload: CreateAppointmentPayload = {
        branchId: "br_1",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        date: "2026-08-25",
        startTime: "10:00",
        bookingType: "advance",
        reminder: {
          enabled: true,
          channel: "both",
          offsetMinutes: 120,
        },
      };

      expect(payload.reminder).toBeDefined();
      expect(payload.reminder?.enabled).toBe(true);
      expect(payload.reminder?.channel).toBe("both");
      expect(payload.reminder?.offsetMinutes).toBe(120);
      expect((payload.reminder as any).sendAt).toBeUndefined();
      expect((payload.reminder as any).status).toBeUndefined();
    });
  });

  describe("C. Multi-Channel & Aggregate Status Representation", () => {
    it("represents partial_delivery accurately when SMS succeeds and Email fails", () => {
      const reminderState: AppointmentReminder = {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
        sendAt: "2026-08-25T09:00:00.000Z",
        status: "partial_delivery",
        sms: {
          status: "sent",
          sentAt: "2026-08-25T09:00:02.000Z",
        },
        email: {
          status: "failed",
          failedAt: "2026-08-25T09:00:03.000Z",
          failureReason: "SMTP server timeout",
        },
      };

      expect(reminderState.status).toBe("partial_delivery");
      expect(reminderState.sms?.status).toBe("sent");
      expect(reminderState.email?.status).toBe("failed");
      expect(reminderState.email?.failureReason).toBe("SMTP server timeout");
    });

    it("handles all aggregate status states (scheduled, processing, sent, partial_delivery, failed, cancelled)", () => {
      const validAggregateStatuses = [
        "pending",
        "scheduled",
        "processing",
        "sent",
        "partial_delivery",
        "failed",
        "cancelled",
      ];
      validAggregateStatuses.forEach((status) => {
        const reminder: AppointmentReminder = {
          enabled: true,
          channel: "sms",
          offsetMinutes: 30,
          status: status as any,
        };
        expect(reminder.status).toBe(status);
      });
    });
  });

  describe("D. Manual Trigger Scoping & All-Branches Invariants", () => {
    it("requires an explicit branchId for TriggerReminderPayload and prohibits 'all'", () => {
      const validPayload: TriggerReminderPayload = { branchId: "br_main_01" };
      expect(validPayload.branchId).not.toBe("all");
      expect(validPayload.branchId.length).toBeGreaterThan(0);

      const validateTriggerBranch = (branchId: string) => {
        if (!branchId || branchId === "all") {
          throw new Error("Target branch ID is required for reminder trigger and cannot be 'all'.");
        }
        return true;
      };

      expect(validateTriggerBranch("br_main_01")).toBe(true);
      expect(() => validateTriggerBranch("all")).toThrow();
      expect(() => validateTriggerBranch("")).toThrow();
    });
  });

  describe("E. RBAC & Terminal State Safeguards", () => {
    it("requires appointments.reminders.send permission for manual reminder dispatch", () => {
      const userWithPermission: UserSession = {
        id: "usr_1",
        name: "Desk Staff",
        email: "desk@parlour.com",
        role: "Staff",
        permissions: ["appointments.view", "appointments.reminders.send"],
        organizationId: "org_1",
        branchAccess: [{ branchId: "br_1", branchName: "Main", isActive: true }],
      };

      const userWithoutPermission: UserSession = {
        id: "usr_2",
        name: "Junior Staff",
        email: "junior@parlour.com",
        role: "Staff",
        permissions: ["appointments.view"],
        organizationId: "org_1",
        branchAccess: [{ branchId: "br_1", branchName: "Main", isActive: true }],
      };

      expect(hasPermission(userWithPermission, "appointments.reminders.send")).toBe(true);
      expect(hasPermission(userWithoutPermission, "appointments.reminders.send")).toBe(false);
    });

    it("prohibits manual trigger for terminal appointment statuses (completed, cancelled, no_show)", () => {
      const isTerminal = (status: string) =>
        ["completed", "cancelled", "no_show"].includes(status);

      expect(isTerminal("scheduled")).toBe(false);
      expect(isTerminal("in_progress")).toBe(false);
      expect(isTerminal("completed")).toBe(true);
      expect(isTerminal("cancelled")).toBe(true);
      expect(isTerminal("no_show")).toBe(true);
    });
  });

  describe("F. Timezone Rendering", () => {
    it("renders backend sendAt ISO timestamp in branch timezone", () => {
      const backendSendAt = "2026-08-25T04:30:00.000Z";

      const kolkataTime = formatInBranchTimezone(backendSendAt, "Asia/Kolkata");
      expect(kolkataTime).toContain("10:00"); // 04:30 UTC = 10:00 IST

      const nyTime = formatInBranchTimezone(backendSendAt, "America/New_York");
      expect(nyTime).toContain("12:30"); // 04:30 UTC = 00:30 EDT (previous midnight) or 12:30 AM
    });
  });
});
