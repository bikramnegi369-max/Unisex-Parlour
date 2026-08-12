"use client";

import React, { useState } from "react";
import { useCustomerNotes } from "../hooks/useCustomerNotes";
import { useCreateCustomerNote } from "../hooks/useCreateCustomerNote";
import { CustomerNote } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, User, Plus, Loader2, ChevronLeft, ChevronRight, AlertCircle, Building2 } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasBranchAccess } from "@/lib/permissions";
import { useCustomer } from "../hooks/useCustomer";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";

interface CustomerNotesProps {
  customerId: string;
}

const CHARACTER_LIMIT = 1000;

export function CustomerNotes({ customerId }: CustomerNotesProps) {
  const [page, setPage] = useState(1);
  const limit = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [validationError, setValidationError] = useState("");
  const [branchError, setBranchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { currentBranchId, availableBranches, getBranchName, isAllBranchesSelected } = useBranchContext();
  const { user } = useAuth();
  const { data: customer } = useCustomer(customerId);

  const { data, isLoading, isError, refetch } = useCustomerNotes(customerId, { page, limit });
  const createNoteMutation = useCreateCustomerNote();

  const handleOpenAddDialog = () => {
    setNoteText("");
    setValidationError("");
    setSubmitError("");
    setBranchError("");
    setSubmitSuccess(false);

    if (currentBranchId) {
      setSelectedBranchId(currentBranchId);
    } else {
      const isHomeBranchValid = customer?.homeBranchId &&
        availableBranches.some((b) => b.id === customer.homeBranchId && b.isActive && hasBranchAccess(user, b.id));
      setSelectedBranchId(isHomeBranchValid ? customer.homeBranchId : "");
    }
    setIsAddOpen(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length > CHARACTER_LIMIT) {
      return;
    }
    setNoteText(text);
    if (validationError && text.trim().length > 0) {
      setValidationError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed) {
      setValidationError("Please enter note content before saving.");
      return;
    }

    if (!selectedBranchId) {
      setBranchError("Please select a branch to record this note.");
      return;
    }

    createNoteMutation.mutate(
      { customerId, text: trimmed, branchId: selectedBranchId },
      {
        onSuccess: () => {
          setSubmitSuccess(true);
          toast.success("Note added successfully.");
          setNoteText("");
          setTimeout(() => {
            setIsAddOpen(false);
            setSubmitSuccess(false);
          }, 1000);
        },
        onError: (err: unknown) => {
          setSubmitError(getErrorMessage(err, "We encountered an issue saving your note. Please try again."));
        },
      }
    );
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/70 bg-muted/5 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="p-6 text-center text-sm text-destructive flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>We couldn't retrieve the notes for this customer. Please check your connection and try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    const notesList = data?.data || [];
    const pagination = data?.meta;

    if (notesList.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Internal notes are used to record staff communication, styling history, preferences, and private remarks."
          action={{
            label: "Add First Note",
            onClick: handleOpenAddDialog,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-4">
          {notesList.map((note: CustomerNote) => {
            const displayDate = formatDateTime(note.createdAt);
            const creatorName =
              typeof note.createdBy === "object" && note.createdBy !== null
                ? note.createdBy.name || "System User"
                : note.createdBy || "System User";

            const originatingBranchName =
              typeof note.branch === "object" && note.branch !== null
                ? note.branch.name
                : note.branchId
                ? availableBranches.find((b) => b.id === note.branchId)?.name || note.branchId
                : "";

            return (
              <div key={note._id} className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/5 transition-colors space-y-2">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {note.text}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    {originatingBranchName && (
                      <>
                        <span className="text-foreground/90 font-bold">{originatingBranchName}</span>
                        <span>·</span>
                      </>
                    )}
                    <User size={10} className="inline shrink-0" />
                    Created by: <span className="text-foreground/80">{creatorName}</span>
                  </span>
                  <span>{displayDate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/80">
            <p className="text-xs text-muted-foreground font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Number(pagination.page) - 1)}
                disabled={Number(pagination.page) <= 1}
                className="h-9 min-w-[44px]"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Number(pagination.page) + 1)}
                disabled={Number(pagination.page) >= pagination.totalPages}
                className="h-9 min-w-[44px]"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isSubmitPending = createNoteMutation.isPending;

  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4 flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          Internal Staff Notes
        </CardTitle>
        {data && data.data && data.data.length > 0 && (
          <Button
            size="sm"
            onClick={handleOpenAddDialog}
            className="flex items-center gap-1.5 cursor-pointer h-9 min-w-[44px]"
          >
            <Plus size={14} />
            Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">{renderContent()}</CardContent>

      <Dialog isOpen={isAddOpen} onClose={() => !isSubmitPending && setIsAddOpen(false)} title="Add Internal Staff Note">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {submitError && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-xs font-semibold">
              Note added successfully!
            </div>
          )}

          {isAllBranchesSelected ? (
            <MutationBranchSelector
              value={selectedBranchId}
              onChange={(val) => {
                setSelectedBranchId(val);
                if (val) setBranchError("");
              }}
              branches={availableBranches}
              disabled={isSubmitPending || submitSuccess}
              error={branchError}
            />
          ) : (
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Branch
              </span>
              <div className="flex items-center gap-2 text-sm font-semibold bg-muted/30 p-2.5 rounded-lg border border-border/60">
                <Building2 size={15} className="text-muted-foreground" />
                <span>{getBranchName(selectedBranchId)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="noteText" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Note Content
            </label>
            <textarea
              id="noteText"
              rows={4}
              value={noteText}
              onChange={handleTextChange}
              disabled={isSubmitPending || submitSuccess}
              placeholder="Type your note here..."
              className={`flex w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] ${
                validationError ? "border-destructive focus-visible:ring-destructive" : "border-input"
              }`}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span className="text-destructive">{validationError}</span>
              <span>
                {noteText.length} / {CHARACTER_LIMIT} characters
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitPending || submitSuccess}
              className="h-9 min-w-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitPending || submitSuccess || !noteText.trim() || (!selectedBranchId && isAllBranchesSelected)}
              className="flex items-center gap-2 h-9 min-w-[44px]"
            >
              {isSubmitPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
