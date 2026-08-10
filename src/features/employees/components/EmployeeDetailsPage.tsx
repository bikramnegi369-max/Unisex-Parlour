"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useRestoreEmployee,
  useStaffBranches,
  useStaffServices,
  useAssignStaffBranch,
  useRemoveStaffBranch,
  useAssignStaffService,
  useAssignMultipleStaffServices,
  useRemoveStaffService,
  useLinkUserAccount,
  useUnlinkUserAccount,
} from "../hooks/useEmployees";
import type {
  EmployeePayload,
  StaffBranch,
  StaffService,
} from "../types/employee.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { EMPLOYEES_CONFIG } from "../config/employees.config";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EmployeeForm from "./EmployeeForm";
import EmployeeDeleteDialog from "./EmployeeDeleteDialog";
import EmployeeReactivateDialog from "./EmployeeReactivateDialog";
import Unauthorized from "@/components/layout/Unauthorized";
import { EmployeeProfileHeader } from "./EmployeeProfileHeader";
import { EmployeeOverview } from "./EmployeeOverview";
import {
  EntityProfileLayout,
  type ProfileTabItem,
} from "@/components/entity/EntityProfileLayout";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useServices } from "@/features/services/hooks/services/useServices";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  Building2,
  Scissors,
  UserCog,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Link2,
  Unlink,
  CheckSquare,
  Square,
  Search,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import UserSelector from "./UserSelector";
import { useUser } from "@/features/users/hooks/useUser";
import type { UserSummary } from "@/features/users/types/users.types";

interface EmployeeDetailsPageProps {
  employeeId: string;
}

