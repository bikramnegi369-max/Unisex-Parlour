"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, Heart, Calendar, Sparkles, MapPin, Building } from "lucide-react";

interface CustomerOverviewProps {
  customer: Customer;
  visitedBranchNames: string;
}

export function CustomerOverview({ customer, visitedBranchNames }: CustomerOverviewProps) {
  const formatDOB = (dob?: string) => {
    if (!dob) return "Not provided";
    try {
      const date = new Date(dob);
      return isNaN(date.getTime())
        ? dob
        : date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
    } catch {
      return dob;
    }
  };

  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User size={18} className="text-primary" />
          Identity & Contact Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Phone Number
              </p>
              <p className="text-sm font-medium mt-1.5">{customer.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Email Address
              </p>
              <p className="text-sm font-medium mt-1.5">{customer.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Heart size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Gender
              </p>
              <p className="text-sm font-medium mt-1.5">{customer.gender || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Date of Birth
              </p>
              <p className="text-sm font-medium mt-1.5">{formatDOB(customer.dateOfBirth)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Loyalty Points
              </p>
              <p className="text-sm font-medium mt-1.5">{customer.loyaltyPoints ?? 0} Points</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-6 border-t border-border/50">
          <MapPin size={16} className="text-muted-foreground mt-0.5" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Physical Address
            </p>
            <p className="text-sm font-medium mt-1.5">{customer.address || "—"}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-6 border-t border-border/50">
          <Building size={16} className="text-muted-foreground mt-0.5" />
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Visited Branches
            </p>
            <p className="text-sm font-medium mt-1.5">
              {visitedBranchNames || "No visits registered under other branches"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
