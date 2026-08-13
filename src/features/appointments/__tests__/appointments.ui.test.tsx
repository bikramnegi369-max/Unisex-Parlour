// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppointmentCalendarView } from "../components/AppointmentCalendarView";
import { AppointmentListView } from "../components/AppointmentListView";
import type { Appointment } from "../types/appointment.types";

// Mock dependencies
vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranch: { id: "br_1", name: "Main Salon", timezone: "Asia/Kolkata" },
    availableBranches: [{ id: "br_1", name: "Main Salon", isActive: true }],
    isAllBranchesSelected: false,
  }),
}));

const mockAppointments: Appointment[] = [
  {
    id: "appt_1",
    appointmentCode: "APP-001001",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_1",
    customer: { id: "cust_1", name: "John Doe", phone: "9876543210" },
    serviceIds: ["srv_1"],
    services: [{ serviceId: "srv_1", name: "Haircut & Styling", duration: 45, price: 50 }],
    staffId: "emp_1",
    staff: { id: "emp_1", name: "Alice Barber" },
    bookingType: "advance",
    status: "scheduled",
    date: "2026-08-10", // Monday
    startTime: "10:00",
    endTime: "10:45",
    pricing: { subtotal: 50, tax: 0, total: 50 },
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "appt_2",
    appointmentCode: "APP-001002",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_2",
    customer: { id: "cust_2", name: "Jane Smith", phone: "9876543211" },
    serviceIds: ["srv_2"],
    services: [{ serviceId: "srv_2", name: "Beard Trim", duration: 30, price: 30 }],
    staffId: "emp_1",
    staff: { id: "emp_1", name: "Alice Barber" },
    bookingType: "walk_in",
    status: "in_progress",
    date: "2026-08-12", // Wednesday
    startTime: "14:00",
    endTime: "14:30",
    pricing: { subtotal: 30, tax: 0, total: 30 },
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "appt_3",
    appointmentCode: "APP-001003",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_3",
    customer: { id: "cust_3", name: "Sam Wilson", phone: "9876543212" },
    serviceIds: ["srv_3"],
    services: [{ serviceId: "srv_3", name: "Facial Spa", duration: 60, price: 80 }],
    staffId: null,
    staff: null,
    bookingType: "advance",
    status: "completed",
    date: "2026-08-16", // Sunday
    startTime: "16:00",
    endTime: "17:00",
    pricing: { subtotal: 80, tax: 0, total: 80 },
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
];

describe("Appointments UI Components & Week Date Navigation", () => {
  it("renders AppointmentListView with safe fallbacks and customer names", () => {
    render(
      <AppointmentListView
        appointments={mockAppointments}
        isLoading={false}
        onSelectAppointment={vi.fn()}
        onReschedule={vi.fn()}
        onAssignStaff={vi.fn()}
        onChangeStatus={vi.fn()}
        onDelete={vi.fn()}
        isAllBranches={false}
        canEdit={true}
        canStatus={true}
        canDelete={true}
      />
    );

    expect(screen.getAllByText("APP-001001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Haircut & Styling").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);
  });

  it("handles week view date switching correctly (Monday -> Wednesday -> Sunday)", () => {
    const onSelectDate = vi.fn();
    const onViewModeChange = vi.fn();

    const mondayDate = new Date("2026-08-10T00:00:00"); // Monday

    const { rerender } = render(
      <AppointmentCalendarView
        appointments={mockAppointments}
        isLoading={false}
        selectedDate={mondayDate}
        viewMode="week"
        onViewModeChange={onViewModeChange}
        onSelectDate={onSelectDate}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Monday appointments should be displayed
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);

    // Click Wednesday in week header selector
    const wednesdayBtn = screen.getByText("12");
    fireEvent.click(wednesdayBtn);

    expect(onSelectDate).toHaveBeenCalled();
    const newSelectedDate = onSelectDate.mock.calls[0][0];
    expect(newSelectedDate.getDate()).toBe(12);

    // Re-render with selectedDate = Wednesday
    const wednesdayDate = new Date("2026-08-12T00:00:00");
    rerender(
      <AppointmentCalendarView
        appointments={mockAppointments}
        isLoading={false}
        selectedDate={wednesdayDate}
        viewMode="week"
        onViewModeChange={onViewModeChange}
        onSelectDate={onSelectDate}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Wednesday appointment should be displayed
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);

    // Re-render with selectedDate = Sunday
    const sundayDate = new Date("2026-08-16T00:00:00");
    rerender(
      <AppointmentCalendarView
        appointments={mockAppointments}
        isLoading={false}
        selectedDate={sundayDate}
        viewMode="week"
        onViewModeChange={onViewModeChange}
        onSelectDate={onSelectDate}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Sunday appointment should be displayed
    expect(screen.getAllByText("Sam Wilson").length).toBeGreaterThan(0);
  });

  it("handles Day <-> Week view mode transitions", () => {
    const onViewModeChange = vi.fn();
    const mondayDate = new Date("2026-08-10T00:00:00");

    render(
      <AppointmentCalendarView
        appointments={mockAppointments}
        isLoading={false}
        selectedDate={mondayDate}
        viewMode="day"
        onViewModeChange={onViewModeChange}
        onSelectDate={vi.fn()}
        onSelectAppointment={vi.fn()}
        isAllBranches={false}
      />
    );

    // Click Week mode toggle button
    const weekBtns = screen.getAllByRole("button", { name: "Week" });
    fireEvent.click(weekBtns[weekBtns.length - 1]);
    expect(onViewModeChange).toHaveBeenCalledWith("week");
  });

  it("renders malformed/partial backend data safely without crashing", () => {
    const partialAppt: Appointment = {
      id: "appt_malformed_123456",
      organizationId: "org_1",
      branchId: "br_1",
      customerId: "cust_malformed_999999",
      // customer reference missing!
      serviceIds: [],
      services: [],
      staffId: null,
      bookingType: "advance",
      status: "scheduled",
      date: "2026-08-13",
      startTime: "11:00",
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-01T10:00:00Z",
    };

    render(
      <AppointmentListView
        appointments={[partialAppt]}
        isLoading={false}
        onSelectAppointment={vi.fn()}
        onReschedule={vi.fn()}
        onAssignStaff={vi.fn()}
        onChangeStatus={vi.fn()}
        onDelete={vi.fn()}
        isAllBranches={false}
        canEdit={true}
        canStatus={true}
        canDelete={true}
      />
    );

    // Safe fallback customer display
    expect(screen.getAllByText("Customer #999999").length).toBeGreaterThan(0);
    // Safe appointment code display
    expect(screen.getAllByText("#123456").length).toBeGreaterThan(0);
  });
});
