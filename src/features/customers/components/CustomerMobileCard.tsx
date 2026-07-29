"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2 } from "lucide-react";

interface CustomerMobileCardProps {
  customer: Customer;
  canEdit: boolean;
  canDelete: boolean;
  isAllBranches: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  getHomeBranchName: (id: string) => string;
}

export function CustomerMobileCard({
  customer,
  canEdit,
  canDelete,
  isAllBranches,
  onView,
  onEdit,
  onDelete,
  getHomeBranchName,
}: CustomerMobileCardProps) {
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">{customer.name}</h4>
              <Badge variant={customer.isActive ? "success" : "muted"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {customer.gender && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                {customer.gender}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Actions with touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 flex items-center justify-center cursor-pointer"
            onClick={() => onView(customer)}
            aria-label={`View details of ${customer.name}`}
          >
            <Eye size={15} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={() => onEdit(customer)}
              aria-label={`Edit profile of ${customer.name}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && customer.isActive && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={() => onDelete(customer)}
              aria-label={`Deactivate profile of ${customer.name}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Phone:</span>
          <a href={`tel:${customer.phone}`} className="font-semibold text-foreground hover:underline">
            {customer.phone}
          </a>
        </div>
        {customer.email && (
          <div className="flex justify-between">
            <span>Email:</span>
            <a href={`mailto:${customer.email}`} className="font-medium text-foreground hover:underline">
              {customer.email}
            </a>
          </div>
        )}
        {customer.loyaltyPoints !== undefined && (
          <div className="flex justify-between">
            <span>Loyalty Points:</span>
            <span className="font-semibold text-foreground">{customer.loyaltyPoints} pts</span>
          </div>
        )}
        {isAllBranches && (
          <div className="flex justify-between items-center">
            <span>Home Branch:</span>
            <span className="text-[10px] font-semibold text-primary">
              {getHomeBranchName(customer.homeBranchId)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
