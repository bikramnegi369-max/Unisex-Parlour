"use client";

import React, { useState } from "react";
import { useCustomerMemberships, useCancelBeneficiaryMembership } from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, CheckCircle, Clock, XCircle, ShoppingCart, Ban, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

interface CustomerMembershipsTabProps {
  onSell?: () => void;
  canSell?: boolean;
}

export function CustomerMembershipsTab({ onSell, canSell = true }: CustomerMembershipsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = useCustomerMemberships({
    search: search.trim() || undefined,
    status: (statusFilter as any) || undefined,
  });

  const cancelMutation = useCancelBeneficiaryMembership();

  const handleCancelBeneficiary = async (membershipId: string, beneficiaryName: string) => {
    const reason = window.prompt(`Please enter the cancellation reason for ${beneficiaryName}:`);
    if (!reason || !reason.trim()) return;

    try {
      await cancelMutation.mutateAsync({ id: membershipId, reason: reason.trim() });
      toast.success(`Membership for ${beneficiaryName} has been cancelled.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to cancel membership.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/20 font-medium"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "expired":
        return <Badge variant="secondary" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search membership code, customer or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["", "active", "pending_payment", "expired", "cancelled"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => setStatusFilter(st)}
                className="capitalize text-xs h-8"
              >
                {st === "" ? "All" : st.replace("_", " ")}
              </Button>
            ))}
          </div>

          {canSell && onSell && (
            <Button onClick={onSell} className="gap-1.5 text-xs h-8 shadow-sm">
              <ShoppingCart className="w-3.5 h-3.5" /> Sell Membership
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership Code</TableHead>
              <TableHead>Plan & Tier</TableHead>
              <TableHead>Beneficiary Customer</TableHead>
              <TableHead>Payer / Purchaser</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Loading customer memberships...
                </TableCell>
              </TableRow>
            ) : !data?.data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No memberships found matching your search or filters.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((m) => {
                const benName = m.customer?.name || "Customer";
                const isSelf = m.payerCustomerId === m.customerId;
                const canCancel = m.status === "active" || m.status === "pending_payment";

                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-medium text-xs">
                      {m.membershipCode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{m.planSnapshot?.name}</div>
                      <div className="text-xs text-muted-foreground">{m.planSnapshot?.tier} Tier</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{benName}</div>
                      <div className="text-xs text-muted-foreground">{m.customer?.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{m.payer?.name || benName}</div>
                      <div className="text-xs text-muted-foreground">
                        {isSelf ? "Self Purchased" : "Gifted / Assigned by Payer"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {m.startDate ? format(new Date(m.startDate), "MMM d, yyyy") : "-"} to{" "}
                        {m.endDate ? format(new Date(m.endDate), "MMM d, yyyy") : "-"}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell className="text-right">
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelBeneficiary(m.id, benName)}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
