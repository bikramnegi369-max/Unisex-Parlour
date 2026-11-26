"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { StaffDeviceMapping } from "../api/attendance.api";
import { useUpdateStaffDeviceMapping } from "../hooks/useAttendance";

const editMappingSchema = z.object({
  provider: z.string().trim().min(1, "Provider is required").max(100),
  deviceId: z.string().trim().min(1, "Device ID is required").max(100),
  externalEmployeeCode: z.string().trim().min(1, "Biometric code is required").max(100),
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
    formState: { errors },
  } = useForm<EditMappingFormValues>({
    resolver: zodResolver(editMappingSchema),
    values: {
      provider: mapping?.provider || "eTimeOffice",
      deviceId: mapping?.deviceId || "default",
      externalEmployeeCode: mapping?.externalEmployeeCode || "",
      mappingStatus: mapping?.mappingStatus || "mapped",
      notes: mapping?.notes || "",
    },
  });

  const onSubmit = async (values: EditMappingFormValues) => {
    if (!mapping) return;
    try {
      await updateMutation.mutateAsync({
        id: mapping._id,
        payload: {
          provider: values.provider,
          deviceId: values.deviceId,
          externalEmployeeCode: values.externalEmployeeCode,
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
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Edit Mapping Metadata"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Update safe operational metadata and notes for this biometric link.
        </p>

        <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Staff Member:</span>
            <span className="font-medium text-foreground">{mapping.staffId?.name}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Provider
              </label>
              <Input {...register("provider")} placeholder="eTimeOffice" />
              {errors.provider && (
                <p className="text-xs text-destructive">{errors.provider.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Device ID
              </label>
              <Input {...register("deviceId")} placeholder="default" />
              {errors.deviceId && (
                <p className="text-xs text-destructive">{errors.deviceId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Biometric Code
            </label>
            <Input {...register("externalEmployeeCode")} placeholder="e.g. 1007" />
            {errors.externalEmployeeCode && (
              <p className="text-xs text-destructive">{errors.externalEmployeeCode.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mapping Status
            </label>
            <Select {...register("mappingStatus")}>
              <option value="mapped">Mapped (Active Resolution)</option>
              <option value="partial">Partial</option>
              <option value="unmapped">Unmapped</option>
              <option value="unknown">Unknown</option>
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

          <div className="flex justify-end gap-2 pt-2 border-t">
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
          </div>
        </form>
      </div>
    </Dialog>
  );
}
