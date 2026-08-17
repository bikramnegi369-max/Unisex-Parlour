"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  useLeave,
  useUpdateLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
} from "../hooks/useLeaves";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import LeaveForm from "./LeaveForm";
import {
  ApproveLeaveDialog,
  RejectLeaveDialog,
  CancelLeaveDialog,
} from "./LeaveActionDialogs";
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Loader2,
  Edit,
  Check,
  X,
  Ban,
} from "lucide-react";
import type { UpdateLeavePayload } from "../types/leaves.types";

interface LeaveDetailsPageProps {
  leaveId: string;
}

export default function LeaveDetailsPage({ leaveId }: LeaveDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = hasPermission(user, "employees.leaves.manage");

  // Fetch leave
  const { data: leave, isLoading, error } = useLeave(leaveId);

  // Mutations
  const updateMutation = useUpdateLeave();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const cancelMutation = useCancelLeave();

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "cancelled":
        return "muted";
      case "pending":
      default:
        return "warning";
    }
  };

  const handleEditSubmit = (payload: UpdateLeavePayload) => {
    updateMutation.mutate(
      { id: leaveId, payload },
      {
        onSuccess: () => {
          toast.success("Leave request updated successfully.");
          setIsEditOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, "Failed to update leave request."));
        },
      }
    );
  };

  const handleApproveConfirm = (reviewNote: string) => {
    approveMutation.mutate(
      { id: leaveId, reviewNote: reviewNote || undefined },
      {
        onSuccess: () => {
          toast.success("Leave request approved successfully.");
          setIsApproveOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, "Failed to approve leave request."));
        },
      }
    );
  };

  const handleRejectConfirm = (reviewNote: string) => {
    rejectMutation.mutate(
      { id: leaveId, reviewNote },
      {
        onSuccess: () => {
          toast.success("Leave request rejected successfully.");
          setIsRejectOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, "Failed to reject leave request."));
        },
      }
    );
  };

  const handleCancelConfirm = (cancelReason: string) => {
    cancelMutation.mutate(
      { id: leaveId, cancelReason },
      {
        onSuccess: () => {
          toast.success("Leave request cancelled successfully.");
          setIsCancelOpen(false);
        },
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err, "Failed to cancel leave request."));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !leave) {
    return (
      <ErrorState
        title="Leave Request Not Found"
        description="We couldn't find the requested leave record, or you do not have permission to view it."
        retryAction={{ label: "Go Back", onClick: () => router.push("/leaves") }}
      />
    );
  }

  const isPending = leave.status === "pending";
  const isApproved = leave.status === "approved";
  const staffName = leave.name || "Self Service";

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/leaves")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Leaves
        </Button>

        <div className="flex gap-2">
          {isPending && (
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer text-xs h-9"
            >
              <Edit size={14} /> Edit
            </Button>
          )}

          {isPending && canManage && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsApproveOpen(true)}
                className="flex items-center gap-1.5 cursor-pointer text-xs h-9 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
              >
                <Check size={14} /> Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                className="flex items-center gap-1.5 cursor-pointer text-xs h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X size={14} /> Reject
              </Button>
            </>
          )}

          {(isPending || isApproved) && (
            <Button
              variant="outline"
              onClick={() => setIsCancelOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer text-xs h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban size={14} /> Cancel Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Panel */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">{leave.leaveCode}</span>
                  <CardTitle className="text-xl font-bold mt-1 text-foreground">{leave.leaveType}</CardTitle>
                </div>
                <Badge variant={getStatusVariant(leave.status)} className="px-3 py-1 text-xs">
                  <span className="capitalize">{leave.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Date Block */}
              <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 border border-border/50 rounded-xl p-4">
                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Start Date</span>
                  <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
                    <Calendar size={14} className="text-primary/70" />
                    {formatDate(leave.startDate)}
                  </div>
                </div>
                <div className="w-px bg-border/80 hidden sm:block" />
                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">End Date</span>
                  <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
                    <Calendar size={14} className="text-primary/70" />
                    {formatDate(leave.endDate)}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Reason for Leave</span>
                <p className="text-sm text-foreground bg-muted/5 border border-border/40 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                  {leave.reason}
                </p>
              </div>

              {/* Review Note */}
              {(leave.reviewNote || leave.reviewedBy) && (
                <div className="space-y-3 border-t border-border/50 pt-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {leave.status === "approved" ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-destructive" />
                    )}
                    Review Information
                  </div>
                  <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2">
                    {leave.reviewNote && (
                      <div className="flex items-start gap-2 text-sm text-foreground">
                        <MessageSquare size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <p className="italic">&ldquo;{leave.reviewNote}&rdquo;</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                      {leave.reviewedBy && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          Reviewed by:{" "}
                          <span className="font-medium text-foreground">
                            {leave.reviewedBy}
                          </span>
                        </div>
                      )}
                      {leave.reviewedAt && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          Reviewed at:{" "}
                          <span className="font-medium text-foreground">
                            {formatDateTime(leave.reviewedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancel Info */}
              {(leave.cancelReason || leave.cancelledBy) && (
                <div className="space-y-3 border-t border-border/50 pt-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <AlertOctagon size={14} className="text-amber-500" />
                    Cancellation Information
                  </div>
                  <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2">
                    {leave.cancelReason && (
                      <div className="flex items-start gap-2 text-sm text-foreground">
                        <MessageSquare size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                        <p className="italic">&ldquo;{leave.cancelReason}&rdquo;</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
                      {leave.cancelledBy && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          Cancelled by:{" "}
                          <span className="font-medium text-foreground">
                            {leave.cancelledBy}
                          </span>
                        </div>
                      )}
                      {leave.cancelledAt && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          Cancelled at:{" "}
                          <span className="font-medium text-foreground">
                            {formatDateTime(leave.cancelledAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Staff & Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Staff Member</span>
                <span className="font-semibold text-foreground">{staffName}</span>
              </div>
              <hr className="border-border/40" />
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Submitted For</span>
                <span className="font-semibold text-foreground">
                  {leave.submittedFor}
                </span>
              </div>
              <hr className="border-border/40" />
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Submitted By</span>
                <span className="font-semibold text-foreground">
                  {leave.submittedBy}
                </span>
              </div>
              <hr className="border-border/40" />
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Created At</span>
                <span className="font-medium text-foreground">{formatDateTime(leave.createdAt)}</span>
              </div>
              <hr className="border-border/40" />
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Last Updated</span>
                <span className="font-medium text-foreground">{formatDateTime(leave.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Form Modal */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Leave Request">
        <LeaveForm
          initialLeave={leave}
          onSubmit={handleEditSubmit}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setIsEditOpen(false)}
          submitLabel="Save Changes"
          error={updateMutation.error}
        />
      </Dialog>

      {/* Approve Dialog */}
      <ApproveLeaveDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApproveConfirm}
        isSubmitting={approveMutation.isPending}
        leaveCode={leave.leaveCode}
      />

      {/* Reject Dialog */}
      <RejectLeaveDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        isSubmitting={rejectMutation.isPending}
        leaveCode={leave.leaveCode}
      />

      {/* Cancel Dialog */}
      <CancelLeaveDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        isSubmitting={cancelMutation.isPending}
        leaveCode={leave.leaveCode}
      />
    </div>
  );
}
