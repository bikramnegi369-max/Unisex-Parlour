// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateAppointmentDialog } from "../components/CreateAppointmentDialog";
import type { Service } from "@/features/services/types/service.types";
import type { Customer } from "@/features/customers/types/customer.types";

const mockServicesMale: Service[] = [
  {
    id: "srv_beard",
    name: "Beard Trim",
    gender: "male",
    duration: 20,
    basePrice: 300,
    pricing: { basePrice: 300 },
    categoryId: "cat_hair",
    displayOrder: 1,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
  {
    id: "srv_unisex_haircut",
    name: "Classic Haircut",
    gender: "unisex",
    duration: 30,
    basePrice: 500,
    pricing: { basePrice: 500 },
    categoryId: "cat_hair",
    displayOrder: 2,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
];

const mockServicesFemale: Service[] = [
  {
    id: "srv_bridal",
    name: "Bridal Makeup",
    gender: "female",
    duration: 60,
    basePrice: 2000,
    pricing: { basePrice: 2000 },
    categoryId: "cat_makeup",
    displayOrder: 1,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
  {
    id: "srv_unisex_haircut",
    name: "Classic Haircut",
    gender: "unisex",
    duration: 30,
    basePrice: 500,
    pricing: { basePrice: 500 },
    categoryId: "cat_hair",
    displayOrder: 2,
    isActive: true,
    branchId: "br_1",
    organizationId: "org_1",
  },
];

const mockServicesAll: Service[] = [
  ...mockServicesMale,
  mockServicesFemale[0], // srv_bridal
];

let lastFilterPassedToUseServices: Record<string, unknown> | undefined;
let servicesToReturn: Service[] = mockServicesAll;
let isServicesLoading = false;
let isServicesFetching = false;
let isServicesSuccess = true;
let isServicesError = false;

vi.mock("@/features/services/hooks/services/useServices", () => ({
  useServices: (filters: Record<string, unknown>) => {
    lastFilterPassedToUseServices = filters;
    return {
      data: { data: servicesToReturn },
      isLoading: isServicesLoading,
      isFetching: isServicesFetching,
      isSuccess: isServicesSuccess,
      isError: isServicesError,
    };
  },
}));

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useMultipleStaffServices: () => ({
    staffServicesMap: {},
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
        { id: "cat_makeup", name: "Makeup", isActive: true },
      ],
    },
    isLoading: false,
  }),
}));

let currentTestCustomer: Customer | undefined;

vi.mock("@/features/customers/components/CustomerSelector", () => ({
  CustomerSelector: ({ onChange }: { value: string; onChange: (id: string, cust?: Customer) => void }) => {
    return (
      <div data-testid="customer-selector-mock">
        <button
          type="button"
          data-testid="select-customer-btn"
          onClick={() => {
            if (currentTestCustomer) {
              onChange(currentTestCustomer.id, currentTestCustomer);
            }
          }}
        >
          Select Customer
        </button>
      </div>
    );
  },
}));

