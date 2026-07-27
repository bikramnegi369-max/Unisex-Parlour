"use client";

import React, { useState } from "react";
import { ShieldCheck, Info, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoleName = "Owner" | "Manager" | "Receptionist" | "Stylist" | "Accountant";

interface ModulePermission {
  module: string;
  actions: {
    view: string;
    create?: string;
    edit?: string;
    delete?: string;
  };
}

const MODULES: ModulePermission[] = [
  { module: "Customers", actions: { view: "customers.view", create: "customers.create", edit: "customers.edit", delete: "customers.delete" } },
  { module: "Appointments", actions: { view: "appointments.view", create: "appointments.create", edit: "appointments.edit", delete: "appointments.cancel" } },
  { module: "Employees", actions: { view: "employees.view", create: "employees.create", edit: "employees.edit", delete: "employees.delete" } },
  { module: "Services", actions: { view: "services.view", create: "services.create", edit: "services.edit", delete: "services.delete" } },
  { module: "Billing & POS", actions: { view: "billing.view", create: "billing.create", delete: "billing.refund" } },
  { module: "Finance", actions: { view: "finance.view", create: "finance.create", edit: "finance.edit" } },
  { module: "Inventory", actions: { view: "inventory.view", create: "inventory.create", edit: "inventory.adjust" } },
  { module: "Reports & Analytics", actions: { view: "reports.view" } },
  { module: "Settings & Backups", actions: { view: "settings.view", edit: "settings.edit" } },
];

const INITIAL_ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  Owner: [], // Bypasses permission matrix, owns all implicitly
  Manager: [
    "customers.view", "customers.create", "customers.edit",
    "appointments.view", "appointments.create", "appointments.edit", "appointments.cancel",
    "employees.view", "services.view", "billing.view", "billing.create"
  ],
  Receptionist: [
    "customers.view", "customers.create", "customers.edit",
    "appointments.view", "appointments.create", "appointments.edit", "appointments.cancel",
    "billing.view", "billing.create"
  ],
  Stylist: [
    "customers.view", "appointments.view", "services.view"
  ],
  Accountant: [
    "billing.view", "finance.view", "finance.create", "finance.edit", "reports.view"
  ],
};

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<RoleName>("Manager");
  const [rolePermissions, setRolePermissions] = useState<Record<RoleName, string[]>>(INITIAL_ROLE_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activePermissions = rolePermissions[selectedRole] || [];

  const handleTogglePermission = (permission: string) => {
    if (selectedRole === "Owner") return; // Owner permissions cannot be changed

    const exists = activePermissions.includes(permission);
    const updated = exists
      ? activePermissions.filter((p) => p !== permission)
      : [...activePermissions, permission];

    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: updated,
    });
  };

  const handleSavePermissions = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure security authorization bounds and actions for company staff roles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Role Selector Tabs */}
        <div className="lg:col-span-3 space-y-2">
          {Object.keys(rolePermissions).map((roleStr) => {
            const role = roleStr as RoleName;
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setSaveSuccess(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-between border",
                  isSelected
                    ? "bg-primary/5 text-primary border-primary/20 shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{role}</span>
                {role === "Owner" && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                    Bypass
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side: Matrix Configurations */}
        <div className="lg:col-span-9 space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  {selectedRole} Authorization Matrix
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedRole === "Owner"
                    ? "Owners are assigned all canonical permissions explicitly by the backend."
                    : `Customize action flags for the ${selectedRole} profile below.`}
                </CardDescription>
              </div>
              <Button
                disabled={selectedRole === "Owner" || isSaving}
                onClick={handleSavePermissions}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 rounded-lg cursor-pointer font-semibold text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Permissions
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {saveSuccess && (
                <div className="m-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-500 text-xs font-semibold animate-in fade-in duration-200">
                  Permissions configuration for {selectedRole} saved successfully.
                </div>
              )}

              {selectedRole === "Owner" ? (
                <div className="p-8 text-center space-y-2">
                  <Info size={28} className="text-amber-500 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Root Ownership Enabled</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    The Owner profile is assigned all root-level permissions explicitly. Modifying these flags on the frontend is disabled since Owner access is managed directly by the backend registry.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border/85 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-6 py-4">Module Panel</th>
                      <th className="px-6 py-4 text-center">View</th>
                      <th className="px-6 py-4 text-center">Create</th>
                      <th className="px-6 py-4 text-center">Edit</th>
                      <th className="px-6 py-4 text-center">Delete / Revoke</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {MODULES.map((item) => (
                      <tr key={item.module} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{item.module}</td>
                        
                        {/* View action check */}
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={activePermissions.includes(item.actions.view)}
                            onChange={() => handleTogglePermission(item.actions.view)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>

                        {/* Create action check */}
                        <td className="px-6 py-4 text-center">
                          {item.actions.create ? (
                            <input
                              type="checkbox"
                              checked={activePermissions.includes(item.actions.create)}
                              onChange={() => handleTogglePermission(item.actions.create!)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground/45">—</span>
                          )}
                        </td>

                        {/* Edit action check */}
                        <td className="px-6 py-4 text-center">
                          {item.actions.edit ? (
                            <input
                              type="checkbox"
                              checked={activePermissions.includes(item.actions.edit)}
                              onChange={() => handleTogglePermission(item.actions.edit!)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground/45">—</span>
                          )}
                        </td>

                        {/* Delete action check */}
                        <td className="px-6 py-4 text-center">
                          {item.actions.delete ? (
                            <input
                              type="checkbox"
                              checked={activePermissions.includes(item.actions.delete)}
                              onChange={() => handleTogglePermission(item.actions.delete!)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground/45">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
