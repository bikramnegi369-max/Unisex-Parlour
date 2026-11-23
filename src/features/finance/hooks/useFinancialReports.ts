import { useQuery, useMutation } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { ReportQueryParams } from "../types/finance.types";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export function useFinancialReports(params: ReportQueryParams) {
  const { getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isEnabled = isAuthenticated && hasPermission(user, "finance.view");
  const queryKey = getBranchQueryKey("financial-report-summary", [params]);

  return useQuery({
    queryKey,
    queryFn: () => financeApi.getFinancialReports(params),
    enabled: isEnabled,
  });
}

export function useExportFinancialReport() {
  return useMutation({
    mutationFn: async (params: ReportQueryParams) => {
      const csvData = await financeApi.exportFinancialReport(params);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${params.reportType}-${params.startDate}-${params.endDate}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    },
  });
}
