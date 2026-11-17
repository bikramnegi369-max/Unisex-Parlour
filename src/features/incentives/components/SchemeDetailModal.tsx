import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SchemeStatusBadge } from "./SchemeStatusBadge";
import { IncentiveScheme, isSupportedIncentiveScheme } from "../types/incentives.types";
import { Layers, Tag, ShieldCheck, Play, Pause, Archive } from "lucide-react";

interface SchemeDetailModalProps {
  scheme: IncentiveScheme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate?: (id: string) => void;
  onPause?: (id: string) => void;
  onArchive?: (id: string) => void;
  canManage?: boolean;
}

export const SchemeDetailModal: React.FC<SchemeDetailModalProps> = ({
  scheme,
  open,
  onOpenChange,
  onActivate,
  onPause,
  onArchive,
  canManage = false,
}) => {
  if (!scheme) return null;
  const isSupported = isSupportedIncentiveScheme(scheme);
  const commissionCategoryLabel =
    scheme.calculationBasis === "SUBSCRIPTION_NET_REVENUE"
      ? "subscription sale"
      : scheme.calculationBasis === "MEMBERSHIP_NET_REVENUE"
        ? "membership sale"
        : scheme.calculationBasis === "PRODUCT_NET_REVENUE"
          ? "retail product sale"
        : "service";
  const schemeTypeLabel = scheme.schemeType === "COMMISSION"
    ? `${commissionCategoryLabel[0].toUpperCase()}${commissionCategoryLabel.slice(1)} commission`
    : scheme.schemeType === "ATTENDANCE_BONUS"
      ? "Verified attendance bonus"
      : scheme.schemeType.replace(/_/g, " ").toLowerCase();
  const calculationBasisLabel = scheme.calculationBasis === "SERVICE_NET_REVENUE"
    ? "Performed service net revenue after discounts"
    : scheme.calculationBasis === "SUBSCRIPTION_NET_REVENUE"
      ? "Sold subscription net revenue after allocated discounts"
      : scheme.calculationBasis === "MEMBERSHIP_NET_REVENUE"
        ? "Sold membership net revenue after allocated discounts"
        : scheme.calculationBasis === "PRODUCT_NET_REVENUE"
          ? "Sold retail product net revenue after allocated discounts and confirmed stock issue"
        : scheme.calculationBasis === "ATTENDANCE_DAYS"
          ? "Verified attendance days"
          : scheme.calculationBasis.replace(/_/g, " ").toLowerCase();

  return (
    <Dialog isOpen={open} onClose={() => onOpenChange(false)} title={scheme.name} maxWidth="xl">
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between pb-2 border-b">
          <span className="font-mono text-xs text-muted-foreground">Code: {scheme.code}</span>
          <SchemeStatusBadge status={scheme.status} />
        </div>

        {scheme.description && (
          <div className="p-3 bg-zinc-50 rounded-lg text-zinc-700 text-xs">
            {scheme.description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 border rounded-lg space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Scheme Type
            </span>
            <p className="font-semibold text-zinc-900">{schemeTypeLabel}</p>
          </div>

          <div className="p-3 border rounded-lg space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Calculation Basis
            </span>
            <p className="font-semibold text-zinc-900">{calculationBasisLabel}</p>
          </div>
        </div>

        {/* Rules Snapshot */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configured Calculation Rules
          </h4>

          {scheme.rules?.tiers && scheme.rules.tiers.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="py-1.5 px-3 text-left font-medium text-muted-foreground">
                      Eligible {commissionCategoryLabel} line revenue
                    </th>
                    <th className="py-1.5 px-3 text-right font-medium text-muted-foreground">
                      Rate
                    </th>
                    <th className="py-1.5 px-3 text-right font-medium text-muted-foreground">
                      Fixed commission
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {scheme.rules.tiers.map((t, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3">
                        ₹{(t.minPaise / 100).toFixed(2)} &ndash;{" "}
                        {t.maxPaise !== null ? `₹${(t.maxPaise / 100).toFixed(2)}` : "∞"}
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-emerald-600">
                        {t.percentage}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-medium">
                        ₹{(t.fixedPaise / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {scheme.rules?.targetThresholdPaise > 0 && (
            <div className="flex justify-between text-xs p-2 bg-zinc-50 rounded border">
              <span className="text-muted-foreground">Monthly Revenue Target:</span>
              <span className="font-semibold">
                ₹{(scheme.rules.targetThresholdPaise / 100).toFixed(2)}
              </span>
            </div>
          )}

          {scheme.rules?.minimumAttendanceDays > 0 && (
            <div className="flex justify-between text-xs p-2 bg-zinc-50 rounded border">
              <span className="text-muted-foreground">Minimum Attended Days:</span>
              <span className="font-semibold">{scheme.rules.minimumAttendanceDays} days</span>
            </div>
          )}

          {scheme.rules?.fixedAmountPaise > 0 && (
            <div className="flex justify-between text-xs p-2 bg-zinc-50 rounded border">
              <span className="text-muted-foreground">
                {scheme.schemeType === "ATTENDANCE_BONUS"
                  ? "Monthly attendance bonus:"
                  : `Base fixed commission per eligible ${commissionCategoryLabel} line:`}
              </span>
              <span className="font-semibold text-emerald-600">
                ₹{(scheme.rules.fixedAmountPaise / 100).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Historical Immutability Notice:</strong> Historical earnings calculated under this
            scheme preserve their original immutable calculation snapshots. Activating, modifying, or
            archiving this rule applies exclusively to future effective periods.
          </div>
        </div>

        {!isSupported && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            This scheme has no verified earning pipeline. It cannot be activated or assigned and
            will not produce incentive earnings.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-4 border-t">
          {canManage && scheme.status !== "archived" && (
            <div className="flex gap-2 w-full sm:w-auto">
              {isSupported && scheme.status !== "active" && onActivate && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onActivate(scheme.id)}
                  className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Play className="w-3.5 h-3.5" /> Activate
                </Button>
              )}
              {scheme.status === "active" && onPause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPause(scheme.id)}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              )}
              {onArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchive(scheme.id)}
                  className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive
                </Button>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
