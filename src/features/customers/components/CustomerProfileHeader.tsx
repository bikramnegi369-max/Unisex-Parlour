"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Building, Phone, Mail } from "lucide-react";

interface CustomerProfileHeaderProps {
  customer: Customer;
  homeBranchName: string;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

export function CustomerProfileHeader({
  customer,
  homeBranchName,
  canEdit,
  canDelete,
  onBack,
  onEdit,
  onDeactivate,
}: CustomerProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header with back trigger and primary actions */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Edit size={14} />
              Edit Profile
            </Button>
          )}
          {canDelete && customer.isActive && (
            <Button
              variant="destructive"
              onClick={onDeactivate}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Header Profile Identity summary block */}
      <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
              <Badge variant={customer.isActive ? "success" : "muted"}>
                {customer.isActive ? "Active" : "Deactivated"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building size={12} />
              Home branch: <span className="font-medium text-foreground">{homeBranchName}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Phone size={14} className="mr-2" />
              Call
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Mail size={14} className="mr-2" />
              Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
