"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CouponStatusBadge } from "./CouponStatusBadge";
import { Coupon } from "../types/coupon.types";
import { format } from "date-fns";
import {
  Copy,
  Check,
  Edit2,
  Trash2,
  Ticket,
  Users,
  MapPinOff,
  Percent,
  IndianRupee,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface CouponTableProps {
  coupons: Coupon[];
  isLoading: boolean;
  canConfigure: boolean;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
  onToggleStatus: (coupon: Coupon) => void;
  isTogglingStatus?: boolean;
}

export const CouponTable: React.FC<CouponTableProps> = ({
  coupons,
  isLoading,
  canConfigure,
  onEdit,
  onDelete,
  onToggleStatus,
  isTogglingStatus = false,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon code ${code} copied to clipboard!`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy coupon code");
    }
  };

  const formatDateRange = (from: string, until: string) => {
    try {
      const fromFormatted = format(new Date(from), "dd MMM yyyy");
      const untilFormatted = format(new Date(until), "dd MMM yyyy");
      return `${fromFormatted} – ${untilFormatted}`;
    } catch {
      return "Invalid date";
    }
  };

  if (!isLoading && coupons.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No coupons found"
        description="No coupon campaigns match your current filters. Try resetting search or create a new campaign."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[180px]">Code & Details</TableHead>
              <TableHead className="w-[130px]">Discount</TableHead>
              <TableHead className="w-[200px]">Validity Period</TableHead>
              <TableHead className="w-[140px]">Recorded Usage</TableHead>
              <TableHead className="w-[130px]">Exclusions</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <div className="space-y-1.5 animate-pulse">
                      <div className="h-5 w-24 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted/60 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-36 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-16 bg-muted rounded ml-auto animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              coupons.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                const isLimitReached =
                  coupon.totalUsageLimit !== null &&
                  coupon.totalUsageLimit !== undefined &&
                  coupon.usageCount >= coupon.totalUsageLimit;
                const excludedCount = Array.isArray(coupon.excludedBranchIds)
                  ? coupon.excludedBranchIds.length
                  : 0;

                return (
                  <TableRow
                    key={coupon.id || coupon._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Code & Description */}
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold tracking-wider text-sm text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                            {coupon.code}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy coupon code"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={coupon.description}>
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Discount */}
                    <TableCell className="align-top">
                      <div className="flex items-center gap-1 font-semibold text-sm text-foreground">
                        {coupon.discountType === "percentage" ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-primary" />
                            <span>{coupon.discountValue}% off</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5 text-primary" />
                            <span>₹{coupon.discountValue.toLocaleString()} off</span>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Validity Period */}
                    <TableCell className="align-top text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{formatDateRange(coupon.validFrom, coupon.validUntil)}</span>
                      </div>
                    </TableCell>

                    {/* Recorded Usage / Limit */}
                    <TableCell className="align-top">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">
                            {coupon.usageCount ?? 0}
                          </span>
                          <span className="text-muted-foreground">
                            / {coupon.totalUsageLimit ?? "∞"}
                          </span>
                        </div>
                        {isLimitReached && (
                          <span className="inline-block px-1.5 py-0.2 text-[10px] font-medium bg-red-500/10 text-red-600 rounded">
                            Limit reached
                          </span>
                        )}
                        {coupon.perCustomerLimit && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>Max {coupon.perCustomerLimit}/client</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Exclusions */}
                    <TableCell className="align-top text-xs">
                      {excludedCount > 0 ? (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <MapPinOff className="h-3.5 w-3.5" />
                          <span>{excludedCount} excluded</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">All branches</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <CouponStatusBadge
                          status={coupon.status}
                          isExpired={coupon.isExpired}
                          validUntil={coupon.validUntil}
                        />
                        {canConfigure && !coupon.isExpired && (
                          <Switch
                            checked={coupon.status === "active"}
                            onCheckedChange={() => onToggleStatus(coupon)}
                            disabled={isTogglingStatus}
                            aria-label={`Toggle ${coupon.code} status`}
                            className="scale-75 origin-left"
                          />
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canConfigure && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onEdit(coupon)}
                              title="Edit coupon"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => onDelete(coupon)}
                              title="Delete coupon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={`mobile-skeleton-${index}`} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-4 w-full bg-muted/40 rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          coupons.map((coupon) => {
            const isCopied = copiedCode === coupon.code;
            const excludedCount = Array.isArray(coupon.excludedBranchIds)
              ? coupon.excludedBranchIds.length
              : 0;

            return (
              <Card key={coupon.id || coupon._id} className="border-border/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold tracking-wider text-base text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                          {coupon.code}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={() => handleCopyCode(coupon.code)}
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    <CouponStatusBadge
                      status={coupon.status}
                      isExpired={coupon.isExpired}
                      validUntil={coupon.validUntil}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Discount</span>
                      <span className="font-semibold text-foreground">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% off`
                          : `₹${coupon.discountValue.toLocaleString()} off`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Recorded Usage</span>
                      <span className="font-semibold text-foreground">
                        {coupon.usageCount ?? 0} / {coupon.totalUsageLimit ?? "∞"}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDateRange(coupon.validFrom, coupon.validUntil)}</span>
                    </div>
                    {excludedCount > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <MapPinOff className="h-3.5 w-3.5 shrink-0" />
                        <span>{excludedCount} branch{excludedCount > 1 ? "es" : ""} excluded</span>
                      </div>
                    )}
                  </div>

                  {canConfigure && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        {!coupon.isExpired && (
                          <>
                            <span className="text-xs text-muted-foreground">Active:</span>
                            <Switch
                              checked={coupon.status === "active"}
                              onCheckedChange={() => onToggleStatus(coupon)}
                              disabled={isTogglingStatus}
                              className="scale-75"
                            />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(coupon)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(coupon)}
                          className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
