"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
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
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import {
  useAttendanceProviderStatus,
  useCreateStaffDeviceMapping,
} from "../hooks/useAttendance";

const addMappingFormSchema = z.object({
  staffId: z.string().min(1, "Internal staff selection is required"),
  provider: z.string().min(1, "Attendance provider is required"),
  deviceId: z.string().trim().min(1, "Device ID is required").max(100),
  externalEmployeeCode: z
    .string()
    .trim()
    .min(1, "External biometric employee code is required")
    .max(100),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});

type AddMappingFormValues = z.infer<typeof addMappingFormSchema>;

interface AddStaffDeviceMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStaffId?: string;
  onSuccess?: () => void;
}

export default function AddStaffDeviceMappingDialog({
  open,
  onOpenChange,
  defaultStaffId,
  onSuccess,
}: AddStaffDeviceMappingDialogProps) {
  const [conflictError, setConflictError] = useState<string | null>(null);

  // 1. Fetch available staff members for the branch
  const { data: staffData, isLoading: isLoadingStaff } = useEmployees({
    page: 1,
    limit: 100,
  });
  const staffList = useMemo(() => staffData?.data || [], [staffData?.data]);

  // 2. Fetch provider status & configured providers
  const { data: providerStatus, isLoading: isLoadingProviders } =
    useAttendanceProviderStatus();
  const supportedProviders = useMemo(
    () => providerStatus?.supportedProviders || ["simulator", "eTimeOffice"],
    [providerStatus?.supportedProviders]
  );

  const createMutation = useCreateStaffDeviceMapping();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddMappingFormValues>({
    resolver: zodResolver(addMappingFormSchema),
    defaultValues: {
      staffId: defaultStaffId || "",
      provider: "simulator",
      deviceId: "",
      externalEmployeeCode: "",
      notes: "",
    },
  });

  const selectedStaffId = watch("staffId");
  const selectedProvider = watch("provider");
  const selectedDeviceId = watch("deviceId");
  const externalCode = watch("externalEmployeeCode");

  // Derive configured device suggestions for the selected provider
  const configuredDevices = useMemo(() => {
    if (!providerStatus?.configurations) return [];
    const config = providerStatus.configurations.find(
      (c) => c.providerName === selectedProvider
    );
    // Providers may have devices in syncStates or config
    const devicesFromSync = (providerStatus.syncStates || [])
      .filter((s) => s.provider === selectedProvider && s.deviceId)
      .map((s) => s.deviceId as string);

    return Array.from(new Set(devicesFromSync));
  }, [providerStatus, selectedProvider]);

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId || (s as any)._id === selectedStaffId),
    [staffList, selectedStaffId]
  );

  const onSubmit = async (values: AddMappingFormValues) => {
    setConflictError(null);
    try {
      await createMutation.mutateAsync({
        staffId: values.staffId,
        provider: values.provider,
        deviceId: values.deviceId,
        externalEmployeeCode: values.externalEmployeeCode,
        notes: values.notes || undefined,
      });

      toast.success(
        `Staff mapping successfully created for ${
          selectedStaff?.name || "staff member"
        } (${values.externalEmployeeCode}).`
      );
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create staff device mapping.";

      if (status === 409) {
        setConflictError(message);
      } else {
        toast.error(message);
      }
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setConflictError(null);
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Map Staff to External Biometric ID</DialogTitle>
          <DialogDescription>
            Associate an internal salon employee with their unique biometric ID registered
            in the physical attendance provider hardware.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {conflictError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Mapping Conflict</p>
                <p className="text-xs">{conflictError}</p>
              </div>
            </div>
          )}

          {/* 1. Internal Staff Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Internal Staff Member <span className="text-destructive">*</span>
            </label>
            {defaultStaffId ? (
              <Input
                disabled
                value={selectedStaff ? `${selectedStaff.name} (${selectedStaff.staffCode})` : defaultStaffId}
                className="bg-muted"
              />
            ) : (
              <Select
                value={selectedStaffId || ""}
                onValueChange={(val) => {
                  setValue("staffId", val, { shouldValidate: true });
                  setConflictError(null);
                }}
                disabled={isLoadingStaff}
              >
                <SelectTrigger aria-label="Select Staff Member">
                  <SelectValue placeholder={isLoadingStaff ? "Loading staff..." : "Select staff member..."} />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s: any) => {
                    const sid = s.id || s._id;
                    return (
                      <SelectItem key={sid} value={sid}>
                        {s.name} ({s.staffCode}) - {s.role || "Staff"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {errors.staffId && (
              <p className="text-xs text-destructive">{errors.staffId.message}</p>
            )}
          </div>

          {/* 2. Provider Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Attendance Provider <span className="text-destructive">*</span>
            </label>
            <Select
              value={selectedProvider || "simulator"}
              onValueChange={(val) => {
                setValue("provider", val, { shouldValidate: true });
                setConflictError(null);
              }}
              disabled={isLoadingProviders}
            >
              <SelectTrigger aria-label="Select Attendance Provider">
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {supportedProviders.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === "simulator" ? "Simulator Adapter (Local / Testing)" : p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProvider === "eTimeOffice" && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                Notice: eTimeOffice live adapter is pending vendor API credentials. Mappings saved here will take effect once live sync is configured.
              </p>
            )}
            {errors.provider && (
              <p className="text-xs text-destructive">{errors.provider.message}</p>
            )}
          </div>

          {/* 3. Device Identifier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Device Identifier <span className="text-destructive">*</span>
              </label>
              {configuredDevices.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Configured: {configuredDevices.join(", ")}
                </span>
              )}
            </div>
            <Input
              {...register("deviceId")}
              placeholder="e.g. device-01, main-gate, biometric-terminal-1"
              aria-label="Device Identifier"
              onChange={(e) => {
                register("deviceId").onChange(e);
                setConflictError(null);
              }}
            />
            {errors.deviceId && (
              <p className="text-xs text-destructive">{errors.deviceId.message}</p>
            )}
          </div>

          {/* 4. External Employee ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              External Biometric Employee ID / Badge Code <span className="text-destructive">*</span>
            </label>
            <Input
              {...register("externalEmployeeCode")}
              placeholder="e.g. 101, EMP-8002, BIO-99"
              aria-label="External Biometric Employee ID"
              onChange={(e) => {
                register("externalEmployeeCode").onChange(e);
                setConflictError(null);
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the exact code programmed into the biometric machine for this staff member.
            </p>
            {errors.externalEmployeeCode && (
              <p className="text-xs text-destructive">
                {errors.externalEmployeeCode.message}
              </p>
            )}
          </div>

          {/* 5. Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes (Optional)
            </label>
            <Textarea
              {...register("notes")}
              placeholder="e.g. Registered during onboarding; device in Reception area"
              rows={2}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {/* Summary Confirmation */}
          {selectedStaff && selectedDeviceId && externalCode && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Mapping Summary</p>
              <p className="text-muted-foreground">
                Punch events matching biometric code <strong className="text-foreground">{externalCode}</strong> on{" "}
                <strong className="text-foreground">{selectedDeviceId}</strong> ({selectedProvider}) will resolve to internal staff member{" "}
                <strong className="text-foreground">{selectedStaff.name}</strong>.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Mapping"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
