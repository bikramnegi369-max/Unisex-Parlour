// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServiceAppointmentsTab } from "../components/services/ServiceAppointmentsTab";
import type { Appointment } from "@/features/appointments/types/appointment.types";

const mockAppointments: Appointment[] = [
  {
    id: "appt_1",
    appointmentCode: "APT-1001",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_1",
    customer: {
      id: "cust_1",
      name: "Rahul Sharma",
      phone: "+919876543210",
    },
    staffId: "emp_1",
    staff: {
      id: "emp_1",
      name: "Aarav Stylist",
    },
    serviceIds: ["srv_haircut"],
    services: [
      {
        serviceId: "srv_haircut",
        name: "Classic Haircut",
        duration: 30,
        price: 500,
      },
    ],
    bookingType: "advance",
    status: "completed",
    date: "2026-03-20",
    startTime: "10:00",
    endTime: "10:30",
    createdAt: "2026-03-20T09:00:00Z",
    updatedAt: "2026-03-20T10:30:00Z",
  },
  {
    id: "appt_2",
    appointmentCode: "APT-1002",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_2",
    customer: {
      id: "cust_2",
      name: "Priya Singh",
      phone: "+919876543211",
    },
    staffId: "emp_2",
    staff: {
      id: "emp_2",
      name: "Diya Colorist",
    },
    serviceIds: ["srv_haircut", "srv_spa"],
    services: [
      {
        serviceId: "srv_haircut",
        name: "Classic Haircut",
        duration: 30,
        price: 500,
      },
      {
        serviceId: "srv_spa",
        name: "Hair Spa",
        duration: 45,
        price: 1200,
      },
    ],
    bookingType: "walk_in",
    status: "scheduled",
    date: "2026-03-21",
    startTime: "11:00",
    endTime: "12:15",
    createdAt: "2026-03-21T09:00:00Z",
    updatedAt: "2026-03-21T09:00:00Z",
  },
  {
    id: "appt_3",
    appointmentCode: "APT-1003",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_3",
    customer: {
      id: "cust_3",
      name: "Ananya Gupta",
      phone: "+919876543212",
    },
    staffId: "emp_1",
    staff: {
      id: "emp_1",
      name: "Aarav Stylist",
    },
    serviceIds: ["srv_facial"],
    services: [
      {
        serviceId: "srv_facial",
        name: "Gold Facial",
        duration: 60,
        price: 1500,
      },
    ],
    bookingType: "advance",
    status: "scheduled",
    date: "2026-03-22",
    startTime: "14:00",
    endTime: "15:00",
    createdAt: "2026-03-22T09:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
  },
];

let mockIsLoading = false;
let customMockResponse: { data: typeof mockAppointments; meta?: any } | null = null;

vi.mock("@/features/appointments/hooks/useAppointments", () => ({
  useAppointments: (params?: { serviceId?: string; search?: string; status?: string }) => {
    if (customMockResponse) {
      return {
        data: customMockResponse,
        isLoading: mockIsLoading,
      };
    }

    let filtered = mockAppointments;
    if (params?.serviceId) {
      filtered = filtered.filter((appt) =>
        appt.services.some((s) => s.serviceId === params.serviceId)
      );
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (appt) =>
          (appt.customer?.name || "").toLowerCase().includes(q) ||
          (appt.appointmentCode || "").toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== "all") {
      filtered = filtered.filter((appt) => appt.status === params.status);
    }

    return {
      data: {
        data: filtered,
        meta: {
          total: filtered.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
      isLoading: mockIsLoading,
    };
  },
  useRescheduleAppointment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAssignAppointmentStaff: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateAppointmentStatus: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteAppointment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAppointment: () => ({
    data: null,
    isLoading: false,
  }),
  useTriggerAppointmentReminder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "usr_admin",
      permissions: [
        "appointments.view",
        "appointments.edit",
        "appointments.update_status",
        "appointments.delete",
      ],
    },
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "br_1",
    currentBranch: { id: "br_1", name: "Main Branch", timezone: "Asia/Kolkata" },
    isAllBranchesSelected: false,
    getBranchQueryKey: (_key: string, extra?: unknown[]) => ["mock-branch", _key, ...(extra || [])],
  }),
}));

describe("ServiceAppointmentsTab", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockIsLoading = false;
    customMockResponse = null;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = (serviceId = "srv_haircut", serviceName = "Classic Haircut") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ServiceAppointmentsTab serviceId={serviceId} serviceName={serviceName} />
      </QueryClientProvider>
    );
  };

  it("renders only appointments associated with the given serviceId", () => {
    renderComponent("srv_haircut");

    // Classic Haircut is in appt_1 and appt_2, NOT appt_3
    expect(screen.getAllByText("APT-1001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("APT-1002").length).toBeGreaterThan(0);
    expect(screen.queryByText("APT-1003")).toBeNull();

    expect(screen.getAllByText("Rahul Sharma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Priya Singh").length).toBeGreaterThan(0);
    expect(screen.queryByText("Ananya Gupta")).toBeNull();
  });

  it("calculates statistics correctly for the service", () => {
    renderComponent("srv_haircut");

    // Total bookings: 2 (appt_1 and appt_2)
    expect(screen.getByText("Total Bookings")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();

    // Completed: 1 (appt_1) and Upcoming: 1 (appt_2)
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    // Upcoming stat title
    expect(screen.getByText("Upcoming")).toBeDefined();

    // Revenue: from appt_1 (price: 500)
    expect(screen.getByText("Service Revenue")).toBeDefined();
    expect(screen.getAllByText(/₹\s*500/).length).toBeGreaterThan(0);
  });

  it("filters appointments when typing in search query", () => {
    vi.useFakeTimers();
    renderComponent("srv_haircut");

    const searchInput = screen.getByPlaceholderText("Search by customer, staff, or ID...");
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Rahul" } });
      vi.advanceTimersByTime(300);
    });

    expect(screen.getAllByText("APT-1001").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("APT-1002").length).toBe(0);
    vi.useRealTimers();
  });

  it("supports pagination controls and page size options", () => {
    renderComponent("srv_haircut");

    // Pagination info should be rendered
    expect(screen.getByText(/total appointments/i)).toBeDefined();
    expect(screen.getByText("Show:")).toBeDefined();
    expect(screen.getByText("per page")).toBeDefined();
  });

  it("handles multi-page backend meta response accurately", () => {
    customMockResponse = {
      data: mockAppointments,
      meta: {
        total: 30,
        page: 6,
        limit: 5,
        totalPages: 6,
      },
    };

    renderComponent("srv_haircut");

    expect(screen.getByText(/Showing page/i)).toBeDefined();
    expect(screen.getByText(/30 total appointments/i)).toBeDefined();
  });

  it("shows empty state when no appointments exist for the service", () => {
    renderComponent("srv_nonexistent", "Pedicure");

    expect(screen.getByText("No Bookings Found")).toBeDefined();
    expect(
      screen.getByText("No appointments have been booked for Pedicure yet.")
    ).toBeDefined();
  });
});
