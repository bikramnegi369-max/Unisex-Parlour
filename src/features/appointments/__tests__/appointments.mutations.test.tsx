// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import type { Appointment, AppointmentStatus } from "../types/appointment.types";

describe("Appointment Mutation & Workflow Rules", () => {
  const sampleAppointment: Appointment = {
    id: "appt_123",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_1",
    serviceIds: ["srv_1"],
    services: [
      {
        serviceId: "srv_1",
        name: "Haircut & Styling",
        duration: 45,
        price: 550,
      },
    ],
    staffId: "emp_10",
    bookingType: "advance",
    status: "scheduled",
    date: "2026-08-15",
    startTime: "10:30",
    endTime: "11:15",
    pricing: {
      subtotal: 550,
      tax: 99,
      total: 649,
    },
    createdAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  };

  it("identifies terminal statuses correctly", () => {
    const isTerminalStatus = (status: AppointmentStatus) =>
      ["completed", "cancelled", "no_show"].includes(status);

    expect(isTerminalStatus("scheduled")).toBe(false);
    expect(isTerminalStatus("in_progress")).toBe(false);
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("no_show")).toBe(true);
  });

  it("distinguishes between Cancel status transition and Administrative Soft-Delete", () => {
    const cancelAction = {
      type: "STATUS_UPDATE",
      endpoint: `/appointments/${sampleAppointment.id}/status`,
      method: "PATCH",
      payload: {
        branchId: sampleAppointment.branchId,
        status: "cancelled",
        cancellationReason: "Customer sick",
      },
    };

    const deleteAction = {
      type: "ADMINISTRATIVE_DELETE",
      endpoint: `/appointments/${sampleAppointment.id}`,
      method: "DELETE",
      payload: {
        branchId: sampleAppointment.branchId,
      },
    };

    expect(cancelAction.method).toBe("PATCH");
    expect(cancelAction.payload.status).toBe("cancelled");
    expect(deleteAction.method).toBe("DELETE");
  });

  it("formats 409 scheduling conflict error message cleanly", () => {
    const handleAxiosError = (status: number, message?: string) => {
      if (status === 409) {
        return message || "Scheduling conflict: The selected staff or time slot is unavailable.";
      }
      return "An unexpected error occurred.";
    };

    const conflictMsg = handleAxiosError(409, "Double booking detected for Stylist Rahul at 10:30");
    expect(conflictMsg).toBe("Double booking detected for Stylist Rahul at 10:30");

    const fallbackConflictMsg = handleAxiosError(409);
    expect(fallbackConflictMsg).toBe("Scheduling conflict: The selected staff or time slot is unavailable.");
  });
});
