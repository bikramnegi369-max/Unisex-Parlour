"use client";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelSubscriptionSchema,
  type CancelSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Subscription } from "../types/subscription.types";

interface CancelSubscriptionDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: CancelSubscriptionFormValues) => Promise<void>;
  isLoading: boolean;
}

export function CancelSubscriptionDialog({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelSubscriptionDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelSubscriptionFormValues>({
    resolver: zodResolver(cancelSubscriptionSchema) as unknown as Resolver<CancelSubscriptionFormValues>,
    defaultValues: {
      reason: "",
    },
  });

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit(onConfirm)} className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Are you sure you want to cancel this subscription?</p>
          <p className="text-muted-foreground">
            Cancelling <span className="font-semibold text-foreground">{subscription.subscriptionCode || subscription.id}</span> will forfeit any remaining service entitlements. This action cannot be undone.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reason for Cancellation <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="State the reason for cancellation (e.g. customer request, refund, relocation)..."
          rows={3}
          disabled={isLoading}
          {...register("reason")}
          className="text-xs"
        />
        {errors.reason && (
          <p className="text-[11px] text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer"
        >
          Nevermind
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer gap-1.5"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Confirm Cancellation
        </Button>
      </div>
    </form>
  );
}
