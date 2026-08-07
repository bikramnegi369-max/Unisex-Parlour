import { useQuery } from "@tanstack/react-query";
import { getRoles } from "../api/users.api";
import type { UserRole } from "../types/users.types";

const STATIC_ROLES: UserRole[] = [
  { id: "Owner", name: "Owner", description: "Root organization owner" },
  { id: "Manager", name: "Manager", description: "Branch manager" },
  { id: "Receptionist", name: "Receptionist", description: "Front desk staff" },
  { id: "Stylist", name: "Stylist", description: "Salon stylist" },
  { id: "Accountant", name: "Accountant", description: "Finance staff" },
];

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      try {
        return await getRoles();
      } catch {
        return STATIC_ROLES;
      }
    },
    staleTime: 30 * 60 * 1000,
  });
}
