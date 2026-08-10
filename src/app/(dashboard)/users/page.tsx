import React from "react";
import UserList from "@/features/users/components/UserList";

export const metadata = {
  title: "Staff Directory | Unisex Parlour ERP",
  description: "Manage system users, credentials, roles, and account status.",
};

export default function UsersPage() {
  return <UserList />;
}
