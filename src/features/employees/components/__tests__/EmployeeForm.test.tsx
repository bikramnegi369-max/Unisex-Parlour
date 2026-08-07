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
});
