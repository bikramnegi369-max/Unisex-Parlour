"use client";

import React, { useState } from "react";
import { useCustomerActivity } from "../hooks/useCustomerActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLog } from "../types/customer.types";

interface CustomerActivityLogProps {
  customerId: string;
}

export function CustomerActivityLog({ customerId }: CustomerActivityLogProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, refetch } = useCustomerActivity(customerId, { page, limit });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="relative border-l border-border pl-6 ml-2 space-y-6 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2">
                <div className="h-5 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-6 text-center text-sm text-destructive flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>Failed to load activity logs. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    const activityTimeline = data?.data || [];
    const pagination = data?.meta;

    if (activityTimeline.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic text-center py-6">
          No activity records logged for this customer.
        </p>
      );
    }

    return (
      <div className="space-y-6">
        <div className="relative border-l border-border pl-6 ml-2 space-y-6">
          {activityTimeline.map((item: AuditLog) => {
            const displayDate = item.date ? formatDateTime(item.date) : "N/A";
            return (
              <div key={item._id} className="relative group text-left">
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
                      Performed by:{" "}
                      <span className="text-foreground/80">
                        {typeof item.performedBy === "object"
                          ? item.performedBy.name || item.performedBy._id || "System User"
                          : item.performedBy || "System User"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/80">
            <p className="text-xs text-muted-foreground font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Number(pagination.page) - 1)}
                disabled={Number(pagination.page) <= 1}
                className="h-9 min-w-[44px]"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Number(pagination.page) + 1)}
                disabled={Number(pagination.page) >= pagination.totalPages}
                className="h-9 min-w-[44px]"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">{renderContent()}</CardContent>
    </Card>
  );
}
