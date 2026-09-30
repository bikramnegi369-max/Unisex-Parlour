"use client";

import React, { useEffect, useState } from "react";
import type { Customer, MarketingPreferencesObject } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Bell } from "lucide-react";
import { getEmployees } from "@/features/employees/api/employees.api";
import { getServices } from "@/features/services/api/services.api";

interface CustomerPreferencesProps {
  preferences?: Customer["preferences"];
  marketingPreferences?: Customer["marketingPreferences"];
}

export function CustomerPreferences({ preferences, marketingPreferences }: CustomerPreferencesProps) {
  const marketingChannels: { key: keyof MarketingPreferencesObject; label: string }[] = [
    { key: "sms", label: "SMS Texts" },
    { key: "email", label: "Email Newsletters" },
    { key: "whatsapp", label: "WhatsApp Chat" },
    { key: "promotions", label: "Promotions & Offers" },
    { key: "appointmentReminders", label: "Appointment Reminders" },
  ];

  const preferredStaff = preferences?.preferredStaff ?? [];
  const preferredServices = preferences?.preferredServices ?? [];
  const needsResolution = preferredStaff.length > 0 || preferredServices.length > 0;

  const [staffNameMap, setStaffNameMap] = useState<Record<string, string>>({});
  const [serviceNameMap, setServiceNameMap] = useState<Record<string, string>>({});
  // Initialise to true when there are IDs to resolve so we never need a
  // synchronous setState inside the effect body (which triggers a cascade).
  const [isResolvingNames, setIsResolvingNames] = useState(needsResolution);

  useEffect(() => {
    if (!needsResolution) return;

    let isCurrent = true;

    Promise.all([
      preferredStaff.length > 0
        ? getEmployees({ limit: 200 }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      preferredServices.length > 0
        ? getServices({ limit: 200 }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]).then(([empRes, svcRes]) => {
      if (!isCurrent) return;

      const staffSet = new Set(preferredStaff);
      const svcSet = new Set(preferredServices);

      const sMap: Record<string, string> = {};
      empRes.data.forEach((e) => {
        if (staffSet.has(e.id)) sMap[e.id] = e.name;
      });

      const svMap: Record<string, string> = {};
      svcRes.data.forEach((s) => {
        if (svcSet.has(s.id)) svMap[s.id] = s.name;
      });

      setStaffNameMap(sMap);
      setServiceNameMap(svMap);
    }).finally(() => {
      if (isCurrent) setIsResolvingNames(false);
    });

    return () => { isCurrent = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsResolution]);

  function renderPills(ids: string[], nameMap: Record<string, string>) {
    if (ids.length === 0) {
      return <p className="text-sm text-muted-foreground italic">None specified</p>;
    }
    if (isResolvingNames) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ids.map((id) => (
            <span key={id} className="inline-flex h-5 w-24 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {ids.map((id) => (
          <Badge key={id} variant="outline" className="bg-primary/5 text-primary border-primary/10">
            {nameMap[id] ?? id}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Heart size={16} className="text-primary" />
            Service & Salon Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Preferred Staff
              </p>
              {renderPills(preferredStaff, staffNameMap)}
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Preferred Services
              </p>
              {renderPills(preferredServices, serviceNameMap)}
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Drink Preference
              </p>
              <p className="text-sm font-medium mt-1.5">{preferences?.drinkPreference || "—"}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Preferred Language
              </p>
              <p className="text-sm font-medium mt-1.5">{preferences?.language || "—"}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Preferred Contact Time
              </p>
              <p className="text-sm font-medium mt-1.5">{preferences?.preferredContactTime || "—"}</p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Remarks / Profile Notes
              </p>
              <p className="text-sm text-foreground bg-muted/25 p-3 rounded-lg border border-border/50 mt-1.5 leading-relaxed">
                {preferences?.remarks || "No preference remarks recorded."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            Marketing & Communication Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {marketingChannels.map((channel) => {
              const isSubscribed = !!marketingPreferences?.[channel.key];
              return (
                <div key={channel.key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/5">
                  <div className={`h-2 w-2 rounded-full ${isSubscribed ? "bg-emerald-500" : "bg-muted"}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{channel.label}</p>
                    <Badge variant={isSubscribed ? "success" : "muted"} className="mt-1 text-[9px] py-0 px-1.5 font-semibold">
                      {isSubscribed ? "Subscribed" : "Opted Out"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
