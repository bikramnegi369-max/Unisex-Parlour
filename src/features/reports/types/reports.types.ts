export interface MetricWithComparison {
  current: number;
  previous: number | null;
  percentageChange?: number | null;
  percentagePointsChange?: number | null;
  trend: "up" | "down" | "neutral";
}

export interface ReportMeta {
  organizationId: string;
  branchId: string | null;
  branchName: string;
  currency: string;
  startDate: string;
  endDate: string;
  comparisonStartDate: string | null;
  comparisonEndDate: string | null;
  timezone: string;
  generatedAt: string;
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type PaginatedReportParams = ReportsFilterParams & {
  page: number;
  limit: number;
};

export type ServiceAnalyticsReportParams = PaginatedReportParams & {
  categoryPage: number;
  categoryLimit: number;
};

export type InventoryReportParams = ReportsFilterParams & {
  lowStockPage: number;
  lowStockLimit: number;
  movementPage: number;
  movementLimit: number;
};

export interface ReportsOverviewResponse {
  meta: ReportMeta;
  summary: {
    netSalesBilled: MetricWithComparison | null;
    moneyCollected: MetricWithComparison | null;
    completedServices: MetricWithComparison | null;
    totalVisitingClients: MetricWithComparison | null;
    repeatVisitRate: MetricWithComparison | null;
    lowStockItemCount: number | null;
  };
  operationalSignals: Array<{
    id: string;
    type: "critical" | "warning" | "info";
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  }>;
  quickInsights: Array<{
    category: "revenue" | "operations" | "clients" | "inventory";
    observation: string;
    detail: string;
    trend: "positive" | "attention" | "neutral";
  }>;
}

export interface RevenueReportResponse {
  meta: ReportMeta;
  summary: {
    grossBilled: MetricWithComparison;
    totalDiscounts: MetricWithComparison;
    subscriptionCoveredValue: MetricWithComparison;
    netBilled: MetricWithComparison;
    grossCollected: MetricWithComparison;
    refundsIssued: MetricWithComparison;
    netCollected: MetricWithComparison;
    outstandingReceivables: MetricWithComparison;
  };
  streams: {
    servicesBilled: number;
    retailBilled: number;
    membershipsBilled: number;
    subscriptionsBilled: number;
  };
  tenderBreakdown: Array<{
    method: string;
    amount: number;
    transactionCount: number;
    percentageOfTotal: number;
  }>;
  timeSeries: Array<{
    date: string;
    billedSales: number;
    moneyCollected: number;
    refunds: number;
  }>;
  recentTransactions: Array<{
    invoiceId: string;
    invoiceNumber: string;
    clientName: string;
    date: string;
    billedAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
  }>;
  pagination: {
    recentTransactions: ReportPagination;
  };
}

export interface StaffPerformanceRanking {
  staffId: string;
  name: string;
  staffCode: string;
  servicesCompletedCount: number;
  serviceHours: number;
  serviceRevenueCredit: number;
  retailSalesCredit: number;
  packageSalesCredit: number;
  totalRevenueContribution: number;
  totalRevenueCredit: number;
}

export interface StaffPerformanceReportResponse {
  meta: ReportMeta;
  summary: {
    totalServicesDelivered: MetricWithComparison;
    totalChairTimeHours: MetricWithComparison;
    serviceRevenueGenerated: MetricWithComparison;
    retailSalesGenerated: MetricWithComparison;
    topPerformingStaffName: string | null;
  };
  rankings: StaffPerformanceRanking[];
  pagination: {
    rankings: ReportPagination;
  };
}

export interface CustomerDirectoryEntry {
  customerId: string;
  name: string;
  phone: string;
  lastVisitDate: string;
  totalLifetimeVisits: number;
  daysSinceLastVisit: number;
  statusTier: "active" | "dueForService" | "atRisk" | "lapsed";
}

export interface CustomerRetentionReportResponse {
  meta: ReportMeta;
  summary: {
    totalVisitingClients: MetricWithComparison;
    newClientsAcquired: MetricWithComparison;
    returningClients: MetricWithComparison;
    repeatVisitRate: MetricWithComparison;
    atRiskClientsCount: number;
    historyCompleteness: "truncated" | "complete" | "unknown";
    historyCompletenessNote?: string;
  };
  recencyBuckets: {
    active: number;
    dueForService: number;
    atRisk: number;
    lapsed: number;
  };
  visitFrequencyDistribution: Array<{
    frequencyTier: string;
    clientCount: number;
    percentageOfTotal: number;
  }>;
  clientDirectory: CustomerDirectoryEntry[];
  pagination: {
    clientDirectory: ReportPagination;
  };
}

export interface ServicePerformanceEntry {
  serviceId: string;
  name: string;
  category: string;
  executionCount: number;
  totalGrossRevenue: number;
  averageDurationMinutes: number;
  percentageContribution: number;
}

export interface ServiceCategoryShare {
  category: string;
  executionCount: number;
  revenue: number;
  percentageShare: number;
}

export interface ServiceAnalyticsReportResponse {
  meta: ReportMeta;
  summary: {
    totalServicesCompleted: MetricWithComparison;
    averageServiceTicket: MetricWithComparison;
    mostRequestedServiceName: string;
    topRevenueCategoryName: string;
  };
  topServices: ServicePerformanceEntry[];
  categoryShare: ServiceCategoryShare[];
  pagination: {
    topServices: ReportPagination;
    categoryShare: ReportPagination;
  };
}

export interface InventoryLowStockAlert {
  stockBalanceId: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  usageType: "salon_consumption" | "retail_sale" | "both";
  onHandConsumables: number;
  onHandRetail: number;
  totalOnHand: number;
  reorderLevel: number;
  urgency: "critical" | "warning";
}

export interface InventoryMovementLogEntry {
  movementId: string;
  timestamp: string;
  productName: string;
  sku: string;
  movementType: string;
  quantityDelta: number;
  stockDomain: "salon_consumables" | "retail_products" | "general";
  actorName: string;
  notes: string;
}

export interface InventoryReportResponse {
  meta: ReportMeta;
  summary: {
    totalTrackedSkuCount: number;
    lowStockConsumablesCount: number;
    lowStockRetailCount: number;
    consumablesUsedInPeriod: MetricWithComparison;
    retailUnitsSoldInPeriod: MetricWithComparison;
    auditNetDiscrepancyDelta: number;
  };
  lowStockAlerts: InventoryLowStockAlert[];
  movementLogs: InventoryMovementLogEntry[];
  pagination: {
    lowStockAlerts: ReportPagination;
    movementLogs: ReportPagination;
  };
}

export interface ReportsFilterParams {
  startDate: string;
  endDate: string;
  compareWith?: "previous_period" | "previous_year" | "none";
}