describe("CreateAppointmentDialog - Gender Discovery & Incompatible Selection Management", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    servicesToReturn = mockServicesAll;
    isServicesLoading = false;
    isServicesFetching = false;
    lastFilterPassedToUseServices = undefined;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  function renderDialog(props = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateAppointmentDialog
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          isLoading={false}
          {...props}
        />
      </QueryClientProvider>
    );
  }

  it("omits customerGender filter when no customer is selected", () => {
    renderDialog();

    expect(lastFilterPassedToUseServices).toBeDefined();
    expect(lastFilterPassedToUseServices?.limit).toBe("all");
    expect(lastFilterPassedToUseServices?.customerGender).toBeUndefined();
    expect(lastFilterPassedToUseServices?.gender).toBeUndefined();
  });

  it("passes customerGender=male when male customer is selected", () => {
    renderDialog();

    currentTestCustomer = {
      id: "cust_male_1",
      name: "Rohan Sharma",
      phone: "+919876543210",
      gender: "male",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: "",
      updatedAt: "",
    };

    fireEvent.click(screen.getByTestId("select-customer-btn"));

    expect(lastFilterPassedToUseServices?.customerGender).toBe("male");
    expect(lastFilterPassedToUseServices?.gender).toBeUndefined();
  });

  it("passes customerGender=female when female customer is selected", () => {
    renderDialog();

    currentTestCustomer = {
      id: "cust_female_1",
      name: "Pooja Verma",
      phone: "+919876543211",
      gender: "female",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: "",
      updatedAt: "",
    };

    fireEvent.click(screen.getByTestId("select-customer-btn"));

    expect(lastFilterPassedToUseServices?.customerGender).toBe("female");
    expect(lastFilterPassedToUseServices?.gender).toBeUndefined();
  });

  it("passes customerGender=other or prefer_not_to_say correctly", () => {
    renderDialog();

    currentTestCustomer = {
      id: "cust_other_1",
      name: "Alex",
      phone: "+919876543212",
      gender: "other",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: "",
      updatedAt: "",
    };

    fireEvent.click(screen.getByTestId("select-customer-btn"));

    expect(lastFilterPassedToUseServices?.customerGender).toBe("other");
  });

  it("displays warning banner when customer changes and a selected service becomes incompatible", async () => {
    const { rerender } = renderDialog();

    // 1. Initially return all services and select "Bridal Makeup" (female-only service)
    const femaleCategoryToggle = screen.getByLabelText(/Toggle category Makeup/i);
    fireEvent.click(femaleCategoryToggle);

    const bridalCard = screen.getByText("Bridal Makeup");
    fireEvent.click(bridalCard);

    // Selected counter should reflect 1 service selected
    expect(screen.getByText("1 service")).toBeDefined();

    // 2. Select male customer: backend response switches to male + unisex services only
    servicesToReturn = mockServicesMale; // bridal is no longer in this list!

    currentTestCustomer = {
      id: "cust_male_1",
      name: "Rohan Sharma",
      phone: "+919876543210",
      gender: "male",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: "",
      updatedAt: "",
    };

    fireEvent.click(screen.getByTestId("select-customer-btn"));

    rerender(
      <QueryClientProvider client={queryClient}>
        <CreateAppointmentDialog
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          isLoading={false}
        />
      </QueryClientProvider>
    );

    // Incompatible services banner should be visible
    const banner = await screen.findByTestId("incompatible-services-banner");
    expect(banner).toBeDefined();
    expect(screen.getByText(/Incompatible Services Detected/i)).toBeDefined();

    // The Book Appointment submit button should be disabled
    const submitBtn = screen.getByRole("button", { name: /Book Appointment/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    // 3. User clicks "Remove Incompatible"
    const removeBtn = screen.getByRole("button", { name: /Remove Incompatible/i });
    fireEvent.click(removeBtn);

    // Banner disappears and incompatible selection is removed safely
    expect(screen.queryByTestId("incompatible-services-banner")).toBeNull();
  });

  it("does not flag services as incompatible while query is fetching or loading", () => {
    isServicesFetching = true;
    renderDialog();

    // No banner while fetching
    expect(screen.queryByTestId("incompatible-services-banner")).toBeNull();
  });

  it("does not flag services as incompatible when query encounters an error", () => {
    isServicesError = true;
    isServicesSuccess = false;
    renderDialog();

    // Query error must not falsely establish incompatibility
    expect(screen.queryByTestId("incompatible-services-banner")).toBeNull();
  });

  it("fetches the full catalogue using limit='all' and renders all eligible services without pagination truncation", () => {
    // 222 services simulation (all unisex or female)
    const largeCatalog: Service[] = Array.from({ length: 222 }, (_, idx) => ({
      id: `srv_${idx + 1}`,
      name: `Service ${idx + 1}`,
      gender: idx % 2 === 0 ? ("unisex" as const) : ("female" as const),
      duration: 30,
      basePrice: 500,
      pricing: { basePrice: 500 },
      categoryId: idx < 100 ? "cat_hair" : "cat_makeup",
      displayOrder: idx + 1,
      isActive: true,
      branchId: "br_1",
      organizationId: "org_1",
    }));

    servicesToReturn = largeCatalog;

    renderDialog();

    // Verify limit: "all" was requested
    expect(lastFilterPassedToUseServices?.limit).toBe("all");
    expect(lastFilterPassedToUseServices?.customerGender).toBeUndefined();

    // Verify All Services button displays all 222 services
    expect(screen.getByRole("button", { name: /All Services \(222\)/i })).toBeDefined();

    // Verify category pills display correct subcounts (100 hair, 122 makeup)
    expect(screen.getByRole("button", { name: /Hair \(100\)/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Makeup \(122\)/i })).toBeDefined();

    // Select a female customer: all 222 services remain eligible
    currentTestCustomer = {
      id: "cust_female_1",
      name: "Pooja Verma",
      phone: "+919876543211",
      gender: "female",
      organizationId: "org_1",
      homeBranchId: "br_1",
      visitedBranchIds: ["br_1"],
      loyaltyPoints: 0,
      status: "active",
      createdAt: "",
      updatedAt: "",
    };

    fireEvent.click(screen.getByTestId("select-customer-btn"));

    // Verify customerGender=female sent without gender parameter
    expect(lastFilterPassedToUseServices?.customerGender).toBe("female");
    expect(lastFilterPassedToUseServices?.gender).toBeUndefined();
    expect(lastFilterPassedToUseServices?.limit).toBe("all");

    // Clicking a category pill auto-expands its accordion so user can directly see services
    const hairPill = screen.getByRole("button", { name: /Hair \(100\)/i });
    fireEvent.click(hairPill);

    // Hair category accordion is expanded, showing its service items
    expect(screen.getByText("Service 1")).toBeDefined();
  });
});

