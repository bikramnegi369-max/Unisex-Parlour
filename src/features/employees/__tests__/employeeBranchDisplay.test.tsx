// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { getEmployeeBranchNames } from "../utils/employeeBranchUtils";
import { buildEmployeeColumns } from "../columns/employeeColumns";
import { EmployeeMobileCard } from "../components/EmployeeMobileCard";
import type { Employee } from "../types/employee.types";

afterEach(() => {
  cleanup();
});

const mockEmployeeBase: Employee = {
  id: "emp-1",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "1234567890",
  designation: "Stylist",
  joiningDate: "2026-01-01",
  status: "active",
  staffCode: "ST-001",
  organizationId: "org-1",
  isDeleted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("getEmployeeBranchNames", () => {
  it("returns empty array when employee has no branches assigned", () => {
    const names = getEmployeeBranchNames(mockEmployeeBase);
    expect(names).toEqual([]);
  });

  it("extracts branch names from populated objects in branches array", () => {
    const employee: Employee = {
      ...mockEmployeeBase,
      branches: [
        { id: "b1", name: "Downtown Salon" },
        { id: "b2", name: "Uptown Spa" },
      ],
    };
    const names = getEmployeeBranchNames(employee);
    expect(names).toEqual(["Downtown Salon", "Uptown Spa"]);
  });

  it("resolves string IDs in branches array via getBranchName", () => {
    const employee: Employee = {
      ...mockEmployeeBase,
      branches: ["b1", "b2"],
    };
    const mockGetBranchName = (id: string) =>
      id === "b1" ? "Downtown Branch" : "Uptown Branch";
    const names = getEmployeeBranchNames(employee, mockGetBranchName);
    expect(names).toEqual(["Downtown Branch", "Uptown Branch"]);
  });

  it("extracts branch names from staffBranches relationship array", () => {
    const employee: Employee = {
      ...mockEmployeeBase,
      staffBranches: [
        {
          _id: "sb1",
          staffId: "emp-1",
          organizationId: "org-1",
          isPrimary: true,
          isActive: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          branchId: {
            _id: "b1",
            name: "Westside Hub",
            isActive: true,
          },
        },
      ],
    };
    const names = getEmployeeBranchNames(employee);
    expect(names).toEqual(["Westside Hub"]);
  });

  it("extracts branch name from branchId when populated", () => {
    const employee: Employee = {
      ...mockEmployeeBase,
      branchId: { _id: "b1", name: "Central Branch" },
    };
    const names = getEmployeeBranchNames(employee);
    expect(names).toEqual(["Central Branch"]);
  });

  it("extracts and resolves branch name from string branchId", () => {
    const employee: Employee = {
      ...mockEmployeeBase,
      branchId: "b-99",
    };
    const mockGetBranchName = vi.fn().mockReturnValue("East Branch");
    const names = getEmployeeBranchNames(employee, mockGetBranchName);
    expect(names).toEqual(["East Branch"]);
    expect(mockGetBranchName).toHaveBeenCalledWith("b-99");
  });
});

describe("Employee Table Branches Column & Mobile Card rendering", () => {
  const defaultOptions = {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReactivate: vi.fn(),
    getBranchName: (id: string) => (id === "b1" ? "Downtown Hub" : id),
  };

  it("renders 'Not assigned' in table column when employee has no branches", () => {
    const columns = buildEmployeeColumns(defaultOptions);
    const branchColumn = columns.find((c) => c.id === "branches");
    expect(branchColumn).toBeDefined();

    // Call cell renderer directly
    const cellFn = branchColumn!.cell as (info: {
      row: { original: Employee };
    }) => React.ReactNode;
    const { container } = render(
      <>{cellFn({ row: { original: mockEmployeeBase } })}</>,
    );
    expect(container.textContent).toContain("Not assigned");
  });

  it("renders branch badges in table column when employee has assigned branches", () => {
    const columns = buildEmployeeColumns(defaultOptions);
    const branchColumn = columns.find((c) => c.id === "branches");
    const employeeWithBranch: Employee = {
      ...mockEmployeeBase,
      branches: [{ id: "b1", name: "Downtown Hub" }],
    };

    const cellFn = branchColumn!.cell as (info: {
      row: { original: Employee };
    }) => React.ReactNode;
    const { getByText } = render(
      <>{cellFn({ row: { original: employeeWithBranch } })}</>,
    );
    expect(getByText("Downtown Hub")).toBeTruthy();
  });

  it("renders 'Not assigned' in EmployeeMobileCard when employee has no branches", () => {
    const { getByText } = render(
      <EmployeeMobileCard
        employee={mockEmployeeBase}
        canEdit={true}
        canDelete={true}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
        getBranchName={defaultOptions.getBranchName}
      />,
    );
    expect(getByText("Not assigned")).toBeTruthy();
  });

  it("renders branch badge in EmployeeMobileCard when employee has assigned branches", () => {
    const employeeWithBranch: Employee = {
      ...mockEmployeeBase,
      branches: [{ id: "b1", name: "Downtown Hub" }],
    };
    const { getByText } = render(
      <EmployeeMobileCard
        employee={employeeWithBranch}
        canEdit={true}
        canDelete={true}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
        getBranchName={defaultOptions.getBranchName}
      />,
    );
    expect(getByText("Downtown Hub")).toBeTruthy();
  });
});
