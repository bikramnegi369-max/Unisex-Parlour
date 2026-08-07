import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { beforeEach } from "vitest";
import { describe, it, expect, vi } from "vitest";
import EmployeeForm from "../EmployeeForm";

vi.mock("../UserSelector", () => ({
  default: ({ onSelect }: { onSelect: (user: { id: string }) => void }) => (
    <button type="button" onClick={() => onSelect({ id: "selected-user-id" })}>
      Select User
    </button>
  ),
}));

vi.mock("@/features/users/hooks/useUser", () => ({
  useUser: () => ({ data: null }),
}));

describe("EmployeeForm", () => {
  beforeEach(() => {
    cleanup();
  });
  it("submits userId when a linked user is selected", async () => {
    const onSubmit = vi.fn();

    render(
      <EmployeeForm
        onSubmit={onSubmit}
        isSubmitting={false}
        onCancel={() => undefined}
        submitLabel="Create Employee"
      />
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Rahul Sharma" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "rahul@salon.com" } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+919876543210" } });
    fireEvent.change(screen.getByLabelText(/designation/i), { target: { value: "Stylist" } });
    fireEvent.change(screen.getByLabelText(/joining date/i), { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: /select user/i }));
    fireEvent.click(screen.getByRole("button", { name: /create employee/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ userId: "selected-user-id" }));
  });

  it("correctly pre-fills form fields when editing an existing employee with ISO joiningDate", () => {
    const rawEmployee = {
      id: "6a75678df2fbed690715c5de",
      _id: "6a75678df2fbed690715c5de",
      name: "rahul roy",
      phone: "1234567888",
      email: "rahul@gmail.com",
      organizationId: "6a674eeb35f4849a26cab307",
      userId: null,
      designation: "makeup artist",
      status: "active" as const,
      staffCode: "STF-0002",
      avatarUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuklZV6D139hSPlER2uk5Sw65E3dgxsDC8NNOAhxxHbw&s",
      joiningDate: "2002-02-06T00:00:00.000Z",
      createdAt: "2026-08-07T05:05:17.257Z",
      updatedAt: "2026-08-07T10:45:59.240Z",
      isDeleted: false,
    };

    render(
      <EmployeeForm
        initialEmployee={rawEmployee}
        onSubmit={vi.fn()}
        isSubmitting={false}
        onCancel={vi.fn()}
        submitLabel="Update Employee"
      />
    );

    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    const designationInput = screen.getByLabelText(/Designation/i) as HTMLInputElement;
    const joiningDateInput = screen.getByLabelText(/Joining Date/i) as HTMLInputElement;

    expect(nameInput.value).toBe("rahul roy");
    expect(emailInput.value).toBe("rahul@gmail.com");
    expect(phoneInput.value).toBe("1234567888");
    expect(designationInput.value).toBe("makeup artist");
    expect(joiningDateInput.value).toBe("2002-02-06");
  });
});

