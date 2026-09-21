import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AppointmentCalendarView } from "../components/AppointmentCalendarView";
import type { Appointment } from "../types/appointment.types";

afterEach(() => {
  cleanup();
});

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: {
      data: [
        { id: "emp_1", name: "Alice Barber", designation: "Hair Stylist" },
        { id: "emp_2", name: "Bob Barber", designation: "Colorist" },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranch: { id: "br_1", name: "Main Salon", timezone: "Asia/Kolkata" },
    availableBranches: [{ id: "br_1", name: "Main Salon", isActive: true }],
    isAllBranchesSelected: false,
  }),
}));

const mockAppt1: Appointment = {
  id: "appt_1",
  appointmentCode: "APP-001001",
  organizationId: "org_1",
  branchId: "br_1",
  customerId: "cust_1",
  customer: { id: "cust_1", name: "John Doe", phone: "9876543210" },
  serviceIds: ["srv_1"],
  services: [{ serviceId: "srv_1", name: "Haircut", duration: 45, price: 50 }],
  staffId: "emp_1",
  staff: { id: "emp_1", name: "Alice Barber" },
  bookingType: "advance",
  status: "scheduled",
  date: "2026-08-10",
  startTime: "10:00",
  endTime: "10:45",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-01T10:00:00Z",
};

const mockAppt2: Appointment = {
  id: "appt_2",
  appointmentCode: "APP-001002",
  organizationId: "org_1",
  branchId: "br_1",
  customerId: "cust_2",
  customer: { id: "cust_2", name: "Jane Smith", phone: "9876543211" },
  serviceIds: ["srv_2"],
  services: [{ serviceId: "srv_2", name: "Beard Trim", duration: 30, price: 30 }],
  staffId: "emp_2",
  staff: { id: "emp_2", name: "Bob Barber" },
  bookingType: "walk_in",
  status: "in_progress",
  date: "2026-08-10",
  startTime: "11:00",
  endTime: "11:30",
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-01T10:00:00Z",
};

describe("AppointmentCalendarView - Grabbable, Draggable & Filter Synchronization", () => {
  it("renders calendar with grabbable scroll container and correct staff lanes", () => {
    render(
      <AppointmentCalendarView
        appointments={[mockAppt1, mockAppt2]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Should have scroll container with cursor-grab class
    const scrollContainer = screen.getByTestId("calendar-timetable-scroll");
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.className).toContain("cursor-grab");

    // Both appointments should be rendered
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);
  });

  it("filters calendar appointments when staffFilter prop is provided", () => {
    const { rerender } = render(
      <AppointmentCalendarView
        appointments={[mockAppt1, mockAppt2]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
        staffFilter="all"
      />
    );

    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);

    // Now filter to only Alice Barber (emp_1)
    rerender(
      <AppointmentCalendarView
        appointments={[mockAppt1, mockAppt2]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
        staffFilter="emp_1"
      />
    );

    // Only John Doe should be visible in Alice's lane
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.queryByText("Jane Smith")).toBeNull();
  });

  it("makes appointment cards draggable when canEdit is true, and non-draggable when false", () => {
    const { rerender } = render(
      <AppointmentCalendarView
        appointments={[mockAppt1]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
        canEdit={true}
      />
    );

    const card = screen.getByLabelText(/Appointment for John Doe/i);
    expect(card.getAttribute("draggable")).toBe("true");
    expect(card.className).toContain("cursor-grab");

    // When canEdit is false
    rerender(
      <AppointmentCalendarView
        appointments={[mockAppt1]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
        canEdit={false}
      />
    );

    const cardNoEdit = screen.getByLabelText(/Appointment for John Doe/i);
    expect(cardNoEdit.getAttribute("draggable")).toBe("false");
  });

  it("invokes onDropAppointment when an appointment card is dropped into a lane", async () => {
    const onDropMock = vi.fn();

    render(
      <AppointmentCalendarView
        appointments={[mockAppt1]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
        canEdit={true}
        onDropAppointment={onDropMock}
      />
    );

    const card = screen.getByLabelText(/Appointment for John Doe/i);

    // Mock dataTransfer
    const setDataMock = vi.fn();
    const dataStore: Record<string, string> = {};
    const mockDataTransfer = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: (format: string, data: string) => {
        dataStore[format] = data;
        setDataMock(format, data);
      },
      getData: (format: string) => dataStore[format] || "",
    };

    fireEvent.dragStart(card, { dataTransfer: mockDataTransfer });
    expect(card).toBeDefined();

    // Find the Alice Barber lane slots body directly via testid
    const laneBody = screen.getByTestId("lane-body-emp_1");
    expect(laneBody).not.toBeNull();

    // Mock getBoundingClientRect on HTMLElement.prototype so e.currentTarget.getBoundingClientRect() works in jsdom
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute("data-testid") === "lane-body-emp_1") {
        return {
          top: 100,
          left: 200,
          bottom: 1540,
          right: 470,
          width: 270,
          height: 1440,
          x: 200,
          y: 100,
          toJSON: () => {},
        };
      }
      return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} };
    });

    // Create and dispatch drag event with clientY defined
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      clientY: 340,
      dataTransfer: mockDataTransfer,
    });
    laneBody.dispatchEvent(dropEvent);

    expect(onDropMock).toHaveBeenCalledWith("appt_1", "2026-08-10", "10:00", "emp_1");
    rectSpy.mockRestore();
  });

  it("handles mouse pan drag on the timetable background across both X and Y axes without throwing", () => {
    const { container } = render(
      <AppointmentCalendarView
        appointments={[mockAppt1]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    const scrollContainer = container.querySelector("[data-testid='calendar-timetable-scroll']");
    expect(scrollContainer).not.toBeNull();

    if (scrollContainer) {
      // Mouse down on background with both X and Y
      fireEvent.mouseDown(scrollContainer, { clientX: 300, clientY: 250, button: 0 });
      expect(scrollContainer.className).toContain("cursor-grabbing");

      // Mouse move to pan horizontally and vertically
      fireEvent.mouseMove(scrollContainer, { clientX: 200, clientY: 150 });

      // Mouse up to stop panning
      fireEvent.mouseUp(scrollContainer);
      expect(scrollContainer.className).toContain("cursor-grab");
    }
  });

  it("renders sticky headers for time column and staff lanes to preserve column identity during vertical scrolling", () => {
    const { container } = render(
      <AppointmentCalendarView
        appointments={[mockAppt1]}
        isLoading={false}
        selectedDate={new Date("2026-08-10T00:00:00")}
        viewMode="day"
        onViewModeChange={vi.fn()}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Time corner header should be sticky top-0 z-40
    const timeHeader = screen.getByText("Time");
    expect(timeHeader.className).toContain("sticky");
    expect(timeHeader.className).toContain("top-0");
    expect(timeHeader.className).toContain("z-40");

    // Staff lane headers should be sticky top-0 z-20
    const laneBodies = container.querySelectorAll("[data-testid^='lane-']");
    expect(laneBodies.length).toBeGreaterThan(0);

    const firstLaneHeader = laneBodies[0].querySelector("div");
    expect(firstLaneHeader?.className).toContain("sticky");
    expect(firstLaneHeader?.className).toContain("top-0");
    expect(firstLaneHeader?.className).toContain("z-20");
  });
});
