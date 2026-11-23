export interface MetricWithComparison {
  current: number | null;
  previous: number | null;
  percentageChange?: number | null;
  percentagePointsChange?: number | null;
  trend: "up" | "down" | "neutral";
}

export interface ReportMeta {
  organizationId: string;
  branchId: string;
  branchName: string;
  currency: string;
  startDate: string;
  endDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  timezone: string;
  generatedAt: string;
}

export interface ReportsOverviewResponse {
  meta: ReportMeta;
  summary: {
    netSalesBilled: MetricWithComparison;
    moneyCollected: MetricWithComparison;
    completedServices: MetricWithComparison;
    totalVisitingClients: MetricWithComparison;
    repeatVisitRate: MetricWithComparison;
    lowStockItemCount: number;
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
  timeSeries?: Array<{
    date: string;
    billedSales: number;
    moneyCollected: number;
    refunds: number;
  }>;
  recentTransactions?: Array<{
    invoiceId: string;
    invoiceNumber: string;
    clientName: string;
    date: string;
    billedAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
  }>;
}

export interface StaffPerformanceRanking {
  staffId: string;
  name: string;
  staffCode: string;
  servicesCompletedCount: number;
  serviceHours: number;
  serviceRevenueCredit: number;
  retailSalesCredit: number;
  totalRevenueCredit: number;
  averageTicket: number;
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
    mostRequestedServiceName: string | null;
    topRevenueCategoryName: string | null;
  };
  topServices: ServicePerformanceEntry[];
  categoryShare: ServiceCategoryShare[];
}

export interface InventoryLowStockAlert {
  productId: string;
  name: string;
  sku: string;
  category: string;
  usageType: "consumables" | "retail" | "both";
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
  stockDomain: "consumables" | "retail";
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
}

export interface ReportsFilterParams {
  startDate: string;
  endDate: string;
  compareWith?: "previous_period" | "none";
}
