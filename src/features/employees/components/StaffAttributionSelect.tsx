"use client";

import { useEmployees } from "../hooks/useEmployeeQueries";

interface StaffAttributionSelectProps {
  branchId?: string | null;
  label: string;
  value?: string | null;
  onChange: (staffId: string | null) => void;
  disabled?: boolean;
}

export function StaffAttributionSelect({
  branchId,
  label,
  value,
  onChange,
  disabled = false,
}: StaffAttributionSelectProps) {
  const hasSpecificBranch = Boolean(branchId && branchId !== "all");
  const { data, isLoading, isError } = useEmployees(
    {
      branchId: hasSpecificBranch ? branchId! : undefined,
      status: "active",
      limit: 100,
    },
    { enabled: hasSpecificBranch },
  );
  const employees = data?.data || [];

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <select
        aria-label={label}
        value={value || ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled || !hasSpecificBranch || isLoading || isError}
        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      >
        <option value="">
          {isLoading
            ? "Loading branch staff..."
            : isError
              ? "Staff list unavailable"
              : employees.length
                ? "No attribution selected"
                : "No active staff assigned to this branch"}
        </option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name} ({employee.staffCode})
          </option>
        ))}
      </select>
      <span className="text-[10px] text-muted-foreground">
        Optional while this earning category is disabled; never defaults to the cashier.
      </span>
    </label>
  );
}
