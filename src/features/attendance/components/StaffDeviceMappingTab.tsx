"use client";

import { useMemo, useState } from "react";
import {
  Fingerprint,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { StaffDeviceMapping } from "../api/attendance.api";
import {
  useDeactivateStaffDeviceMapping,
  useStaffDeviceMappings,
} from "../hooks/useAttendance";
import AddStaffDeviceMappingDialog from "./AddStaffDeviceMappingDialog";
import EditStaffDeviceMappingDialog from "./EditStaffDeviceMappingDialog";

export default function StaffDeviceMappingTab() {
  const { user } = useAuth();
  const { isAllBranchesSelected } = useBranchContext();
  const canAdjust = hasPermission(user, "attendance.adjust");

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<StaffDeviceMapping | null>(null);
  const [deactivatingMapping, setDeactivatingMapping] = useState<StaffDeviceMapping | null>(null);

  const {
    data: mappingData,
    isLoading,
    isError,
    error,
    refetch,
  } = useStaffDeviceMappings({
    provider: providerFilter !== "all" ? providerFilter : undefined,
    mappingStatus: statusFilter !== "all" ? statusFilter : undefined,
    search: search.trim() || undefined,
  });

  const deactivateMutation = useDeactivateStaffDeviceMapping();

  const mappings = useMemo(() => mappingData?.mappings || [], [mappingData?.mappings]);

  const handleDeactivateConfirm = async () => {
    if (!deactivatingMapping) return;
    try {
      await deactivateMutation.mutateAsync(deactivatingMapping._id);
      toast.success(
        `Staff mapping for ${
          deactivatingMapping.staffId?.name || "employee"
        } (${deactivatingMapping.externalEmployeeCode}) deactivated.`
      );
      setDeactivatingMapping(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to deactivate staff mapping."
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Staff-to-Biometric Device ID Mapping
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Source of truth for resolving hardware biometric employee codes to internal salon staff members.
            </p>
          </div>
          {canAdjust && (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="shrink-0"
              disabled={isAllBranchesSelected}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add ID Mapping
            </Button>
          )}
        </CardHeader>

        {isAllBranchesSelected && (
          <div className="px-6 pb-3">
            <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-md border border-amber-200">
              Please select a specific branch from the header to manage staff biometric device mappings.
            </p>
          </div>
        )}

        {/* Filter Toolbar */}
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by staff name, internal code, external biometric ID, or device..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full sm:w-[150px] text-xs h-9"
              >
                <option value="all">All Providers</option>
                <option value="simulator">Simulator</option>
                <option value="eTimeOffice">eTimeOffice</option>
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-[150px] text-xs h-9"
              >
                <option value="all">All Statuses</option>
                <option value="mapped">Mapped</option>
                <option value="partial">Partial</option>
                <option value="unmapped">Unmapped</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 animate-spin text-primary" />
            Loading biometric device mappings...
          </CardContent>
        </Card>
      ) : isError ? (
        <ErrorState
          title="Failed to load mappings"
          description={(error as Error)?.message || "An unexpected error occurred while loading mappings."}
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
          }}
        />
      ) : mappings.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              title={search ? "No matching mappings found" : "No staff biometric mappings registered"}
              description={
                search
                  ? `No biometric mappings matched your search "${search}". Try adjusting filters.`
                  : "Map salon staff members to their external biometric badge numbers to automate attendance ingestion."
              }
              action={
                canAdjust && !search && !isAllBranchesSelected
                  ? {
                      label: "Add First Mapping",
                      onClick: () => setIsAddOpen(true),
                      icon: Plus,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Biometric Code</TableHead>
                  <TableHead>Provider & Device</TableHead>
                  <TableHead>Mapping Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const staff = mapping.staffId;
                  const isActive = mapping.isActive;

                  return (
                    <TableRow key={mapping._id} className={!isActive ? "opacity-60 bg-muted/20" : ""}>
                      {/* Staff Member */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {staff?.name || "Unknown Staff"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Code: <span className="font-mono">{staff?.staffCode || "—"}</span>
                            {staff?.role && ` • ${staff.role}`}
                          </p>
                        </div>
                      </TableCell>

                      {/* External Biometric ID */}
                      <TableCell>
                        <span className="font-mono font-semibold text-sm bg-muted px-2 py-0.5 rounded border">
                          {mapping.externalEmployeeCode}
                        </span>
                      </TableCell>

                      {/* Provider & Device */}
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-medium capitalize text-foreground">
                            {mapping.provider}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {mapping.deviceId}
                          </span>
                        </div>
                      </TableCell>

                      {/* Mapping Method */}
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {mapping.mappingMethod?.replace("_", " ") || "admin"}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              Active ({mapping.mappingStatus})
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Deactivated
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Effective Period */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div>
                          From: {mapping.effectiveFrom ? new Date(mapping.effectiveFrom).toLocaleDateString() : "—"}
                        </div>
                        {mapping.effectiveTo && (
                          <div className="text-destructive">
                            To: {new Date(mapping.effectiveTo).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {canAdjust && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Edit metadata"
                              onClick={() => setEditingMapping(mapping)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Deactivate mapping"
                                onClick={() => setDeactivatingMapping(mapping)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add Dialog */}
      <AddStaffDeviceMappingDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      <EditStaffDeviceMappingDialog
        mapping={editingMapping}
        open={Boolean(editingMapping)}
        onOpenChange={(open) => !open && setEditingMapping(null)}
        onSuccess={() => refetch()}
      />

      {/* Deactivation Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(deactivatingMapping)}
        onClose={() => setDeactivatingMapping(null)}
        title="Deactivate Biometric Mapping"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm">
            Are you sure you want to deactivate the mapping for{" "}
            <strong>{deactivatingMapping?.staffId?.name}</strong> with biometric code{" "}
            <strong>{deactivatingMapping?.externalEmployeeCode}</strong>?
          </p>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Historical punches are preserved
            </p>
            <p>
              Deactivating will prevent this biometric ID from resolving to this staff member on new punches. Historical attendance and punch records remain intact.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => setDeactivatingMapping(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateConfirm}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Mapping"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
