import { z } from "zod";

export const supplierFormSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  paymentTermsDays: z.number().int().min(0, "Terms cannot be negative"),
  bankDetails: z
    .object({
      accountNo: z.string().trim().optional(),
      ifscCode: z.string().trim().optional(),
      bankName: z.string().trim().optional(),
    })
    .optional(),
  status: z.enum(["active", "inactive"]),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  targetDomain: z.enum(["salon_consumables", "retail_products"]),
  orderedQuantity: z.number().positive("Quantity must be greater than zero"),
  unitCostPrice: z.number().min(0, "Cost cannot be negative"),
});

export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().trim().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one product line"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

export const receiveItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  receivedQuantity: z.number().min(0, "Quantity cannot be negative"),
  targetDomain: z.enum(["salon_consumables", "retail_products"]).optional(),
});

export const receiveGoodsFormSchema = z.object({
  notes: z.string().trim().optional(),
  items: z.array(receiveItemSchema).refine(
    (items) => items.some((it) => it.receivedQuantity > 0),
    "At least one item must have a received quantity greater than 0"
  ),
});

export type ReceiveGoodsFormValues = z.infer<typeof receiveGoodsFormSchema>;

export const supplierInvoiceFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  supplierInvoiceRef: z.string().trim().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  totalAmount: z.number().positive("Total amount must be greater than zero"),
  notes: z.string().trim().optional(),
});

export type SupplierInvoiceFormValues = z.infer<typeof supplierInvoiceFormSchema>;

export const supplierPaymentFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierInvoiceId: z.string().min(1, "Invoice is required"),
  branchId: z.string().optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "upi", "other"]),
  referenceNote: z.string().trim().optional(),
  paymentDate: z.string().min(1, "Payment date is required"),
});

export type SupplierPaymentFormValues = z.infer<typeof supplierPaymentFormSchema>;
