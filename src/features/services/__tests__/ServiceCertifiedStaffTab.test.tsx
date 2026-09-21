// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServiceCertifiedStaffTab } from "../components/services/ServiceCertifiedStaffTab";
import type { Employee } from "@/features/employees/types/employee.types";

const mockEmployees: Employee[] = [
  {
    id: "emp_1",
    name: "Aarav Stylist",
    email: "aarav@salon.com",
    phone: "+919876543210",
    designation: "Senior Stylist",
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
    id: "emp_2",
    name: "Diya Colorist",
    email: "diya@salon.com",
    phone: "+919876543211",
    designation: "Hair Colorist",
    status: "active",
    staffCode: "STF-0002",
    organizationId: "org_1",
    branchId: "br_1",
    isDeleted: false,
    joiningDate: "2026-01-01",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

let mockStaffServicesMap: Record<string, string[]> = {};
let mockIsLoadingEmployees = false;
let mockIsLoadingStaffServices = false;

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: { data: mockEmployees },
    isLoading: mockIsLoadingEmployees,
  }),
  useMultipleStaffServices: () => ({
    staffServicesMap: mockStaffServicesMap,
    isLoading: mockIsLoadingStaffServices,
  }),
}));

vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: () => ({
    branches: [{ id: "br_1", name: "Main Branch", isActive: true }],
    isLoading: false,
  }),
}));

describe("ServiceCertifiedStaffTab", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockStaffServicesMap = {};
    mockIsLoadingEmployees = false;
    mockIsLoadingStaffServices = false;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (serviceId = "srv_haircut") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ServiceCertifiedStaffTab serviceId={serviceId} />
      </QueryClientProvider>
    );
  };

  it("renders empty state when no staff are certified for this service", () => {
    mockStaffServicesMap = {
      emp_1: ["srv_other"],
      emp_2: ["srv_other_2"],
    };

    renderComponent("srv_haircut");

    expect(screen.getByText("No Certified Staff Linked")).toBeDefined();
    expect(
      screen.getByText(
        /No staff members are currently certified to perform this treatment/i
      )
    ).toBeDefined();
  });

  it("renders qualified staff members when service matches their assignments", () => {
    mockStaffServicesMap = {
      emp_1: ["srv_haircut", "srv_shave"],
      emp_2: ["srv_facial"],
    };

    renderComponent("srv_haircut");

    // emp_1 should be rendered
    expect(screen.getByText("Aarav Stylist")).toBeDefined();
    expect(screen.getByText("Senior Stylist")).toBeDefined();
    expect(screen.getByText("STF-0001")).toBeDefined();
    expect(screen.getByText("+919876543210")).toBeDefined();

    // emp_2 should not be rendered
    expect(screen.queryByText("Diya Colorist")).toBeNull();
  });

  it("filters certified staff by search input", () => {
    mockStaffServicesMap = {
      emp_1: ["srv_haircut"],
      emp_2: ["srv_haircut"],
    };

    renderComponent("srv_haircut");

    expect(screen.getByText("Aarav Stylist")).toBeDefined();
    expect(screen.getByText("Diya Colorist")).toBeDefined();

    // Search for "Diya"
    const searchInput = screen.getByPlaceholderText("Search certified staff...");
    fireEvent.change(searchInput, { target: { value: "Diya" } });

    expect(screen.queryByText("Aarav Stylist")).toBeNull();
    expect(screen.getByText("Diya Colorist")).toBeDefined();
  });

  it("renders loading state when queries are fetching", () => {
    mockIsLoadingEmployees = true;

    const { container } = renderComponent("srv_haircut");
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
