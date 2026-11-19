"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Fingerprint, Plus, ExternalLink, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useStaffDeviceMappings } from "@/features/attendance/hooks/useAttendance";
import AddStaffDeviceMappingDialog from "@/features/attendance/components/AddStaffDeviceMappingDialog";

interface EmployeeAttendanceTabProps {
  employeeId: string;
  employeeName: string;
}

export default function EmployeeAttendanceTab({
  employeeId,
  employeeName,
}: EmployeeAttendanceTabProps) {
  const { user } = useAuth();
  const canAdjust = hasPermission(user, "attendance.adjust");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useStaffDeviceMappings({
    staffId: employeeId,
  });

  const mappings = useMemo(() => data?.mappings || [], [data?.mappings]);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Fingerprint size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Attendance Device IDs
              </h3>
              <p className="text-xs text-muted-foreground">
                Biometric credentials and terminal mappings for {employeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/attendance">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Attendance Workspace
              </Link>
            </Button>
            {canAdjust && (
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Device ID
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-xs text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 animate-spin text-primary" />
            Loading biometric ID mappings...
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load biometric mappings"
            description={(error as Error)?.message || "Could not retrieve employee mappings."}
            onRetry={() => refetch()}
          />
        ) : mappings.length === 0 ? (
          <EmptyState
            title="No biometric mappings assigned"
            description={`No hardware biometric ID is currently mapped to ${employeeName}. You can link their biometric device code here or via Attendance Settings.`}
            action={
              canAdjust ? (
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Map Biometric ID
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External Biometric ID</TableHead>
                  <TableHead>Provider & Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m._id} className={!m.isActive ? "opacity-60 bg-muted/20" : ""}>
                    <TableCell>
                      <span className="font-mono font-semibold text-sm bg-muted px-2 py-0.5 rounded border">
                        {m.externalEmployeeCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium capitalize">{m.provider}</span>
                      <span className="text-xs text-muted-foreground font-mono block">
                        {m.deviceId}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>From: {m.effectiveFrom ? new Date(m.effectiveFrom).toLocaleDateString() : "—"}</div>
                      {m.effectiveTo && (
                        <div className="text-destructive">
                          To: {new Date(m.effectiveTo).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddStaffDeviceMappingDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        defaultStaffId={employeeId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
