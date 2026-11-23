import { z } from "zod";

export const expenseCategoryEnum = z.enum([
  "utilities",
  "maintenance",
  "refreshments",
  "cleaning",
  "laundry",
  "supplies",
  "marketing",
  "other",
]);

export const expensePaymentMethodEnum = z.enum([
  "petty_cash",
  "upi",
  "card",
  "bank_transfer",
]);

export const expenseSourceTypeEnum = z.enum([
  "manual",
  "procurement_invoice",
  "procurement_payment",
  "inventory_consumption",
  "payroll",
  "other",
]);

export const expenseFormSchema = z.object({
  category: z.string().min(1, "Please choose an expense category"),
  amount: z.number({ message: "Amount must be a valid number" }).positive("Amount must be greater than ₹0.00"),
  paymentMethod: expensePaymentMethodEnum,
  payeeName: z.string().trim().min(1, "Payee / Vendor name is required"),
  invoiceNumber: z.string().trim().optional(),
  receiptUrl: z.string().trim().url("Invalid receipt URL").optional().or(z.literal("")),
  description: z.string().trim().optional(),
  sourceType: expenseSourceTypeEnum.optional(),
  sourceReference: z.string().trim().optional(),
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid supplier reference").optional().or(z.literal("")),
  supplierInvoiceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid invoice reference").optional().or(z.literal("")),
  expenseDate: z.string().min(1, "Expense date is required"),
});

export const replenishDrawerSchema = z.object({
  amount: z.coerce.number().positive("Deposit amount must be greater than ₹0.00"),
  description: z.string().trim().min(2, "Please provide the funding source or deposit description"),
});

export const recoverPayoutSchema = z.object({
  linkedExpenseId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Valid expense ID is required"),
  originalPayoutId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Valid transaction ID is required"),
  recoveredAmount: z.coerce.number().positive("Recovered amount must be greater than ₹0.00"),
  recoveryDate: z.string().optional(),
  reason: z.string().trim().min(2, "Explanation for cash return is required"),
});

export const rejectExpenseSchema = z.object({
  reason: z.string().trim().min(2, "Rejection explanation is mandatory for audit trail"),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
export type ReplenishDrawerFormValues = z.infer<typeof replenishDrawerSchema>;
export type RecoverPayoutFormValues = z.infer<typeof recoverPayoutSchema>;
export type RejectExpenseFormValues = z.infer<typeof rejectExpenseSchema>;