export default function EmployeeDetailsPage({
  employeeId,
}: EmployeeDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();

  const { branches: allBranches, isLoading: isLoadingAllBranches } =
    useBranches();
  const { data: allServicesData, isLoading: isLoadingAllServices } =
    useServices({ limit: 100 });
  const allServices = useMemo(
    () => allServicesData?.data || [],
    [allServicesData],
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabItem["id"]>("overview");

  // Local state for branch dropdown
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [isPrimaryChecked, setIsPrimaryChecked] = useState(false);

  // Local state for multi-service selection
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");

  const [selectedUserSummary, setSelectedUserSummary] =
    useState<UserSummary | null>(null);

  // Confirmation dialog states
  const [branchToRemove, setBranchToRemove] = useState<StaffBranch | null>(
    null,
  );
  const [serviceToRemove, setServiceToRemove] = useState<StaffService | null>(
    null,
  );

  const canEdit = hasPermission(user, EMPLOYEES_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, EMPLOYEES_CONFIG.permissions.delete);
  const canView = hasPermission(user, EMPLOYEES_CONFIG.permissions.view);
  const canAssignBranch = hasPermission(
    user,
    EMPLOYEES_CONFIG.permissions.assignBranch,
  );
  const canAssignService = hasPermission(
    user,
    EMPLOYEES_CONFIG.permissions.assignService,
  );
  const canLinkUser = hasPermission(user, EMPLOYEES_CONFIG.permissions.edit);

  const {
    data: employee,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useEmployee(employeeId);
  const { data: linkedUser } = useUser(employee?.userId ?? null);
  const {
    data: staffBranches,
    isLoading: isLoadingBranches,
    isError: isErrorBranches,
    refetch: refetchBranches,
  } = useStaffBranches(employeeId);
  const {
    data: staffServices,
    isLoading: isLoadingServices,
    isError: isErrorServices,
    refetch: refetchServices,
  } = useStaffServices(employeeId);

  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const reactivateMutation = useRestoreEmployee();
  const assignBranchMutation = useAssignStaffBranch();
  const removeBranchMutation = useRemoveStaffBranch();
  const assignServiceMutation = useAssignStaffService();
  const assignMultipleServicesMutation = useAssignMultipleStaffServices();
  const removeServiceMutation = useRemoveStaffService();
  const linkUserMutation = useLinkUserAccount();
  const unlinkUserMutation = useUnlinkUserAccount();

  const handleEditSubmit = (values: EmployeePayload) => {
    updateMutation.mutate(
      { id: employeeId, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          toast.success("Employee profile updated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update employee.");
        },
      },
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(employeeId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        toast.success("Employee profile deactivated successfully.");
        setTimeout(() => {
          router.push("/employees");
        }, 800);
      },
      onError: (err: Error) => {
        setIsDeactivateOpen(false);
        toast.error(err.message || "Failed to deactivate employee.");
      },
    });
  };

  const handleReactivateConfirm = () => {
    reactivateMutation.mutate(employeeId, {
      onSuccess: () => {
        setIsReactivateOpen(false);
        reactivateMutation.reset();
        toast.success("Employee profile reactivated successfully.");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to reactivate employee.");
      },
    });
  };

  const handleAssignBranch = () => {
    if (!selectedBranchId) return;
    assignBranchMutation.mutate(
      {
        id: employeeId,
        branchId: selectedBranchId,
        isPrimary: isPrimaryChecked,
      },
      {
        onSuccess: () => {
          setSelectedBranchId("");
          setBranchSearchQuery("");
          setIsPrimaryChecked(false);
          setShowBranchDropdown(false);
          toast.success("Branch assigned successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to assign branch.");
        },
      },
    );
  };

  const handleRemoveBranchConfirm = () => {
    if (!branchToRemove) return;
    removeBranchMutation.mutate(
      { id: employeeId, branchId: branchToRemove.branchId?._id },
      {
        onSuccess: () => {
          setBranchToRemove(null);
          toast.success("Branch assignment removed successfully.");
        },
        onError: (err: Error) => {
          setBranchToRemove(null);
          toast.error(err.message || "Failed to remove branch assignment.");
        },
      },
    );
  };

  // Multi-service selection handlers
  const handleToggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleAssignMultipleServices = () => {
    if (selectedServiceIds.length === 0) return;
    assignMultipleServicesMutation.mutate(
      { id: employeeId, serviceIds: selectedServiceIds },
      {
        onSuccess: () => {
          setSelectedServiceIds([]);
          setServiceSearchQuery("");
          toast.success(
            `${selectedServiceIds.length} service capabilities assigned successfully.`,
          );
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to assign service capabilities.");
        },
      },
    );
  };

  const handleRemoveServiceConfirm = () => {
    if (!serviceToRemove) return;
    removeServiceMutation.mutate(
      { id: employeeId, serviceId: serviceToRemove.serviceId?._id },
      {
        onSuccess: () => {
          setServiceToRemove(null);
          toast.success("Service capability mapping removed successfully.");
        },
        onError: (err: Error) => {
          setServiceToRemove(null);
          toast.error(err.message || "Failed to remove service capability.");
        },
      },
    );
  };

  const handleLinkUser = () => {
    if (!selectedUserSummary?.id) {
      toast.error("Please select a user from the search results.");
      return;
    }
    linkUserMutation.mutate(
      { id: employeeId, userId: selectedUserSummary.id },
      {
        onSuccess: () => {
          setSelectedUserSummary(null);
          toast.success("User account linked successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to link user account.");
        },
      },
    );
  };

  const handleUnlinkUser = () => {
    unlinkUserMutation.mutate(employeeId, {
      onSuccess: () => {
        toast.success("User account unlinked successfully.");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to unlink user account.");
      },
    });
  };

  // Branch & Service filter calculations
  const assignedBranchIds = useMemo(
    () => (staffBranches || []).map((sb) => sb.branchId?._id),
    [staffBranches],
  );
  const assignableBranches = useMemo(
    () => (allBranches || []).filter((b) => !assignedBranchIds.includes(b.id)),
    [allBranches, assignedBranchIds],
  );
  const filteredBranches = useMemo(
    () =>
      assignableBranches.filter((b) =>
        b.name.toLowerCase().includes(branchSearchQuery.toLowerCase()),
      ),
    [assignableBranches, branchSearchQuery],
  );

  const assignedServiceIds = useMemo(
    () => (staffServices || []).map((ss) => ss.serviceId?._id),
    [staffServices],
  );
  const assignableServices = useMemo(
    () => allServices.filter((s) => !assignedServiceIds.includes(s.id)),
    [allServices, assignedServiceIds],
  );
  const filteredServices = useMemo(
    () =>
      assignableServices.filter((s) =>
        s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()),
      ),
    [assignableServices, serviceSearchQuery],
  );

  const branchCount = staffBranches?.length ?? 0;
  const serviceCount = staffServices?.length ?? 0;
  const hasLinkedAccount = Boolean(employee?.userId || linkedUser);

  // Dynamic Profile Tabs with Icons & Badge Counters
  const tabs: ProfileTabItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <User size={15} /> },
      {
        id: "branches",
        label: "Branches",
        icon: <Building2 size={15} />,
        badge: branchCount,
      },
      {
        id: "services",
        label: "Service Capabilities",
        icon: <Scissors size={15} />,
        badge: serviceCount,
      },
      {
        id: "account",
        label: "User Account",
        icon: <UserCog size={15} />,
        badge: hasLinkedAccount ? "Linked" : "Unlinked",
      },
    ],
    [branchCount, serviceCount, hasLinkedAccount],
  );

  if (!canView) {
    return <Unauthorized />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="h-9 w-36 bg-muted rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg" />
            <div className="h-9 w-28 bg-muted rounded-lg" />
          </div>
        </div>
        <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    const errorObj = error as Record<string, unknown> | null;
    const responseObj = errorObj?.response as Record<string, unknown> | null;
    const status =
      (responseObj?.status as number | undefined) ||
      (errorObj?.status as number | undefined);

    if (status === 403) {
      return <Unauthorized />;
    }
    return (
      <ErrorState
        title="Failed to Load Profile"
        description="The employee record could not be retrieved. Please check your connection and try again."
        retryAction={{
          label: "Try Reconnecting",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header with Reliable Back Navigation */}
      <EmployeeProfileHeader
        employee={employee}
        canEdit={canEdit}
        canDelete={canDelete}
        onBack={() => router.push("/employees")}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => setIsDeactivateOpen(true)}
        onReactivate={() => setIsReactivateOpen(true)}
      />

      {/* Aligned Tabbed Layout Composition */}
      <EntityProfileLayout
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "overview" && (
          <EmployeeOverview
            employee={employee}
            isLinkedAccount={hasLinkedAccount}
            branchCount={branchCount}
            serviceCount={serviceCount}
          />
        )}

        {activeTab === "branches" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6 min-w-0">
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-foreground break-words">
                      Branch Assignments
                    </h3>
                    <p className="text-xs text-muted-foreground break-words">
                      Assign workplace locations where this staff member is
                      authorized to serve.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="font-bold text-xs shrink-0 self-start sm:self-center"
                >
                  {branchCount} {branchCount === 1 ? "Branch" : "Branches"}
                </Badge>
              </div>

              {/* Branch Assignment Picker */}
              {canAssignBranch && assignableBranches.length > 0 && (
                <div className="p-4 rounded-2xl border border-border bg-muted/10 max-w-2xl space-y-4 text-left shadow-2xs">
                  <div className="space-y-1 relative">
                    <label
                      htmlFor="branch-search-combobox"
                      className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block"
                    >
                      Search and Select Branch Location
                    </label>
                    <div className="relative">
                      <Input
                        id="branch-search-combobox"
                        placeholder="Type branch location name..."
                        value={branchSearchQuery}
                        onChange={(e) => {
                          setBranchSearchQuery(e.target.value);
                          setShowBranchDropdown(true);
                        }}
                        onFocus={() => setShowBranchDropdown(true)}
                        disabled={assignBranchMutation.isPending}
                        className="w-full text-xs h-10"
                      />
                      {showBranchDropdown && branchSearchQuery && (
                        <div className="absolute z-20 w-full bg-card border border-border shadow-xl rounded-xl mt-1.5 max-h-52 overflow-y-auto p-1">
                          {filteredBranches.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-3 text-center">
                              No matching branches found.
                            </p>
                          ) : (
                            filteredBranches.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted focus:bg-muted focus:outline-none transition-colors rounded-lg flex flex-col gap-0.5"
                                onClick={() => {
                                  setSelectedBranchId(b.id);
                                  setBranchSearchQuery(b.name);
                                  setShowBranchDropdown(false);
                                }}
                              >
                                <span className="font-bold text-foreground">
                                  {b.name}
                                </span>
                                {b.address && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {b.address}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Option Toggle */}
                  {selectedBranchId && (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <input
                          id="is-primary-checkbox"
                          type="checkbox"
                          checked={isPrimaryChecked}
                          onChange={(e) =>
                            setIsPrimaryChecked(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor="is-primary-checkbox"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Make this the primary branch location
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleAssignBranch}
                      disabled={
                        !selectedBranchId || assignBranchMutation.isPending
                      }
                      className="h-9 px-5 cursor-pointer font-bold shadow-xs"
                    >
                      {assignBranchMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Assign Branch"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingBranches || isLoadingAllBranches ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-24 bg-muted animate-pulse rounded-xl" />
                  <div className="h-24 bg-muted animate-pulse rounded-xl" />
                </div>
              ) : isErrorBranches ? (
                <div className="flex flex-col items-center justify-center p-6 border border-destructive/20 bg-destructive/5 rounded-xl text-center space-y-3">
                  <AlertCircle className="text-destructive h-8 w-8" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Retrieval Failed
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Could not fetch branch mappings.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchBranches()}
                  >
                    Retry
                  </Button>
                </div>
              ) : !staffBranches || staffBranches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl">
                  <Building2 className="h-9 w-9 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-bold text-foreground">
                    No branches assigned
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign a branch location to define this staff member&apos;s
                    workplace.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {staffBranches.map((sb) => (
                    <div
                      key={sb._id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all bg-card ${
                        sb.isPrimary
                          ? "border-primary/50 ring-1 ring-primary/20 shadow-sm"
                          : "border-border/80 shadow-2xs"
                      }`}
                    >
                      <div className="space-y-1 text-left min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground break-words">
                            {sb.branchId?.name}
                          </h4>
                          {sb.isPrimary && (
                            <Badge
                              variant="success"
                              className="shrink-0 text-[10px]"
                            >
                              ★ Primary Branch
                            </Badge>
                          )}
                        </div>
                        {sb.branchId?.phone && (
                          <p className="text-xs text-muted-foreground break-all">
                            {sb.branchId.phone}
                          </p>
                        )}
                        {sb.branchId?.address && (
                          <p className="text-[11px] text-muted-foreground break-words">
                            {sb.branchId.address}
                          </p>
                        )}
                      </div>

                      {canAssignBranch && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBranchToRemove(sb)}
                            disabled={removeBranchMutation.isPending}
                            className="h-8 text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Capabilities Tab: Multi-Service Assignment Support */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6 min-w-0">
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-foreground break-words">
                      Service Capabilities
                    </h3>
                    <p className="text-xs text-muted-foreground break-words">
                      Assign multiple services this staff member is trained to
                      perform.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="font-bold text-xs shrink-0 self-start sm:self-center"
                >
                  {serviceCount}{" "}
                  {serviceCount === 1 ? "Capability" : "Capabilities"}
                </Badge>
              </div>

              {/* Multi-Service Assignment Picker */}
              {canAssignService && assignableServices.length > 0 && (
                <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 max-w-2xl space-y-4 text-left shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                        Assign Multiple Service Capabilities
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Select one or multiple services from the catalog to
                        assign simultaneously.
                      </p>
                    </div>
                    {selectedServiceIds.length > 0 && (
                      <Badge
                        variant="success"
                        className="gap-1 font-bold text-xs"
                      >
                        <Sparkles className="h-3 w-3" />
                        {selectedServiceIds.length} Selected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search unassigned services..."
                        value={serviceSearchQuery}
                        onChange={(e) => {
                          setServiceSearchQuery(e.target.value);
                        }}
                        disabled={assignMultipleServicesMutation.isPending}
                        className="w-full text-xs h-9 pl-9 pr-8"
                      />
                      {serviceSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setServiceSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Multi-Select Service Candidate List */}
                    <div className="max-h-60 overflow-y-auto border border-border/80 rounded-xl bg-card p-1 divide-y divide-border/40 shadow-inner">
                      {filteredServices.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-4 text-center">
                          {serviceSearchQuery
                            ? `No services matching "${serviceSearchQuery}".`
                            : "All catalog services are already assigned!"}
                        </p>
                      ) : (
                        filteredServices.map((service) => {
                          const isChecked = selectedServiceIds.includes(
                            service.id,
                          );
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() =>
                                handleToggleServiceSelection(service.id)
                              }
                              className={`flex items-center justify-between w-full p-2.5 text-left text-xs transition-colors rounded-lg ${
                                isChecked
                                  ? "bg-purple-500/10 text-foreground font-semibold"
                                  : "hover:bg-muted/70 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isChecked ? (
                                  <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">
                                    {service.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {service.duration} mins • Base Price: ₹
                                    {service.pricing?.basePrice}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[9px] capitalize shrink-0 ml-2"
                              >
                                {typeof service.categoryId === "object" &&
                                service.categoryId !== null
                                  ? service.categoryId.name
                                  : "General"}
                              </Badge>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-purple-500/10">
                    <div className="text-xs text-muted-foreground">
                      {selectedServiceIds.length === 0 ? (
                        <span>Check services above to select multiple.</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedServiceIds([])}
                          className="text-xs font-semibold text-destructive hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <Button
                      onClick={handleAssignMultipleServices}
                      disabled={
                        selectedServiceIds.length === 0 ||
                        assignMultipleServicesMutation.isPending
                      }
                      className="h-9 px-5 cursor-pointer font-bold gap-1.5 shadow-sm"
                    >
                      {assignMultipleServicesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Assign Selected Services ({selectedServiceIds.length})
                    </Button>
                  </div>
                </div>
              )}

              {/* Assigned Services Capability Cards */}
              {isLoadingServices || isLoadingAllServices ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-20 bg-muted animate-pulse rounded-xl" />
                  <div className="h-20 bg-muted animate-pulse rounded-xl" />
                </div>
              ) : isErrorServices ? (
                <div className="flex flex-col items-center justify-center p-6 border border-destructive/20 bg-destructive/5 rounded-xl text-center space-y-3">
                  <AlertCircle className="text-destructive h-8 w-8" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Retrieval Failed
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Could not fetch service mappings.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchServices()}
                  >
                    Retry
                  </Button>
                </div>
              ) : !staffServices || staffServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl">
                  <Scissors className="h-9 w-9 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-bold text-foreground">
                    No service capabilities assigned
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select and assign multiple services this staff member can
                    perform.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {staffServices.map((ss) => (
                    <div
                      key={ss._id}
                      className="p-4 rounded-2xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all bg-card shadow-2xs"
                    >
                      <div className="space-y-1 text-left min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-foreground break-words">
                          {ss.serviceId?.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium">
                            {ss.serviceId?.duration} mins
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">
                            ₹{ss.serviceId?.pricing?.basePrice}
                          </span>
                        </div>
                      </div>

                      {canAssignService && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setServiceToRemove(ss)}
                          disabled={removeServiceMutation.isPending}
                          className="h-8 text-xs font-semibold shrink-0 self-end sm:self-center cursor-pointer"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      User Account Linkage
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage authentication account connection for staff portal
                      access.
                    </p>
                  </div>
                </div>
              </div>

              {employee.userId ? (
                <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-5 max-w-2xl text-left shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="success"
                        className="gap-1.5 px-3 py-1 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Account Connected
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
                        {(linkedUser?.name || employee.name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          {linkedUser?.name || employee.name}
                        </h4>
                        {linkedUser?.username && (
                          <p className="text-xs text-muted-foreground font-mono">
                            @{linkedUser.username}
                          </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                          {(linkedUser?.email || employee.email) && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">
                                {linkedUser?.email || employee.email}
                              </span>
                            </span>
                          )}
                          {(linkedUser?.phone || employee.phone) && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>{linkedUser?.phone || employee.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {canLinkUser && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="destructive"
                        onClick={handleUnlinkUser}
                        disabled={unlinkUserMutation.isPending}
                        className="h-9 px-4 cursor-pointer font-semibold flex items-center gap-2 shadow-xs"
                      >
                        {unlinkUserMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4" />
                        )}
                        Unlink User Account
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 text-left max-w-2xl">
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                    <UserCog className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold">No Login Account Linked</p>
                      <p>
                        This employee record is currently unlinked. Linking a
                        user account grants this employee access to sign in to
                        the parlour management application.
                      </p>
                    </div>
                  </div>

                  {canLinkUser && (
                    <div className="space-y-4 p-5 rounded-2xl border border-border bg-muted/10 shadow-2xs">
                      <UserSelector
                        onSelect={(user) => setSelectedUserSummary(user)}
                        onClear={() => setSelectedUserSummary(null)}
                        disabled={linkUserMutation.isPending}
                      />
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleLinkUser}
                          disabled={
                            !selectedUserSummary?.id ||
                            linkUserMutation.isPending
                          }
                          className="h-10 px-6 cursor-pointer font-bold gap-2 shadow-sm"
                        >
                          {linkUserMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                          Link User Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </EntityProfileLayout>

      {/* Edit Profile Modal Dialog */}
      {isEditOpen && (
        <Dialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Update Employee Details"
        >
          <EmployeeForm
            initialEmployee={employee}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Update Employee"
            error={updateMutation.error}
          />
        </Dialog>
      )}

      {/* Delete/Deactivate Dialog */}
      {isDeactivateOpen && (
        <EmployeeDeleteDialog
          isOpen={isDeactivateOpen}
          onClose={() => setIsDeactivateOpen(false)}
          onConfirm={handleDeactivateConfirm}
          isDeleting={deleteMutation.isPending}
          employeeName={employee.name}
        />
      )}

      {/* Reactivate Dialog */}
      {isReactivateOpen && (
        <EmployeeReactivateDialog
          isOpen={isReactivateOpen}
          onClose={() => {
            setIsReactivateOpen(false);
            reactivateMutation.reset();
          }}
          onConfirm={handleReactivateConfirm}
          isLoading={reactivateMutation.isPending}
          error={reactivateMutation.error}
          employeeName={employee.name}
        />
      )}

      {/* Branch Removal Confirmation Dialog */}
      {branchToRemove && (
        <Dialog
          isOpen={!!branchToRemove}
          onClose={() => setBranchToRemove(null)}
          title="Remove Branch Assignment?"
        >
          <div className="space-y-4 text-left p-1">
            <p className="text-sm text-foreground">
              Are you sure you want to remove the assignment for{" "}
              <span className="font-bold">
                &ldquo;{branchToRemove.branchId?.name}&rdquo;
              </span>
              ?
            </p>
            {branchToRemove.isPrimary && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-bold">
                  ★ Warning: This is the current primary branch.
                </p>
                <p className="mt-1">
                  The oldest remaining active branch assignment will
                  automatically be promoted to primary by the server transaction
                  rules.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setBranchToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveBranchConfirm}>
                Remove Assignment
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Service Removal Confirmation Dialog */}
      {serviceToRemove && (
        <Dialog
          isOpen={!!serviceToRemove}
          onClose={() => setServiceToRemove(null)}
          title="Remove Service Capability?"
        >
          <div className="space-y-4 text-left p-1">
            <p className="text-sm text-foreground">
              Are you sure you want to remove{" "}
              <span className="font-bold">
                &ldquo;{serviceToRemove.serviceId?.name}&rdquo;
              </span>{" "}
              from this staff member&apos;s service capabilities?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={() => setServiceToRemove(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveServiceConfirm}
              >
                Remove Capability
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
