"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { downloadExport } from "../api/settings.api";
import { useBackupStatus, useExports, useRequestExport } from "../hooks/useSettings";
import type { ExportDomain, ExportFormat, ExportJobDTO } from "../types/settings.types";

const DOMAINS: Array<{ value: ExportDomain; label: string }> = [
  { value: "staff", label: "Staff" },
  { value: "customers", label: "Customers" },
  { value: "appointments", label: "Appointments" },
  { value: "attendance", label: "Attendance" },
  { value: "leaves", label: "Leaves" },
];

export function ExportsPanel() {
  const [domain, setDomain] = useState<ExportDomain>("staff");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: exportsList = [], isLoading } = useExports();
  const { data: backupStatus } = useBackupStatus();
  const requestExportMutation = useRequestExport();

  const handleRequestExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await requestExportMutation.mutateAsync({ domain, format });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate export.";
      setActionError(message);
    }
  };

  const handleDownload = async (job: ExportJobDTO) => {
    const id = job.id ?? job._id;
    if (!id) return;
    setActionError(null);
    try {
      const response = await downloadExport(id);
      const blob = new Blob([response.data as BlobPart], {
        type: job.mimeType ?? "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = job.fileName ?? `${job.domain}-export.${job.format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Export download failed or expired.";
      setActionError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Data Exports &amp; Backups
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Generate scoped JSON or CSV exports for your organization or active branch.
            </p>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-slate-400" />
        </div>

        {backupStatus && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">
                Platform-wide database dumps are not available to organization admins.
              </p>
              <p className="mt-0.5 text-amber-800">{backupStatus.note}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRequestExport} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="export-domain" className="block text-xs font-medium text-slate-700">
              Domain
            </label>
            <select
              id="export-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as ExportDomain)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="export-format" className="block text-xs font-medium text-slate-700">
              Format
            </label>
            <select
              id="export-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={requestExportMutation.isPending}
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {requestExportMutation.isPending ? "Generating..." : "Generate Export"}
            </button>
          </div>
        </form>

        {actionError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {actionError}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Recent Exports</h3>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading export history...</p>
        ) : exportsList.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No exports generated yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-slate-500">
                  <th className="py-2 pr-4">Domain</th>
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 pr-4">Records</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exportsList.map((job) => {
                  const jobId = job.id ?? job._id ?? `${job.domain}-${job.createdAt}`;
                  return (
                    <tr key={jobId}>
                      <td className="py-2.5 pr-4 font-medium capitalize text-slate-900">
                        {job.domain}
                      </td>
                      <td className="py-2.5 pr-4 uppercase text-slate-600">{job.format}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{job.recordCount}</td>
                      <td className="py-2.5 pr-4 capitalize text-slate-600">{job.status}</td>
                      <td className="py-2.5 text-right">
                        {job.status === "completed" ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(job)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
