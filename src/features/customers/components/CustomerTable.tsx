"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, ShieldAlert } from "lucide-react";

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  isLoading: boolean;
  isAllBranches: boolean;
}

export default function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
  isLoading,
  isAllBranches,
}: CustomerTableProps) {
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");

  const getHomeBranchName = (id: string) => {
    console.log("home branch Id :",id);
    return availableBranches.find((b) => b.id === id)?.name || id;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-card border border-border/60 rounded-xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return null; // Empty state will be handled at list container page
  }

  return (
    <div className="w-full">
      {/* Desktop Table View (visible on md+) */}
      <div className="hidden md:block overflow-x-auto border border-border/80 rounded-xl bg-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Email</th>
              {isAllBranches && <th className="px-6 py-4">Home Branch</th>}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{customer.name}</p>
                      {customer.gender && (
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{customer.gender}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{customer.phone}</td>
                <td className="px-6 py-4 text-muted-foreground">{customer.email || "—"}</td>
                {isAllBranches && (
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10">
                      {getHomeBranchName(customer.homeBranchId)}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onView(customer)}
                      className="cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={14} className="text-muted-foreground hover:text-foreground" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(customer)}
                        className="cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit size={14} className="text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(customer)}
                        className="cursor-pointer hover:bg-destructive/10"
                        title="Deactivate Customer"
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card list View (visible on <md) */}
      <div className="md:hidden space-y-3">
        {customers.map((customer) => (
          <div key={customer.id} className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{customer.name}</h4>
                  {customer.gender && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                      {customer.gender}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => onView(customer)}>
                  <Eye size={13} />
                </Button>
                {canEdit && (
                  <Button variant="outline" size="icon-sm" onClick={() => onEdit(customer)}>
                    <Edit size={13} />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" size="icon-sm" className="bg-destructive/10 text-destructive border-transparent" onClick={() => onDelete(customer)}>
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </div>

            <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="font-semibold text-foreground">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium text-foreground">{customer.email}</span>
                </div>
              )}
              {isAllBranches && (
                <div className="flex justify-between items-center">
                  <span>Home Branch:</span>
                  <span className="text-[10px] font-semibold text-primary">{getHomeBranchName(customer.homeBranchId)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
