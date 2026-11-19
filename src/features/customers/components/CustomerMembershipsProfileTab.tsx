"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard, CheckCircle, Clock, XCircle, ShoppingCart, Ban, ExternalLink, Users } from "lucide-react";
import { useCustomerMemberships } from "@/features/memberships/hooks/useMemberships";

interface CustomerMembershipsProfileTabProps {
  customerId: string;
}

export function CustomerMembershipsProfileTab({ customerId }: CustomerMembershipsProfileTabProps) {
  const [filterMode, setFilterMode] = useState<"all" | "beneficiary" | "payer">("all");

  const queryParams = {
    customerId: filterMode === "beneficiary" ? customerId : undefined,
    payerCustomerId: filterMode === "payer" ? customerId : undefined,
  };

  const { data, isLoading } = useCustomerMemberships(queryParams);

  // When filterMode is "all", filter for records where customer is either beneficiary OR payer
  const memberships = (data?.data || []).filter((m) => {
    if (filterMode === "all") {
      const bId = typeof m.customerId === "object" ? (m.customerId as any)?._id || (m.customerId as any)?.id : m.customerId;
      const pId = typeof m.payerCustomerId === "object" ? (m.payerCustomerId as any)?._id || (m.payerCustomerId as any)?.id : m.payerCustomerId;
      return bId === customerId || pId === customerId;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/20 font-medium"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "suspended":
        return <Badge variant="outline" className="text-purple-600 border-purple-500/20 font-medium"><Clock className="w-3 h-3 mr-1" /> Suspended</Badge>;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Customer Memberships</h3>
          <p className="text-xs text-muted-foreground">
            Distinguishes memberships purchased by this customer vs memberships held as an entitled beneficiary.
          </p>
        </div>

        <div className="flex gap-1.5 bg-muted/60 p-1 rounded-lg">
          <Button
            size="sm"
            variant={filterMode === "all" ? "default" : "ghost"}
            onClick={() => setFilterMode("all")}
            className="text-xs h-7"
          >
            All Related
          </Button>
          <Button
            size="sm"
            variant={filterMode === "beneficiary" ? "default" : "ghost"}
            onClick={() => setFilterMode("beneficiary")}
            className="text-xs h-7"
          >
            Held (Beneficiary)
          </Button>
          <Button
            size="sm"
            variant={filterMode === "payer" ? "default" : "ghost"}
            onClick={() => setFilterMode("payer")}
            className="text-xs h-7"
          >
            Purchased (Payer)
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership Code</TableHead>
              <TableHead>Plan & Tier</TableHead>
              <TableHead>Role for Customer</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading memberships...
                </TableCell>
              </TableRow>
            ) : memberships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No memberships found for this customer.
                </TableCell>
              </TableRow>
            ) : (
              memberships.map((m) => {
                const bId = typeof m.customerId === "object" ? (m.customerId as any)?._id || (m.customerId as any)?.id : m.customerId;
                const pId = typeof m.payerCustomerId === "object" ? (m.payerCustomerId as any)?._id || (m.payerCustomerId as any)?.id : m.payerCustomerId;

                const isBeneficiary = bId === customerId;
                const isPayer = pId === customerId;

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
                      {isBeneficiary && isPayer ? (
                        <Badge variant="outline" className="text-primary border-primary/30 text-[11px]">
                          Payer & Beneficiary
                        </Badge>
                      ) : isBeneficiary ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[11px]">
                          Beneficiary (Entitled)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-500/30 text-[11px]">
                          Payer (Purchased for others)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {m.startDate ? format(new Date(m.startDate), "MMM d, yyyy") : "-"} to{" "}
                        {m.endDate ? format(new Date(m.endDate), "MMM d, yyyy") : "-"}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(m.status)}</TableCell>
                    <TableCell className="text-right">
                      {m.invoiceId && (
                        <Link
                          href={`/billing/${typeof m.invoiceId === "object" ? (m.invoiceId as any)?._id || (m.invoiceId as any)?.id : m.invoiceId}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Invoice <ExternalLink className="w-3 h-3" />
                        </Link>
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
