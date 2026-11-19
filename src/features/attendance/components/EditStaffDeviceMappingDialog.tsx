"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffDeviceMapping } from "../api/attendance.api";
import { useUpdateStaffDeviceMapping } from "../hooks/useAttendance";

const editMappingSchema = z.object({
  mappingStatus: z.enum(["mapped", "unmapped", "partial", "unknown"]),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});

type EditMappingFormValues = z.infer<typeof editMappingSchema>;

interface EditStaffDeviceMappingDialogProps {
  mapping: StaffDeviceMapping | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditStaffDeviceMappingDialog({
  mapping,
  open,
  onOpenChange,
  onSuccess,
}: EditStaffDeviceMappingDialogProps) {
  const updateMutation = useUpdateStaffDeviceMapping();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditMappingFormValues>({
    resolver: zodResolver(editMappingSchema),
    values: {
      mappingStatus: mapping?.mappingStatus || "mapped",
      notes: mapping?.notes || "",
    },
  });

  const selectedStatus = watch("mappingStatus");

  const onSubmit = async (values: EditMappingFormValues) => {
    if (!mapping) return;
    try {
      await updateMutation.mutateAsync({
        id: mapping._id,
        payload: {
          mappingStatus: values.mappingStatus,
          notes: values.notes || "",
        },
      });

      toast.success("Mapping metadata updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update mapping metadata."
      );
    }
  };

  if (!mapping) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Mapping Metadata</DialogTitle>
          <DialogDescription>
            Update safe operational metadata and notes for this biometric link.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Staff Member:</span>
            <span className="font-medium text-foreground">{mapping.staffId?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Biometric Code:</span>
            <span className="font-mono font-medium text-foreground">{mapping.externalEmployeeCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider / Device:</span>
            <span className="text-foreground">{mapping.provider} : {mapping.deviceId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mapping Status
            </label>
            <Select
              value={selectedStatus}
              onValueChange={(val: any) => setValue("mappingStatus", val, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mapped">Mapped (Active Resolution)</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unmapped">Unmapped</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            {errors.mappingStatus && (
              <p className="text-xs text-destructive">{errors.mappingStatus.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </label>
            <Textarea
              {...register("notes")}
              placeholder="Operational notes or device observations..."
              rows={3}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
