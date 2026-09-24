import React from "react";
import type { SubscriptionEntitlement } from "../types/subscription.types";
import { Scissors } from "lucide-react";

interface SubscriptionEntitlementsTabProps {
  entitlements: SubscriptionEntitlement[];
}

export function SubscriptionEntitlementsTab({
  entitlements,
}: SubscriptionEntitlementsTabProps) {
  if (!entitlements || entitlements.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
        No service entitlements configured for this subscription.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entitlements.map((ent, idx) => {
          const usedPct =
            ent.totalQuantity > 0
              ? Math.min(
                  100,
                  Math.round((ent.usedQuantity / ent.totalQuantity) * 100),
                )
              : 0;

          const rawSrv = ent.serviceId as unknown;
          const srvObj =
            typeof rawSrv === "object" && rawSrv !== null
              ? (rawSrv as { _id?: string; id?: string; name?: string })
              : undefined;

          const resolvedServiceId = srvObj
            ? srvObj._id || srvObj.id || `ent-${idx}`
            : typeof ent.serviceId === "string" && ent.serviceId.trim() !== ""
            ? ent.serviceId
            : `ent-${idx}`;

          const resolvedServiceName =
            ent.serviceName || srvObj?.name || `Service: ${resolvedServiceId}`;

          return (
            <div
              key={resolvedServiceId || `ent-${idx}`}
              className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground truncate max-w-50">
                      {resolvedServiceName}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      ID: {resolvedServiceId}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-foreground">
                    {ent.remainingQuantity}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    of {ent.totalQuantity} left
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      ent.remainingQuantity === 0
                        ? "bg-muted-foreground/40"
                        : "bg-primary"
                    }`}
                    style={{ width: `${100 - usedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>
                    Used: {ent.usedQuantity} units ({usedPct}%)
                  </span>
                  <span>Available: {ent.remainingQuantity} units</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
