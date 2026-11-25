"use client";

import React, { useState } from "react";
import { useCustomerMemberships, useCancelBeneficiaryMembership } from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SyncButton } from "@/components/ui/sync-button";
import { Search, ShieldAlert, CheckCircle, Clock, XCircle, ShoppingCart, Ban, ExternalLink, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { ManageMembershipBeneficiariesDialog } from "./ManageMembershipBeneficiariesDialog";
import { CustomerMembershipDetailsModal } from "./CustomerMembershipDetailsModal";
import type { CustomerMembership, CustomerMembershipStatus } from "../types/membership.types";

interface CustomerMembershipsTabProps {
  onSell?: () => void;
  canSell?: boolean;
}

export function CustomerMembershipsTab({ onSell, canSell = true }: CustomerMembershipsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedManageMembershipId, setSelectedManageMembershipId] = useState<string | null>(null);
  const [selectedDetailsMembership, setSelectedDetailsMembership] = useState<CustomerMembership | null>(null);

  const { data, isLoading, isFetching, refetch } = useCustomerMemberships({
    search: search.trim() || undefined,
    status: (statusFilter || undefined) as CustomerMembershipStatus | undefined,
    page,
    limit,
  });

  const cancelMutation = useCancelBeneficiaryMembership();

  const handleCancelBeneficiary = async (membershipId: string, beneficiaryName: string) => {
    const reason = window.prompt(`Please enter the cancellation reason for ${beneficiaryName}:`);
    if (!reason || !reason.trim()) return;

    try {
      await cancelMutation.mutateAsync({ id: membershipId, reason: reason.trim() });
      toast.success(`Membership for ${beneficiaryName} has been cancelled.`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            "Failed to cancel membership.";
      toast.error(errorMsg);
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className="capitalize text-xs h-8"
              >
                {st === "" ? "All" : st.replace("_", " ")}
              </Button>
            ))}
          </div>

          <SyncButton
            isSyncing={isFetching}
            onSync={() => refetch()}
            label="Refresh"
          />

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
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDetailsMembership(m)}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedManageMembershipId(m.id)}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" /> Members
                        </Button>
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages || 1}
          totalItems={data.total}
          onPageChange={setPage}
          pageSize={limit}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="memberships"
        />
      )}

      {/* Complete Customer Membership Details Modal */}
      {selectedDetailsMembership && (
        <CustomerMembershipDetailsModal
          isOpen={Boolean(selectedDetailsMembership)}
          onClose={() => setSelectedDetailsMembership(null)}
          membership={selectedDetailsMembership}
        />
      )}

      {/* Beneficiary Management Dialog */}
      {selectedManageMembershipId && (
        <ManageMembershipBeneficiariesDialog
          isOpen={Boolean(selectedManageMembershipId)}
          onClose={() => setSelectedManageMembershipId(null)}
          membershipId={selectedManageMembershipId}
        />
      )}
    </div>
  );
}
