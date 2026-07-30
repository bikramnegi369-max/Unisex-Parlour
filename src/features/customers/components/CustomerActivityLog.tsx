"use client";

import React from "react";
import type { Customer } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface CustomerActivityLogProps {
  activityTimeline?: Customer["activityTimeline"];
}

export function CustomerActivityLog({ activityTimeline }: CustomerActivityLogProps) {
  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          Profile Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activityTimeline && activityTimeline.length > 0 ? (
          <div className="relative border-l border-border pl-6 ml-2 space-y-6">
            {activityTimeline.map((item) => {
              const dateObj = new Date(item.date);
              const displayDate = isNaN(dateObj.getTime())
                ? item.date
                : dateObj.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
              const getActionLabel = (action: string) => {
                switch (action) {
                  case "CUSTOMER_CREATED":
                  case "CREATED":
                    return "Created";
                  case "CUSTOMER_UPDATED":
                  case "UPDATED":
                    return "Updated";
                  case "CUSTOMER_DEACTIVATED":
                  case "DEACTIVATED":
                  case "DELETED":
                    return "Deactivated";
                  case "CUSTOMER_REACTIVATED":
                  case "REACTIVATED":
                    return "Reactivated";
                  case "NOTE_ADDED":
                    return "Note Added";
                  default:
                    return action.replace(/_/g, " ");
                }
              };
              return (
                <div key={item._id} className="relative group">
                  {/* Timeline dot marker */}
                  <span className="absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-primary/20 bg-background text-primary-foreground ring-4 ring-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase bg-primary/10 text-primary border-primary/20 tracking-wide px-2 py-0.5 rounded">
                        {getActionLabel(item.action)}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
                        {displayDate}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed mt-1">
                      {item.description}
                    </p>
                    {item.performedBy && (
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        System ID: <span className="text-foreground/80">
                          {typeof item.performedBy === "object" ? item.performedBy.name : item.performedBy}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            No activity records logged for this customer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
