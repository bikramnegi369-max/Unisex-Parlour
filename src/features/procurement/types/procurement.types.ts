export type StockDomain = "salon_consumables" | "retail_products";

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";

export type SupplierInvoiceStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type SupplierPaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "upi"
  | "other";

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTermsDays: number;
  bankDetails?: {
    accountNo?: string;
    ifscCode?: string;
    bankName?: string;
  };
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockUnit: string;
    usageType: string;
  };
  targetDomain: StockDomain;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    branchCode: string;
  };
  poNumber: string;
  supplierId: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  expectedDeliveryDate?: string | null;
  notes?: string;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  orderedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  id?: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockUnit: string;
  };
  targetDomain: StockDomain;
  receivedQuantity: number;
  unitCostPrice: number;
  lineTotal: number;
}

export interface GoodsReceiptNote {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    branchCode: string;
  };
  grnNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    status: PurchaseOrderStatus;
  };
  supplierId: string;
  supplier?: Supplier;
  items: GoodsReceiptItem[];
  totalAmount: number;
  receivedBy: string;
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
  receivedAt: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    branchCode: string;
  };
  invoiceNumber: string;
  supplierInvoiceRef: string;
  supplierId: string;
  supplier?: Supplier;
  purchaseOrderId?: string | null;
  purchaseOrder?: {
    id: string;
    poNumber: string;
  };
  goodsReceiptId?: string | null;
  goodsReceipt?: {
    id: string;
    grnNumber: string;
  };
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  outstandingAmount: number;
  status: SupplierInvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    branchCode: string;
  };
  paymentNumber: string;
  supplierId: string;
  supplier?: Supplier;
  supplierInvoiceId: string;
  supplierInvoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
  };
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  referenceNote?: string;
  paymentDate: string;
  recordedBy: string;
  createdAt: string;
}

export interface ProcurementOverview {
  activeSuppliersCount: number;
  draftOrdersCount: number;
  awaitingDeliveryCount: number;
  partiallyReceivedCount: number;
  unpaidInvoicesCount: number;
  outstandingSupplierBalance: number;
  recentOrders: PurchaseOrder[];
  recentReceipts: GoodsReceiptNote[];
}

