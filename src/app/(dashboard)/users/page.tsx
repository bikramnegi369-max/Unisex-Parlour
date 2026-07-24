"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Receptionist" | "Stylist" | "Accountant";
  status: "Active" | "Inactive";
}

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  role: z.enum(["Owner", "Manager", "Receptionist", "Stylist", "Accountant"]),
  status: z.enum(["Active", "Inactive"]),
});

type UserFormValues = z.infer<typeof userSchema>;

const INITIAL_USERS: User[] = [
  { id: "1", name: "John Doe", email: "owner@parlour.com", role: "Owner", status: "Active" },
  { id: "2", name: "Sarah Smith", email: "manager@parlour.com", role: "Manager", status: "Active" },
  { id: "3", name: "David Miller", email: "stylist1@parlour.com", role: "Stylist", status: "Active" },
  { id: "4", name: "Emma Watson", email: "reception@parlour.com", role: "Receptionist", status: "Inactive" },
  { id: "5", name: "Alex Jones", email: "finance@parlour.com", role: "Accountant", status: "Active" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Stylist",
      status: "Active",
    },
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    reset({
      name: "",
      email: "",
      role: "Stylist",
      status: "Active",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setValue("name", user.name);
    setValue("email", user.email);
    setValue("role", user.role);
    setValue("status", user.status);
    setIsModalOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      // Edit mode
      setUsers(
        users.map((u) =>
          u.id === editingUser.id ? { ...u, ...data } : u
        )
      );
    } else {
      // Add mode
      const newUser: User = {
        id: Math.random().toString(),
        ...data,
      };
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } : u
      )
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system users, credentials, roles, and status.
          </p>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 rounded-lg cursor-pointer font-semibold text-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Staff Member
        </Button>
      </div>

      {/* Directory Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">All Staff Members</CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <Input
              type="text"
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/80 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:underline text-xs font-semibold transition-all"
                    >
                      {user.status === "Active" ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle size={14} />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                          <XCircle size={14} />
                          Inactive
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenEditModal(user)}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Edit User"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No staff members match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit Staff Details" : "Register New Staff Member"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Jane Doe"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </label>
            <Input
              type="email"
              placeholder="jane@parlour.com"
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role
              </label>
              <Select {...register("role")}>
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Stylist">Stylist</option>
                <option value="Accountant">Accountant</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <Select {...register("status")}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/95 cursor-pointer">
              {editingUser ? "Save Changes" : "Register User"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
