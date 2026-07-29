"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomer } from "../hooks/useCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { useDeleteCustomer } from "../hooks/useDeleteCustomer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import CustomerForm from "./CustomerForm";
import { type CustomerFormValues } from "../schemas/customer.schema";
import CustomerDeleteDialog from "./CustomerDeleteDialog";
import Unauthorized from "@/components/layout/Unauthorized";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  FileText,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Building,
  Sparkles,
  Clock,
} from "lucide-react";

interface CustomerDetailsPageProps {
  customerId: string;
}

export default function CustomerDetailsPage({ customerId }: CustomerDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBranches } = useBranchContext();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "preferences" | "activity">("overview");
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = hasPermission(user, "customers.edit");
  const canDelete = hasPermission(user, "customers.delete");
  const canView = hasPermission(user, "customers.view");

  const { data: customer, isLoading, isError, error, refetch, isRefetching } = useCustomer(customerId);

  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleEditSubmit = (values: CustomerFormValues) => {
    updateMutation.mutate(
      { id: customerId, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          triggerAlert("success", "Customer profile updated successfully.");
        },
        onError: (err: Error) => {
          triggerAlert("error", err.message || "Failed to update customer.");
        },
      }
    );
  };

  const handleDeactivateConfirm = () => {
    deleteMutation.mutate(customerId, {
      onSuccess: () => {
        setIsDeactivateOpen(false);
        triggerAlert("success", "Customer profile deactivated successfully.");
        // Redirect back to list after short delay so user sees success feedback
        setTimeout(() => {
          router.back();
        }, 1000);
      },
      onError: (err: Error) => {
        setIsDeactivateOpen(false);
        triggerAlert("error", err.message || "Failed to deactivate customer.");
      },
    });
  };

  if (!canView) {
    return <Unauthorized />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-36 bg-muted rounded" />
        <div className="h-28 w-full bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 md:col-span-2 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    const errorObj = error as Record<string, unknown> | null;
    const responseObj = errorObj?.response as Record<string, unknown> | null;
    const status = (responseObj?.status as number | undefined) || (errorObj?.status as number | undefined);
    
    if (status === 403) {
      return <Unauthorized />;
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl p-8 max-w-md mx-auto mt-12 shadow-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Customer Not Found</h3>
        <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
          The requested customer profile could not be retrieved. It may have been deactivated or you may not have access.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft size={14} />
            Go Back
          </Button>
          <Button onClick={() => refetch()} className="flex items-center gap-1.5 cursor-pointer">
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const homeBranchName =
    availableBranches.find((b) => b.id === customer.homeBranchId)?.name ||
    customer.homeBranchId;

  const visitedBranchNames = customer.visitedBranchIds
    .map((id) => availableBranches.find((b) => b.id === id)?.name || id)
    .join(", ");

  const formatDOB = (dob?: string) => {
    if (!dob) return "Not provided";
    try {
      const date = new Date(dob);
      return isNaN(date.getTime())
        ? dob
        : date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
    } catch {
      return dob;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert message banner */}
      {alertMessage && (
        <div
          className={`p-3 rounded-lg border text-sm font-semibold animate-in fade-in duration-200 ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {alertMessage.text}
        </div>
      )}

      {/* Header with back trigger and primary actions */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Edit size={14} />
              Edit Profile
            </Button>
          )}
          {canDelete && customer.isActive && (
            <Button
              variant="destructive"
              onClick={() => setIsDeactivateOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Header Profile Identity summary block */}
      <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  customer.isActive
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {customer.isActive ? "Active" : "Deactivated"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building size={12} />
              Home branch: <span className="font-medium text-foreground">{homeBranchName}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Phone size={14} className="mr-2" />
              Call
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              <Mail size={14} className="mr-2" />
              Email
            </a>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation and Contents Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "notes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Internal Notes
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "activity"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Activity Log
            </button>
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeTab === "overview" && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  Identity & Contact Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                        Phone Number
                      </p>
                      <p className="text-sm font-medium mt-1.5">{customer.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                        Email Address
                      </p>
                      <p className="text-sm font-medium mt-1.5">{customer.email || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Heart size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                        Gender
                      </p>
                      <p className="text-sm font-medium mt-1.5">{customer.gender || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                        Date of Birth
                      </p>
                      <p className="text-sm font-medium mt-1.5">{formatDOB(customer.dateOfBirth)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                        Loyalty Points
                      </p>
                      <p className="text-sm font-medium mt-1.5">{customer.loyaltyPoints ?? 0} Points</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-6 border-t border-border/50">
                  <MapPin size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Physical Address
                    </p>
                    <p className="text-sm font-medium mt-1.5">{customer.address || "—"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-6 border-t border-border/50">
                  <Building size={16} className="text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Visited Branches
                    </p>
                    <p className="text-sm font-medium mt-1.5">
                      {visitedBranchNames || "No visits registered under other branches"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Heart size={18} className="text-primary" />
                  Service & Salon Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Preferred Staff
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {customer.preferences?.preferredStaff && customer.preferences.preferredStaff.length > 0 ? (
                        customer.preferences.preferredStaff.map((staff, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10"
                          >
                            {staff}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic mt-0.5">Not specified</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Drink Preference
                    </p>
                    <p className="text-sm font-medium mt-1.5">{customer.preferences?.drinkPreference || "Not specified"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Preferred Services
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {customer.preferences?.preferredServices && customer.preferences.preferredServices.length > 0 ? (
                        customer.preferences.preferredServices.map((service, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10"
                          >
                            {service}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic mt-0.5">None specified</p>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                      Remarks / Notes
                    </p>
                    <p className="text-sm text-foreground bg-muted/25 p-3 rounded-lg border border-border/50 mt-1.5 leading-relaxed">
                      {customer.preferences?.remarks || "No preferences remarks recorded."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notes" && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  Internal Staff Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {customer.notes ? (
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/60 whitespace-pre-wrap leading-relaxed">
                    {customer.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-6">
                    No notes recorded for this customer yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "activity" && (
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  Profile Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {customer.activityTimeline && customer.activityTimeline.length > 0 ? (
                  <div className="relative border-l border-border pl-6 ml-2 space-y-6">
                    {customer.activityTimeline.map((item) => {
                      const dateObj = new Date(item.date);
                      const displayDate = isNaN(dateObj.getTime())
                        ? item.date
                        : dateObj.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                      return (
                        <div key={item._id} className="relative group">
                          {/* Timeline dot marker */}
                          <span className="absolute -left-[31px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-primary/20 bg-background text-primary-foreground ring-4 ring-background">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 tracking-wide uppercase">
                                {item.action}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {displayDate}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-relaxed mt-1">
                              {item.description}
                            </p>
                            {item.performedBy && (
                              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                                System ID: <span className="text-foreground/80">{item.performedBy}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-6">
                    No activity records logged for this customer.
                  </p>
                )}
              </CardContent>
            </Card>
          )}


        </div>
      </div>

      {/* Edit Form Modal dialog */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Customer Details">
        <CustomerForm
          initialData={{
            name: customer.name,
            phone: customer.phone,
            email: customer.email || "",
            gender: customer.gender || "",
            dateOfBirth: customer.dateOfBirth || "",
            address: customer.address || "",
            notes: customer.notes || "",
          }}
          onSubmit={handleEditSubmit}
          isSubmitting={updateMutation.isPending}
          onCancel={() => setIsEditOpen(false)}
          submitLabel="Update Customer"
        />
      </Dialog>

      {/* Deactivate confirmation dialog */}
      <CustomerDeleteDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivateConfirm}
        isDeleting={deleteMutation.isPending}
        customerName={customer.name}
      />
    </div>
  );
}
