// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateAppointmentDialog } from "../components/CreateAppointmentDialog";
import { AssignStaffDialog } from "../components/AssignStaffDialog";
import type { Employee } from "@/features/employees/types/employee.types";
import type { Service } from "@/features/services/types/service.types";
import type { Appointment } from "../types/appointment.types";

const mockEmployees: Employee[] = [
  {
    id: "emp_hair_only",
    name: "John Haircut Specialist",
    email: "john@salon.com",
    phone: "+919876543210",
    designation: "Stylist",
    status: "active",
    staffCode: "STF-0001",
    organizationId: "org_1",
    branchId: "br_1",
    isDeleted: false,
    joiningDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "emp_all_services",
    name: "Maria All Rounder",
    email: "maria@salon.com",
    phone: "+919876543211",
    designation: "Senior Stylist",
    status: "active",
    staffCode: "STF-0002",
    organizationId: "org_1",
    branchId: "br_1",
    isDeleted: false,
    joiningDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "emp_facial_only",
    name: "Sara Facial Specialist",
    email: "sara@salon.com",
    phone: "+919876543212",
    designation: "Beautician",
    status: "active",
    staffCode: "STF-0003",
    organizationId: "org_1",
    branchId: "br_1",
    isDeleted: false,
    joiningDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockServices: Service[] = [
  {
    id: "srv_haircut",
    name: "Classic Haircut",
    duration: 30,
    basePrice: 500,
    pricing: { basePrice: 500 },
    categoryId: "cat_hair",
    displayOrder: 1,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
  {
    id: "srv_facial",
    name: "Gold Facial",
    duration: 60,
    basePrice: 1200,
    pricing: { basePrice: 1200 },
    categoryId: "cat_skin",
    displayOrder: 2,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
];

const mockStaffServicesMap: Record<string, string[]> = {
  emp_hair_only: ["srv_haircut"],
  emp_all_services: ["srv_haircut", "srv_facial"],
  emp_facial_only: ["srv_facial"],
};

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: { data: mockEmployees },
    isLoading: false,
  }),
  useMultipleStaffServices: () => ({
    staffServicesMap: mockStaffServicesMap,
    isLoading: false,
  }),
}));

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: () => ({
    data: { data: mockServices },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "br_1",
    currentBranch: { id: "br_1", name: "Main Branch", timezone: "Asia/Kolkata" },
    availableBranches: [{ id: "br_1", name: "Main Branch", isActive: true }],
    isAllBranchesSelected: false,
    getBranchQueryKey: (key: string, extra?: unknown[]) => [key, "br_1", ...(extra || [])],
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/appointments",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "u_1",
      role: "admin",
      permissions: ["appointments.create", "services.view", "categories.view", "customers.view"],
    },
    isAuthenticated: true,
  }),
}));

vi.mock("@/features/services/hooks/categories/useServiceCategories", () => ({
  useServiceCategories: () => ({
    data: {
      data: [
        { id: "cat_hair", name: "Hair", isActive: true },
        { id: "cat_skin", name: "Skin", isActive: true },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/features/customers/components/CustomerSelector", () => ({
  CustomerSelector: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <div data-testid="customer-selector">
      <button type="button" onClick={() => onChange("cust_123")}>
        Select Customer
      </button>
      <span>Selected: {value}</span>
    </div>
  ),
}));

let queryClient: QueryClient;

beforeEach(() => {
  cleanup();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Staff Filtering by Service Capabilities", () => {
  it("shows all staff when no services are selected in CreateAppointmentDialog", () => {
    renderWithClient(
      <CreateAppointmentDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText("John Haircut Specialist (Stylist)")).toBeDefined();
    expect(screen.getByText("Maria All Rounder (Senior Stylist)")).toBeDefined();
    expect(screen.getByText("Sara Facial Specialist (Beautician)")).toBeDefined();
  });

  it("filters staff to only those offering selected service (Classic Haircut)", () => {
    renderWithClient(
      <CreateAppointmentDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    // Open the "Hair" category accordion (all categories start collapsed by default)
    const hairCategoryBtn = screen.getByRole("button", {
      name: "Toggle category Hair",
    });
    fireEvent.click(hairCategoryBtn);

    // Select Classic Haircut
    const haircutCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(haircutCheckbox);

    // John and Maria offer haircut, Sara does not
    expect(screen.queryByText("John Haircut Specialist (Stylist)")).not.toBeNull();
    expect(screen.queryByText("Maria All Rounder (Senior Stylist)")).not.toBeNull();
    expect(screen.queryByText("Sara Facial Specialist (Beautician)")).toBeNull();
  });

  it("filters staff to only those offering ALL selected services (Haircut + Facial)", () => {
    renderWithClient(
      <CreateAppointmentDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    // Open "Hair" and "Skin" categories
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle category Hair" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle category Skin" }),
    );

    // Select Classic Haircut and Gold Facial
    const haircutItem = screen.getByRole("checkbox", { name: /Classic Haircut/i });
    const facialItem = screen.getByRole("checkbox", { name: /Gold Facial/i });
    fireEvent.click(haircutItem);
    fireEvent.click(facialItem);

    // Only Maria offers BOTH haircut and facial
    expect(screen.queryByText("Maria All Rounder (Senior Stylist)")).not.toBeNull();
    expect(screen.queryByText("John Haircut Specialist (Stylist)")).toBeNull();
    expect(screen.queryByText("Sara Facial Specialist (Beautician)")).toBeNull();
  });

  it("filters staff in AssignStaffDialog based on appointment services", () => {
    const appointmentWithBothServices: Appointment = {
      id: "appt_test_1",
      organizationId: "org_1",
      branchId: "br_1",
      customerId: "cust_1",
      serviceIds: ["srv_haircut", "srv_facial"],
      services: [
        { serviceId: "srv_haircut", name: "Classic Haircut", duration: 30, price: 500 },
        { serviceId: "srv_facial", name: "Gold Facial", duration: 60, price: 1200 },
      ],
      staffId: null,
      bookingType: "advance",
      status: "scheduled",
      date: "2026-09-19",
      startTime: "11:00",
      createdAt: "2026-09-19T10:00:00Z",
      updatedAt: "2026-09-19T10:00:00Z",
    };

    renderWithClient(
      <AssignStaffDialog
        appointment={appointmentWithBothServices}
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    // Only Maria offers BOTH services
    expect(screen.queryByText("Maria All Rounder (Senior Stylist)")).not.toBeNull();
    expect(screen.queryByText("John Haircut Specialist (Stylist)")).toBeNull();
    expect(screen.queryByText("Sara Facial Specialist (Beautician)")).toBeNull();
  });
});
