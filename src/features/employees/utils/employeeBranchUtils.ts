import type { Employee } from "../types/employee.types";

/**
 * Extracts and resolves unique branch names assigned to an employee.
 * Checks:
 * 1. employee.branches (array of populated branch objects or string IDs)
 * 2. employee.staffBranches (array of staff-branch relations)
 * 3. employee.branchId (single populated branch or string ID)
 *
 * @param employee - Employee data object
 * @param getBranchName - Optional resolver function from BranchContext
 * @returns Array of unique resolved branch names
 */
export function getEmployeeBranchNames(
  employee: Employee,
  getBranchName?: (id: string) => string
): string[] {
  const branchNames: string[] = [];

  // 1. Check employee.branches array
  if (Array.isArray(employee.branches) && employee.branches.length > 0) {
    employee.branches.forEach((b) => {
      if (typeof b === "string") {
        const resolved = getBranchName ? getBranchName(b) : b;
        if (resolved) branchNames.push(resolved);
      } else if (b && typeof b === "object") {
        if (b.name) {
          branchNames.push(b.name);
        } else {
          const id = b.id || b._id;
          if (id) {
            const resolved = getBranchName ? getBranchName(id) : id;
            if (resolved) branchNames.push(resolved);
          }
        }
      }
    });
  }

  // 2. Check employee.staffBranches array
  if (
    branchNames.length === 0 &&
    Array.isArray(employee.staffBranches) &&
    employee.staffBranches.length > 0
  ) {
    employee.staffBranches.forEach((sb) => {
      if (sb.branchId?.name) {
        branchNames.push(sb.branchId.name);
      } else if (sb.branchId?._id) {
        const resolved = getBranchName ? getBranchName(sb.branchId._id) : sb.branchId._id;
        if (resolved) branchNames.push(resolved);
      }
    });
  }

  // 3. Check employee.branchId (single branch association)
  if (branchNames.length === 0 && employee.branchId) {
    if (typeof employee.branchId === "string") {
      const resolved = getBranchName ? getBranchName(employee.branchId) : employee.branchId;
      if (resolved) branchNames.push(resolved);
    } else if (typeof employee.branchId === "object") {
      if (employee.branchId.name) {
        branchNames.push(employee.branchId.name);
      } else {
        const id = employee.branchId.id || employee.branchId._id;
        if (id) {
          const resolved = getBranchName ? getBranchName(id) : id;
          if (resolved) branchNames.push(resolved);
        }
      }
    }
  }

  return Array.from(new Set(branchNames.filter(Boolean)));
}