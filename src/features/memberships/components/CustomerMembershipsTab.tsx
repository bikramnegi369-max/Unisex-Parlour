"use client";

import React, { useState } from "react";
import { useCustomerMemberships } from "../hooks/useMemberships";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

export function CustomerMembershipsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = useCustomerMemberships({
    search: search.trim() || undefined,
    status: (statusFilter as any) || undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["", "active", "pending_payment", "expired", "cancelled"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="capitalize"
            >
              {st === "" ? "All" : st.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership Code</TableHead>
              <TableHead>Plan & Tier</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading customer memberships...
                </TableCell>
              </TableRow>
            ) : !data?.data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No memberships found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-medium">{m.membershipCode}</TableCell>
                  <TableCell>
                    <div className="font-medium">{m.planSnapshot?.name}</div>
                    <div className="text-xs text-muted-foreground">{m.planSnapshot?.tier} Tier</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{m.customer?.name || "Customer"}</div>
                    <div className="text-xs text-muted-foreground">{m.customer?.phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{m.payer?.name || m.customer?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.payer?.id === m.customer?.id ? "Self Purchased" : "Gifted / Assigned"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {m.startDate ? format(new Date(m.startDate), "MMM d, yyyy") : "-"} to{" "}
                      {m.endDate ? format(new Date(m.endDate), "MMM d, yyyy") : "-"}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(m.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
