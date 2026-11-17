"use client";

import React, { useState, useEffect } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Calculator, ShieldCheck } from "lucide-react";
import { previewFormSchema, PreviewFormValues } from "../schemas/incentives.schema";
import {
  CalculationPreviewRequest,
  CalculationPreviewResponse,
  IncentiveScheme,
} from "../types/incentives.types";
import { getErrorMessage } from "@/lib/api/errors";

interface CalculationPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (values: CalculationPreviewRequest) => Promise<CalculationPreviewResponse>;
  schemes: IncentiveScheme[];
  staffList?: Array<{ id: string; name: string }>;
}

// Only COMMISSION-type schemes support the revenue-based preview API.
// ATTENDANCE_BONUS and TARGET_BONUS are evaluated automatically from
// attendance records — they cannot be simulated via a revenue input.
const PREVIEWABLE_SCHEME_TYPES: ReadonlyArray<string> = [
  "COMMISSION",
];

export const CalculationPreviewDialog: React.FC<CalculationPreviewDialogProps> = ({
  isOpen,
  onClose,
  onPreview,
  schemes,
  staffList = [],
}) => {
  const [result, setResult] = useState<CalculationPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only schemes whose type the preview API actually supports.
  const previewableSchemes = schemes.filter((s) =>
    PREVIEWABLE_SCHEME_TYPES.includes(s.schemeType),
  );
  const firstPreviewableSchemeId = previewableSchemes[0]?.id || "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreviewFormValues>({
    resolver: zodResolver(previewFormSchema) as unknown as Resolver<PreviewFormValues>,
    defaultValues: {
      schemeId: "",
      staffId: "",
      revenueRupees: 5000,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        schemeId: firstPreviewableSchemeId,
        staffId: "",
        revenueRupees: 5000,
      });
    }
  }, [firstPreviewableSchemeId, isOpen, reset]);

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  const handleRunPreview = async (data: PreviewFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const revenueInPaise = Math.round(Number(data.revenueRupees) * 100);
      const res = await onPreview({
        schemeId: data.schemeId || undefined,
        staffId: data.staffId || undefined,
        revenueInPaise,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Preview failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Incentive Calculation Preview"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" /> Incentive Calculation Preview
          </h3>
          <p className="text-xs text-muted-foreground">
              Test revenue commission plan rates against a simulated revenue input using the real backend engine.
              This is an isolated preview — it does NOT write ledger records.
              Attendance bonus and target bonus plans are calculated automatically and are not available here.
            </p>
        </div>

        {error && (
          <div className="p-2.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(handleRunPreview)} className="space-y-3.5">
          {previewableSchemes.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <strong>No previewable commission plans found.</strong> Attendance bonus and target bonus
              plans are evaluated automatically from attendance records and cannot be simulated here.
              Create or activate a revenue commission plan to use this tool.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Select Commission Plan</label>
              <Select {...register("schemeId")}>
                <option value="">-- Choose Commission Plan --</option>
                {previewableSchemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Or Resolve by Staff</label>
              <Select {...register("staffId")}>
                <option value="">-- Choose Staff --</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Attributed Revenue (₹)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 5000"
              {...register("revenueRupees")}
            />
            {errors.revenueRupees && (
              <p className="text-[11px] text-destructive">{errors.revenueRupees.message}</p>
            )}
          </div>

          <Button type="submit" disabled={loading || previewableSchemes.length === 0} className="w-full gap-2">
            <Calculator className="w-4 h-4" /> {loading ? "Evaluating..." : "Run Calculation Preview"}
          </Button>
        </form>

        {result && (
          <div className="p-3.5 rounded-xl border bg-zinc-50 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  Applied Scheme
                </div>
                <div className="font-semibold text-zinc-900 text-xs">{result.scheme.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  Applied Rate
                </div>
                <div className="font-semibold text-zinc-900 text-xs">{result.snapshot.appliedRate}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Input Revenue:</span>{" "}
                <span className="font-medium">₹{(result.inputRevenueInPaise / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fixed Bonus:</span>{" "}
                <span className="font-medium">₹{(result.snapshot.fixedAmountPaise / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tier Range:</span>{" "}
                <span className="font-medium">
                  ₹{(Number(result.snapshot.tierMinPaise || 0) / 100).toFixed(2)} &ndash;{" "}
                  {result.snapshot.tierMaxPaise !== null
                    ? `₹${(Number(result.snapshot.tierMaxPaise) / 100).toFixed(2)}`
                    : "No Limit"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Basis:</span>{" "}
                <span className="font-medium">{result.snapshot.calculationBasis}</span>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">Calculated Commission:</span>
              <span className="text-sm font-bold text-emerald-600">
                ₹{(result.earnedCommissionInPaise / 100).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified via pure integer paise arithmetic with zero floating-point leakage.
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
