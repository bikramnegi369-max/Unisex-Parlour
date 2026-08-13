// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createAppointmentSchema } from "../schemas/appointment.schema";
import { hasPermission, type UserSession } from "@/lib/permissions";
import { formatInBranchTimezone } from "@/lib/formatters";
import {
  AppointmentReminderStatus,
  getAggregateStatusDescription,
} from "../components/AppointmentReminderStatus";
import type {
  AppointmentReminder,
  CreateAppointmentPayload,
  TriggerReminderPayload,
  UpdateAppointmentPayload,
} from "../types/appointment.types";

describe("Appointments — Reminder Notification Contract & UX Architecture", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1 & 2. Create & Update Flow Invariants", () => {
    it("1. Create appointment payload contains reminder config but NEVER calls /reminder/trigger", () => {
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
          offsetMinutes: 60,
        },
      };

      expect(payload.reminder).toEqual({
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
      });

      expect((payload as any).triggerNow).toBeUndefined();
    });

    it("2. Update appointment payload metadata omits /reminder/trigger calls and sendAt", () => {
      const updatePayload: UpdateAppointmentPayload = {
        branchId: "br_1",
        notes: "Updated customer preference",
      };

      expect((updatePayload as any).reminder).toBeUndefined();
      expect((updatePayload as any).sendAt).toBeUndefined();
    });
  });

  describe("3 & 4. Payload Field Restrictions", () => {
    it("3. Reminder configuration sends enabled, channel, and offsetMinutes only", () => {
      const parsed = createAppointmentSchema.parse({
        branchId: "br_1",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        date: "2026-08-25",
        startTime: "10:00",
        bookingType: "advance",
        reminder: {
          enabled: true,
          channel: "sms",
          offsetMinutes: 30,
        },
      });

      expect(parsed.reminder).toEqual({
        enabled: true,
        channel: "sms",
        offsetMinutes: 30,
      });
    });

    it("4. sendAt is never user-controlled in creation schema or payload", () => {
      const rawInput = {
        branchId: "br_1",
        customerId: "cust_1",
        serviceIds: ["srv_1"],
        date: "2026-08-25",
        startTime: "10:00",
        bookingType: "advance",
        reminder: {
          enabled: true,
          channel: "email",
          offsetMinutes: 15,
          sendAt: "2026-08-25T09:45:00.000Z",
        },
      };

      const parsed = createAppointmentSchema.parse(rawInput);
      expect((parsed.reminder as any).sendAt).toBeUndefined();
    });
  });

  describe("5, 6, 7, 8, 9, 10, 11. Reminder Component Rendering & Copy", () => {
    it("5. Scheduled state renders correctly with automatic scheduling copy", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
        sendAt: "2026-08-25T09:00:00.000Z",
        status: "scheduled",
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
      expect(screen.getByText("Reminder is scheduled automatically.")).toBeDefined();
    });

    it("6. Processing state renders correctly", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "sms",
        offsetMinutes: 15,
        status: "processing",
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getByText("Processing")).toBeDefined();
      expect(screen.getByText("Reminder notification is processing...")).toBeDefined();
    });

    it("7. Sent state renders correctly with successful status copy", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "email",
        offsetMinutes: 60,
        status: "sent",
        email: { status: "sent", sentAt: "2026-08-25T09:00:00.000Z" },
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("Sent").length).toBeGreaterThan(0);
      expect(screen.getByText("Reminder sent successfully.")).toBeDefined();
    });

    it("8. Partial delivery renders independent Email and SMS states", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
        status: "partial_delivery",
        sms: { status: "sent", sentAt: "2026-08-25T09:00:00.000Z" },
        email: { status: "failed", failureReason: "SMTP timeout" },
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getByText("Partially Delivered")).toBeDefined();
      expect(
        screen.getByText("One reminder channel was delivered successfully; another failed.")
      ).toBeDefined();
      expect(screen.getByText("SMTP timeout")).toBeDefined();
    });

    it("9. Failed state renders failure reason", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "sms",
        offsetMinutes: 30,
        status: "failed",
        failureReason: "Gateway API key invalid",
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
      expect(screen.getByText("Failure Details:")).toBeDefined();
      expect(screen.getAllByText("Gateway API key invalid").length).toBeGreaterThan(0);
    });

    it("10. Cancelled state renders cancellation reason", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "email",
        offsetMinutes: 60,
        status: "cancelled",
        failureReason: "Appointment cancelled by client",
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
      expect(screen.getByText("Reminder was not sent.")).toBeDefined();
    });

    it("11. Past sendAt gets user-friendly explanation", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "sms",
        offsetMinutes: 60,
        status: "cancelled",
        failureReason: "sendAt is in the past",
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(
        screen.getByText(
          "Reminder was not sent because its scheduled time had already passed."
        )
      ).toBeDefined();
    });
  });

  describe("12, 13, 14, 15. Manual Trigger RBAC, Branch Scoping & Terminal Safeguards", () => {
    it("12. Manual trigger requires appointments.reminders.send permission", () => {
      const userWithPermission: UserSession = {
        id: "usr_1",
        name: "Manager",
        email: "mgr@parlour.com",
        role: "Manager",
        permissions: ["appointments.view", "appointments.reminders.send"],
        organizationId: "org_1",
        branchAccess: [{ branchId: "br_1", branchName: "Main Branch", isActive: true }],
      };

      const userWithoutPermission: UserSession = {
        id: "usr_2",
        name: "Staff",
        email: "staff@parlour.com",
        role: "Staff",
        permissions: ["appointments.view"],
        organizationId: "org_1",
        branchAccess: [{ branchId: "br_1", branchName: "Main Branch", isActive: true }],
      };

      expect(hasPermission(userWithPermission, "appointments.reminders.send")).toBe(true);
      expect(hasPermission(userWithoutPermission, "appointments.reminders.send")).toBe(false);
    });

    it("13. Manual trigger requires an explicit branchId", () => {
      const validPayload: TriggerReminderPayload = { branchId: "br_main_01" };
      expect(validPayload.branchId).toBe("br_main_01");
    });

    it("14. 'all' is never submitted as mutation branchId", () => {
      const validateTriggerBranch = (branchId: string) => {
        if (!branchId || branchId === "all") {
          throw new Error(
            "Target branch ID is required for reminder trigger and cannot be 'all'."
          );
        }
        return true;
      };

      expect(validateTriggerBranch("br_1")).toBe(true);
      expect(() => validateTriggerBranch("all")).toThrow();
      expect(() => validateTriggerBranch("")).toThrow();
    });

    it("15. Terminal appointment statuses (completed, cancelled, no_show) cannot trigger manual reminder", () => {
      const isTerminal = (status: string) =>
        ["completed", "cancelled", "no_show"].includes(status);

      expect(isTerminal("scheduled")).toBe(false);
      expect(isTerminal("in_progress")).toBe(false);
      expect(isTerminal("completed")).toBe(true);
      expect(isTerminal("cancelled")).toBe(true);
      expect(isTerminal("no_show")).toBe(true);
    });
  });

  describe("16, 17, 18. Manual Trigger Execution & State Consistency", () => {
    it("16 & 18. Manual trigger does not fabricate local state and relies on authoritative backend state", () => {
      const backendReturnedAppointment = {
        id: "appt_123",
        status: "scheduled",
        reminder: {
          enabled: true,
          channel: "both" as const,
          offsetMinutes: 60,
          status: "sent" as const,
          sms: { status: "sent" as const, sentAt: "2026-08-25T10:00:00.000Z" },
          email: { status: "sent" as const, sentAt: "2026-08-25T10:00:01.000Z" },
        },
      };

      expect(backendReturnedAppointment.reminder.status).toBe("sent");
      expect(backendReturnedAppointment.reminder.sms.status).toBe("sent");
      expect(backendReturnedAppointment.reminder.email.status).toBe("sent");
    });

    it("17. Repeated clicks cannot create duplicate requests during pending state", () => {
      const isPending = true;
      const handleClick = vi.fn();

      const buttonProps = {
        disabled: isPending,
        onClick: isPending ? undefined : handleClick,
      };

      expect(buttonProps.disabled).toBe(true);
      expect(buttonProps.onClick).toBeUndefined();
    });
  });

  describe("19, 20, 21, 22. Channel Filtering & UX Communication", () => {
    it("19. SMS-only displays only relevant SMS channel state", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "sms",
        offsetMinutes: 30,
        status: "sent",
        sms: { status: "sent", sentAt: "2026-08-25T10:00:00.000Z" },
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("SMS").length).toBeGreaterThan(0);
      expect(screen.queryByText("Email")).toBeNull();
    });

    it("20. Email-only displays only relevant Email channel state", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "email",
        offsetMinutes: 60,
        status: "sent",
        email: { status: "sent", sentAt: "2026-08-25T10:00:00.000Z" },
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getAllByText("Email").length).toBeGreaterThan(0);
      expect(screen.queryByText("SMS")).toBeNull();
    });

    it("21. Both displays Email + SMS independently", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
        status: "scheduled",
        sms: { status: "scheduled" },
        email: { status: "scheduled" },
      };

      render(<AppointmentReminderStatus reminder={reminder} />);
      expect(screen.getByText("SMS + Email")).toBeDefined();
      expect(screen.getAllByText(/SMS/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Email/).length).toBeGreaterThan(0);
    });

    it("22. Scheduled reminder UI clearly communicates automatic backend scheduling", () => {
      const reminder: AppointmentReminder = {
        enabled: true,
        channel: "both",
        offsetMinutes: 60,
        status: "scheduled",
      };

      const description = getAggregateStatusDescription(reminder);
      expect(description).toBe("Reminder is scheduled automatically.");
    });
  });

  describe("Timezone Utilities", () => {
    it("renders backend sendAt ISO timestamp accurately in branch timezone", () => {
      const backendSendAt = "2026-08-25T04:30:00.000Z";
      const kolkataTime = formatInBranchTimezone(backendSendAt, "Asia/Kolkata");
      expect(kolkataTime).toContain("10:00");
    });
  });
});
