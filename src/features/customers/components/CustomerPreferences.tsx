"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Bell, MessageSquare } from "lucide-react";

interface CustomerPreferencesProps {
  preferences?: Customer["preferences"];
  marketingPreferences?: Customer["marketingPreferences"];
}

export function CustomerPreferences({ preferences, marketingPreferences }: CustomerPreferencesProps) {
  const marketingChannels = [
    { key: "sms", label: "SMS Texts" },
    { key: "email", label: "Email Newsletters" },
    { key: "whatsapp", label: "WhatsApp Chat" },
    { key: "promotions", label: "Promotions & Offers" },
    { key: "appointmentReminders", label: "Appointment Reminders" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Service & Salon Preferences */}
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
                Preferred Staff (ID/System Refs)
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
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
                  <p className="text-sm text-muted-foreground italic">None specified</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Preferred Services (Refs)
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
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
                  <p className="text-sm text-muted-foreground italic">None specified</p>
                )}
              </div>
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

      {/* 2. Marketing & Notifications Subscriptions */}
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
              const isSubscribed = !!(marketingPreferences as any)?.[channel.key];
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
