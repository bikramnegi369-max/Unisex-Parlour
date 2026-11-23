export interface Expense {
  id: string;
  expenseCode: string;
  category: string;
  amount: number;
  paymentMethod: "petty_cash" | "upi" | "card" | "bank_transfer";
  payeeName: string;
  invoiceNumber?: string | null;
  receiptUrl?: string | null;
  description?: string;
  sourceType?: "manual" | "procurement_invoice" | "procurement_payment" | "inventory_consumption" | "payroll" | "other";
  sourceReference?: string | null;
  supplierId?: { id: string; name: string; contactPerson?: string; phone?: string; email?: string } | null;
  supplierInvoiceId?: { id: string; invoiceNumber: string; totalAmount: number; amountPaid?: number; status: string; dueDate?: string } | null;
  expenseDate: string;
  approvalStatus: "pending_approval" | "approved" | "rejected";
  paymentStatus: "unpaid" | "settled";
  approvalThresholdAtCreation: number;
  approvedBy?: { id: string; name: string; email: string } | null;
  approvedAt?: string | null;
  rejectedBy?: { id: string; name: string; email: string } | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  recordedBy?: { id: string; name: string; email: string } | null;
  pettyCashTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalSpent: number;
  categories: Record<string, number>;
  pendingApprovalCount: number;
}

export interface PettyCashBalance {
  branchId: string;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
}

export interface PettyCashTransaction {
  id: string;
  transactionNumber: string;
  type: "opening_balance" | "replenishment" | "expense_payout" | "payout_reversal";
  amount: number;
  recoveredAmountSoFar?: number;
  linkedExpenseId?: {
    id: string;
    expenseCode: string;
    payeeName: string;
    category: string;
    amount: number;
  } | null;
  originalPayoutId?: string | null;
  description: string;
  recordedBy?: { id: string; name: string; email: string } | null;
  transactionDate: string;
  createdAt: string;
}

export interface CreateExpensePayload {
  category: string;
  amount: number;
  paymentMethod: "petty_cash" | "upi" | "card" | "bank_transfer";
  payeeName: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  description?: string;
  sourceType?: "manual" | "procurement_invoice" | "procurement_payment" | "inventory_consumption" | "payroll" | "other";
  sourceReference?: string;
  supplierId?: string;
  supplierInvoiceId?: string;
  expenseDate?: string;
}

export interface UpdateExpensePayload {
  category?: string;
  payeeName?: string;
  invoiceNumber?: string | null;
  receiptUrl?: string | null;
  description?: string;
  sourceType?: "manual" | "procurement_invoice" | "procurement_payment" | "inventory_consumption" | "payroll" | "other";
  sourceReference?: string;
  supplierId?: string;
  supplierInvoiceId?: string;
  expenseDate?: string;
}

export interface ReplenishPettyCashPayload {
  amount: number;
  description: string;
}

export interface RecoverPayoutPayload {
  linkedExpenseId: string;
  originalPayoutId: string;
  recoveredAmount: number;
  recoveryDate?: string;
  reason: string;
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  paymentMethod?: string;
  approvalStatus?: string;
  paymentStatus?: string;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
