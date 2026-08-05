"use client";

import React, { useState } from "react";
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
  useRemoveStaffService,
  useLinkUserAccount,
  useUnlinkUserAccount,
} from "../hooks/useEmployees";
import type { EmployeePayload, StaffBranch, StaffService } from "../types/employee.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
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
import { EntityProfileLayout, type ProfileTabItem } from "@/components/entity/EntityProfileLayout";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useServices } from "@/features/services/hooks/services/useServices";
import { toast } from "sonner";
import { Loader2, AlertCircle, Building2, Scissors, UserCog } from "lucide-react";

interface EmployeeDetailsPageProps {
  employeeId: string;
}

const TABS: ProfileTabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "branches", label: "Branches" },
  { id: "services", label: "Service Capabilities" },
  { id: "account", label: "User Account" },
];

export default function EmployeeDetailsPage({ employeeId }: EmployeeDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const { branches: allBranches, isLoading: isLoadingAllBranches } = useBranches();
  const { data: allServicesData, isLoading: isLoadingAllServices } = useServices({ limit: 100 });
  const allServices = allServicesData?.data || [];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabItem["id"]>("overview");
  
  // Local state for dropdown selectors / inputs
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [isPrimaryChecked, setIsPrimaryChecked] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const [userIdInput, setUserIdInput] = useState("");

  // Confirmation dialog states
  const [branchToRemove, setBranchToRemove] = useState<StaffBranch | null>(null);
  const [serviceToRemove, setServiceToRemove] = useState<StaffService | null>(null);

  const canEdit = hasPermission(user, "employees.edit");
  const canDelete = hasPermission(user, "employees.delete");
  const canView = hasPermission(user, "employees.view");
  const canAssignBranch = hasPermission(user, "employees.assign_branch");
  const canAssignService = hasPermission(user, "employees.assign_service");
  const canLinkUser = hasPermission(user, "employees.update");

  const { data: employee, isLoading, isError, refetch, isRefetching } = useEmployee(employeeId);
  const { data: staffBranches, isLoading: isLoadingBranches, isError: isErrorBranches, refetch: refetchBranches } = useStaffBranches(employeeId);
  const { data: staffServices, isLoading: isLoadingServices, isError: isErrorServices, refetch: refetchServices } = useStaffServices(employeeId);

  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const reactivateMutation = useRestoreEmployee();
  const assignBranchMutation = useAssignStaffBranch();
  const removeBranchMutation = useRemoveStaffBranch();
  const assignServiceMutation = useAssignStaffService();
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
      }
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(employeeId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        toast.success("Employee profile deactivated successfully.");
        setTimeout(() => {
          router.back();
        }, 1000);
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
      { id: employeeId, branchId: selectedBranchId, isPrimary: isPrimaryChecked },
      {
        onSuccess: () => {
          setSelectedBranchId("");
          setBranchSearchQuery("");
          setIsPrimaryChecked(false);
          toast.success("Branch assigned successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to assign branch.");
        },
      }
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
      }
    );
  };

  const handleAssignService = () => {
    if (!selectedServiceId) return;
    assignServiceMutation.mutate(
      { id: employeeId, serviceId: selectedServiceId },
      {
        onSuccess: () => {
          setSelectedServiceId("");
          setServiceSearchQuery("");
          toast.success("Service capability assigned successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to assign service capability.");
        },
      }
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
      }
    );
  };

  const handleLinkUser = () => {
    if (!userIdInput.trim() || userIdInput.trim().length !== 24) {
      toast.error("Please enter a valid 24-character User ID.");
      return;
    }
    linkUserMutation.mutate(
      { id: employeeId, userId: userIdInput.trim() },
      {
        onSuccess: () => {
          setUserIdInput("");
          toast.success("User account linked successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to link user account.");
        },
      }
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
        <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
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

  // Filter out already assigned branches and services
  const assignedBranchIds = (staffBranches || []).map((sb) => sb.branchId?._id);
  const assignableBranches = (allBranches || []).filter((b) => !assignedBranchIds.includes(b.id));
  const filteredBranches = assignableBranches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  const assignedServiceIds = (staffServices || []).map((ss) => ss.serviceId?._id);
  const assignableServices = allServices.filter((s) => !assignedServiceIds.includes(s.id));
  const filteredServices = assignableServices.filter((s) =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <EmployeeProfileHeader
        employee={employee}
        canEdit={canEdit}
        canDelete={canDelete}
        onBack={() => router.back()}
        onEdit={() => setIsEditOpen(true)}
        onDeactivate={() => setIsDeactivateOpen(true)}
        onReactivate={() => setIsReactivateOpen(true)}
      />

      {/* Tabbed Layout Composition */}
      <EntityProfileLayout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "overview" && (
          <EmployeeOverview
            employee={employee}
          />
        )}

        {activeTab === "branches" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="text-primary h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">Branch Assignments</h3>
                </div>
              </div>

              {/* Branch Assignment Searchable Select Picker */}
              {canAssignBranch && assignableBranches.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-muted/5 max-w-xl space-y-4 text-left">
                  <div className="space-y-1 relative">
                    <label htmlFor="branch-search-combobox" className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Search and Select Branch Location
                    </label>
                    <div className="relative">
                      <Input
                        id="branch-search-combobox"
                        placeholder="Type branch name..."
                        value={branchSearchQuery}
                        onChange={(e) => {
                          setBranchSearchQuery(e.target.value);
                          setShowBranchDropdown(true);
                        }}
                        onFocus={() => setShowBranchDropdown(true)}
                        disabled={assignBranchMutation.isPending}
                        className="w-full text-xs"
                      />
                      {showBranchDropdown && branchSearchQuery && (
                        <div className="absolute z-10 w-full bg-card border border-border shadow-lg rounded-lg mt-1 max-h-48 overflow-y-auto">
                          {filteredBranches.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-3">No matching branches found.</p>
                          ) : (
                            filteredBranches.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                                onClick={() => {
                                  setSelectedBranchId(b.id);
                                  setBranchSearchQuery(b.name);
                                  setShowBranchDropdown(false);
                                }}
                              >
                                <span className="font-bold">{b.name}</span>
                                {b.address && <span className="text-[10px] text-muted-foreground block truncate">{b.address}</span>}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Option Toggle */}
                  {selectedBranchId && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          id="is-primary-checkbox"
                          type="checkbox"
                          checked={isPrimaryChecked}
                          onChange={(e) => setIsPrimaryChecked(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="is-primary-checkbox" className="text-xs font-semibold text-foreground cursor-pointer">
                          Make this the primary branch
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-6">
                        Assigning this location as primary will automatically demote the current primary assignment on the server.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleAssignBranch}
                      disabled={!selectedBranchId || assignBranchMutation.isPending}
                      className="h-9 px-5 cursor-pointer font-semibold"
                    >
                      {assignBranchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Branch"}
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
                    <h4 className="text-sm font-bold text-foreground">Retrieval Failed</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Could not fetch branch mappings.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchBranches()}>
                    Retry
                  </Button>
                </div>
              ) : !staffBranches || staffBranches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                  <Building2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No branches assigned</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Assign a branch to define this staff member&apos;s workplace.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffBranches.map((sb) => (
                    <div
                      key={sb._id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all bg-card ${
                        sb.isPrimary ? "border-primary/50 ring-1 ring-primary/20 shadow-sm" : "border-border/80"
                      }`}
                    >
                      <div className="space-y-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground truncate">{sb.branchId?.name}</h4>
                          {sb.isPrimary && <Badge variant="success">★ Primary Branch</Badge>}
                        </div>
                        {sb.branchId?.phone && <p className="text-xs text-muted-foreground">{sb.branchId.phone}</p>}
                        {sb.branchId?.address && <p className="text-[10px] text-muted-foreground truncate">{sb.branchId.address}</p>}
                      </div>

                      {canAssignBranch && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBranchToRemove(sb)}
                            disabled={removeBranchMutation.isPending}
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

        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div className="flex items-center gap-2">
                  <Scissors className="text-primary h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">Service Capabilities</h3>
                </div>
              </div>

              {/* Service Assignment Searchable Select Picker */}
              {canAssignService && assignableServices.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-muted/5 max-w-xl space-y-4 text-left">
                  <div className="space-y-1 relative">
                    <label htmlFor="service-search-combobox" className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Search and Select Service Specialty
                    </label>
                    <div className="relative">
                      <Input
                        id="service-search-combobox"
                        placeholder="Type service name..."
                        value={serviceSearchQuery}
                        onChange={(e) => {
                          setServiceSearchQuery(e.target.value);
                          setShowServiceDropdown(true);
                        }}
                        onFocus={() => setShowServiceDropdown(true)}
                        disabled={assignServiceMutation.isPending}
                        className="w-full text-xs"
                      />
                      {showServiceDropdown && serviceSearchQuery && (
                        <div className="absolute z-10 w-full bg-card border border-border shadow-lg rounded-lg mt-1 max-h-48 overflow-y-auto">
                          {filteredServices.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-3">No matching services found.</p>
                          ) : (
                            filteredServices.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                                onClick={() => {
                                  setSelectedServiceId(s.id);
                                  setServiceSearchQuery(s.name);
                                  setShowServiceDropdown(false);
                                }}
                              >
                                <span className="font-bold">{s.name}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {s.duration} mins • Base Price: ₹{s.pricing?.basePrice}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleAssignService}
                      disabled={!selectedServiceId || assignServiceMutation.isPending}
                      className="h-9 px-5 cursor-pointer font-semibold"
                    >
                      {assignServiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Service"}
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingServices || isLoadingAllServices ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-20 bg-muted animate-pulse rounded-xl" />
                  <div className="h-20 bg-muted animate-pulse rounded-xl" />
                </div>
              ) : isErrorServices ? (
                <div className="flex flex-col items-center justify-center p-6 border border-destructive/20 bg-destructive/5 rounded-xl text-center space-y-3">
                  <AlertCircle className="text-destructive h-8 w-8" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Retrieval Failed</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Could not fetch service mappings.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchServices()}>
                    Retry
                  </Button>
                </div>
              ) : !staffServices || staffServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                  <Scissors className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No service capabilities assigned</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Assign services this staff member is trained to perform.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffServices.map((ss) => (
                    <div
                      key={ss._id}
                      className="p-4 rounded-xl border border-border/80 flex items-center justify-between gap-4 transition-all bg-card"
                    >
                      <div className="space-y-1 text-left min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{ss.serviceId?.name}</h4>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span>{ss.serviceId?.duration} mins</span>
                          <span>•</span>
                          <span>Base Price: ₹{ss.serviceId?.pricing?.basePrice}</span>
                        </div>
                      </div>

                      {canAssignService && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setServiceToRemove(ss)}
                          disabled={removeServiceMutation.isPending}
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
            <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div className="flex items-center gap-2">
                  <UserCog className="text-primary h-5 w-5" />
                  <h3 className="font-bold text-base text-foreground">User Account Linkage</h3>
                </div>
              </div>

              {employee.userId ? (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 max-w-xl text-left">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">Linked User Account Profile</h4>
                    <p className="text-xs text-muted-foreground">This staff member is associated with user ID:</p>
                    <code className="text-xs font-mono bg-background border border-border rounded px-2 py-1 block w-max select-all font-semibold text-foreground mt-2">
                      {employee.userId}
                    </code>
                  </div>

                  {canLinkUser && (
                    <Button
                      variant="destructive"
                      onClick={handleUnlinkUser}
                      disabled={unlinkUserMutation.isPending}
                      className="h-10 px-5 cursor-pointer font-semibold flex items-center gap-1.5"
                    >
                      {unlinkUserMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Unlink User Account
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl mb-4">
                    <UserCog className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-semibold text-muted-foreground">No account linked</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This staff member cannot sign in until a User account is linked.</p>
                  </div>

                  {canLinkUser && (
                    <div className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-xl border border-border bg-muted/5 max-w-xl">
                      <div className="flex-1 space-y-1">
                        <label htmlFor="user-id-input" className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                          Enter User Object ID
                        </label>
                        <Input
                          id="user-id-input"
                          placeholder="e.g. 64b0f9c2d15b2c001f3e79ff"
                          value={userIdInput}
                          onChange={(e) => setUserIdInput(e.target.value)}
                          maxLength={24}
                          disabled={linkUserMutation.isPending}
                        />
                      </div>
                      <Button
                        onClick={handleLinkUser}
                        disabled={!userIdInput.trim() || linkUserMutation.isPending}
                        className="h-10 px-5 cursor-pointer font-semibold"
                      >
                        {linkUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Account"}
                      </Button>
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
        <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Employee Details">
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
              Are you sure you want to remove the assignment for <span className="font-bold">&ldquo;{branchToRemove.branchId?.name}&rdquo;</span>?
            </p>
            {branchToRemove.isPrimary && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-bold">★ Warning: This is the current primary branch.</p>
                <p className="mt-1">
                  The oldest remaining active branch assignment will automatically be promoted to primary by the server transaction rules.
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
              Are you sure you want to remove <span className="font-bold">&ldquo;{serviceToRemove.serviceId?.name}&rdquo;</span> from this staff member&apos;s service capabilities?
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => setServiceToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveServiceConfirm}>
                Remove Capability
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
