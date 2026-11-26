"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProviderStatus } from "../api/attendance.api";
import { useUpsertProviderConfiguration } from "../hooks/useAttendance";

interface ProviderConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportedProviders: string[];
  initialConfig?: (ProviderStatus["configurations"][number] & { endpointUrl?: string }) | null;
}

export default function ProviderConfigurationDialog({
  open,
  onOpenChange,
  supportedProviders,
  initialConfig,
}: ProviderConfigurationDialogProps) {
  const [providerName, setProviderName] = useState(
    initialConfig?.providerName || supportedProviders[0] || "eTimeOffice",
  );
  const [integrationMethod, setIntegrationMethod] = useState<"webhook" | "polling" | "file">(
    (initialConfig?.integrationMethod as "webhook" | "polling" | "file") || "webhook",
  );
  const [endpointUrl, setEndpointUrl] = useState(initialConfig?.endpointUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isActive, setIsActive] = useState(initialConfig?.isActive ?? true);

  const upsertMutation = useUpsertProviderConfiguration();

  useEffect(() => {
    if (!open) return;
    setProviderName(initialConfig?.providerName || supportedProviders[0] || "eTimeOffice");
    setIntegrationMethod(
      (initialConfig?.integrationMethod as "webhook" | "polling" | "file") || "webhook",
    );
    setEndpointUrl(initialConfig?.endpointUrl || "");
    setApiKey("");
    setApiSecret("");
    setIsActive(initialConfig?.isActive ?? true);
  }, [open, initialConfig, supportedProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const credentials: Record<string, string> = {};
    if (apiKey.trim()) credentials.apiKey = apiKey.trim();
    if (apiSecret.trim()) credentials.apiSecret = apiSecret.trim();

    try {
      await upsertMutation.mutateAsync({
        providerName,
        payload: {
          integrationMethod,
          endpointUrl: endpointUrl.trim() || undefined,
          isActive,
          ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
        },
      });
      toast.success(`Saved ${providerName} configuration.`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save provider configuration.",
      );
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={initialConfig ? `Edit ${initialConfig.providerName} Configuration` : "Configure Attendance Provider"}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Set up a biometric or attendance provider for the active branch. Credentials are stored securely on the server and never returned.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider</label>
          <Select
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            disabled={Boolean(initialConfig)}
          >
            {(supportedProviders.length > 0 ? supportedProviders : ["eTimeOffice", "simulator"]).map(
              (provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ),
            )}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Integration Method</label>
          <Select
            value={integrationMethod}
            onChange={(e) =>
              setIntegrationMethod(e.target.value as "webhook" | "polling" | "file")
            }
          >
            <option value="webhook">Webhook (Push)</option>
            <option value="polling">Polling (Pull)</option>
            <option value="file">File Import</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Endpoint URL (optional for webhook)</label>
          <Input
            type="url"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://api.etimeoffice.com/api/..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">API Key / Username</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initialConfig ? "Leave blank to keep existing" : "Optional"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">API Secret / Password</label>
            <Input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={initialConfig ? "Leave blank to keep existing" : "Optional"}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span>Active for this branch</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
