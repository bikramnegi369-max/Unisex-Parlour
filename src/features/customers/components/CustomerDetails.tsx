"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, MapPin, Calendar, Heart, FileText, Edit, Trash2, ArrowLeft } from "lucide-react";

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CustomerDetails({
  customer,
  onBack,
  onEdit,
  onDelete,
}: CustomerDetailsProps) {
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");

  // Map home branch ID to branch name
  const homeBranchName =
    availableBranches.find((b) => b.id === customer.homeBranchId)?.name ||
    customer.homeBranchId;

  // Map visited branch IDs to branch names
  const visitedBranchNames = customer.visitedBranchIds
    .map((id) => availableBranches.find((b) => b.id === id)?.name || id)
    .join(", ");

  const formatDOB = (dob?: string) => {
    if (!dob) return "Not provided";
    try {
      const date = new Date(dob);
      return isNaN(date.getTime()) ? dob : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dob;
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail Action Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft size={16} />
          Back to Directory
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={onEdit} className="flex items-center gap-1.5 cursor-pointer">
              <Edit size={14} />
              Edit Profile
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={onDelete} className="flex items-center gap-1.5 cursor-pointer">
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Info Card */}
        <Card className="md:col-span-2 border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User size={18} className="text-primary" />
              Identity Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{customer.name}</h2>
                <p className="text-xs text-muted-foreground">Registered Customer</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Phone Number</p>
                  <p className="text-sm font-medium mt-1">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Email Address</p>
                  <p className="text-sm font-medium mt-1">{customer.email || "Not provided"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Heart size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Gender</p>
                  <p className="text-sm font-medium mt-1">{customer.gender || "Not provided"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Date of Birth</p>
                  <p className="text-sm font-medium mt-1">{formatDOB(customer.dateOfBirth)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 border-t border-border/50">
              <MapPin size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Physical Address</p>
                <p className="text-sm font-medium mt-1">{customer.address || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch Context Info Card */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                Branch Scoping
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Home Registration Branch</p>
                <p className="text-sm font-semibold mt-1 text-primary">{homeBranchName}</p>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">Visited Branches</p>
                <p className="text-sm font-medium mt-1">{visitedBranchNames || "No visits registered"}</p>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  Staff Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/60 whitespace-pre-wrap leading-relaxed">
                  {customer.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
