import React from "react";
import type { UserResponseDTO } from "../types/users.types";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/formatters";

interface UserDetailsModalProps {
  user: UserResponseDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
}: UserDetailsModalProps) {
  if (!user) return null;

  const roleName =
    typeof user.role === "object" && user.role !== null ? user.role.name : user.role;

  let statusVariant: "success" | "destructive" | "muted" | "warning" = "success";
  if (user.status === "inactive") statusVariant = "muted";
  if (user.status === "suspended") statusVariant = "destructive";
  if (user.status === "locked") statusVariant = "warning";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Staff Member Details">
      <div className="space-y-6 text-left max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: Identity */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Identity</h4>
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/80">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Full Name</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{user.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Phone Number</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{user.phone || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Email Address</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Account Authorization */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Security & Access</h4>
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/80">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Status</p>
              <div className="mt-1">
                <Badge variant={statusVariant}>
                  <span className="capitalize">{user.status}</span>
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">System Role</p>
              <div className="mt-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
                  {roleName}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Verification Status</p>
              <p className="text-xs font-semibold mt-1">
                {user.isVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-500">Verified</span>
                ) : (
                  <span className="text-amber-500">Pending OTP</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">First-Login Activation</p>
              <p className="text-xs font-semibold mt-1">
                {user.isFirstLogin ? (
                  <span className="text-amber-500">Awaiting First Login</span>
                ) : (
                  <span className="text-muted-foreground">Completed</span>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Organization Scoping</p>
              <p className="text-xs font-medium text-foreground mt-1">
                {user.hasOrgWideAccess ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 font-semibold border border-amber-500/20">
                    Organization-Wide Access (All branches authorized)
                  </span>
                ) : (
                  <span className="text-muted-foreground">Branch-scoped validation enforced</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Branch Access List */}
        {!user.hasOrgWideAccess && (
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Authorised Branches</h4>
            <div className="bg-muted/20 p-4 rounded-xl border border-border/80">
              {user.branchAccess.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1 text-center">No branch access granted yet.</p>
              ) : (
                <div className="space-y-2">
                  {user.branchAccess.map((b) => (
                    <div key={b.branchId} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-b-0">
                      <span className="text-xs font-semibold text-foreground">{b.branchName}</span>
                      <Badge variant={b.isActive ? "success" : "muted"} className="text-[9px] px-2 py-0">
                        {b.isActive ? "Active Authorization" : "Revoked"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Metadata */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">System Records</h4>
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/80 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Created On</p>
              <p className="font-semibold text-foreground mt-0.5">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Last Updated On</p>
              <p className="font-semibold text-foreground mt-0.5">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
