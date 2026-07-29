"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

interface CustomerPreferencesProps {
  preferences?: Customer["preferences"];
}

export function CustomerPreferences({ preferences }: CustomerPreferencesProps) {
  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Heart size={18} className="text-primary" />
          Service & Salon Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Preferred Staff
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {preferences?.preferredStaff && preferences.preferredStaff.length > 0 ? (
                preferences.preferredStaff.map((staff, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/10"
                  >
                    {staff}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic mt-0.5">Not specified</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Drink Preference
            </p>
            <p className="text-sm font-medium mt-1.5">{preferences?.drinkPreference || "Not specified"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Preferred Services
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {preferences?.preferredServices && preferences.preferredServices.length > 0 ? (
                preferences.preferredServices.map((service, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/10"
                  >
                    {service}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic mt-0.5">None specified</p>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
              Remarks / Notes
            </p>
            <p className="text-sm text-foreground bg-muted/25 p-3 rounded-lg border border-border/50 mt-1.5 leading-relaxed">
              {preferences?.remarks || "No preferences remarks recorded."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
