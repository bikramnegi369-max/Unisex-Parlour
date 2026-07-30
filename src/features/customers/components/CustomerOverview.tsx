"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { formatAddress } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Mail,
  Heart,
  Calendar,
  Sparkles,
  MapPin,
  Building,
  AlertTriangle,
  Link,
  ShieldAlert,
} from "lucide-react";

interface CustomerOverviewProps {
  customer: Customer;
  visitedBranchNames: string;
}

export function CustomerOverview({ customer, visitedBranchNames }: CustomerOverviewProps) {
  const formatDOB = (dob?: string | null) => {
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Do Not Contact Critical Alert */}
      {customer.doNotContact && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-semibold">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[11px]">DO NOT CONTACT STATUS ACTIVE</p>
            <p className="text-xs font-normal text-destructive/90 mt-0.5">
              The customer has requested to opt out of outgoing communication campaigns.
            </p>
          </div>
        </div>
      )}

      {/* 2. Identity & Contact Profile */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User size={16} className="text-primary" />
            Identity & Contact Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex items-start gap-3 min-w-0">
              <Phone size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Phone Number
                </p>
                <a href={`tel:${customer.phone}`} className="text-sm font-medium mt-1.5 block hover:underline text-foreground break-words">
                  {customer.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Phone size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Alternate Phone
                </p>
                {customer.alternatePhone ? (
                  <a href={`tel:${customer.alternatePhone}`} className="text-sm font-medium mt-1.5 block hover:underline text-foreground break-words">
                    {customer.alternatePhone}
                  </a>
                ) : (
                  <p className="text-sm font-medium mt-1.5 text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Mail size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Email Address
                </p>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-sm font-medium mt-1.5 block hover:underline text-foreground break-all">
                    {customer.email}
                  </a>
                ) : (
                  <p className="text-sm font-medium mt-1.5 text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Heart size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Gender
                </p>
                <p className="text-sm font-medium mt-1.5 capitalize text-foreground break-words">
                  {customer.gender?.replace(/_/g, " ") || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Calendar size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Date of Birth
                </p>
                <p suppressHydrationWarning className="text-sm font-medium mt-1.5 text-foreground break-words">
                  {formatDOB(customer.dateOfBirth)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Loyalty Program & CRM */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            Loyalty & Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Loyalty Points
              </p>
              <p className="text-2xl font-bold text-primary mt-1">{customer.loyaltyPoints ?? 0}</p>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 py-1 px-3 text-xs font-semibold">
              Member
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Acquisition Source
              </p>
              <p className="text-sm font-medium mt-1.5 capitalize">
                {customer.acquisitionSource?.replace(/_/g, " ") || "walk_in"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Referred By ID
              </p>
              <p className="text-sm font-medium mt-1.5 truncate">
                {customer.referredByCustomerId || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Physical Address & Branches */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            Location & Branches
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Physical Address
            </p>
            <p className="text-sm font-medium mt-1.5">{formatAddress(customer.address) || "No address provided"}</p>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Visited Branches
            </p>
            <p className="text-sm font-medium mt-1.5 text-muted-foreground">
              {visitedBranchNames || "No visits registered in other branches"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Health & Sensitivities Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle size={16} className="text-destructive" />
            Health, Allergies & Sensitivities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Registered Allergies
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customer.allergies && customer.allergies.length > 0 ? (
                customer.allergies.map((allergy, idx) => (
                  <Badge key={idx} variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                    {allergy}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No registered allergies</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Sensitivities & Skin Concerns
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customer.sensitivities && customer.sensitivities.length > 0 ? (
                customer.sensitivities.map((sensitivity, idx) => (
                  <Badge key={idx} variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20">
                    {sensitivity}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No skin sensitivities recorded</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
