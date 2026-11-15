import { describe, it, expect } from "vitest";
import {
  supplierFormSchema,
  purchaseOrderFormSchema,
  receiveGoodsFormSchema,
  supplierInvoiceFormSchema,
  supplierPaymentFormSchema,
} from "../schemas/procurement.schemas";

describe("Procurement Zod Validation Schemas", () => {
  describe("supplierFormSchema", () => {
    it("validates valid supplier data", () => {
      const valid = {
        name: "L'Oreal Professional",
        contactPerson: "Rahul Verma",
        phone: "9876543210",
        email: "orders@loreal.com",
        paymentTermsDays: 30,
        status: "active" as const,
      };
      const result = supplierFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects supplier with name under 2 characters", () => {
      const invalid = {
        name: "L",
      };
      const result = supplierFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("purchaseOrderFormSchema", () => {
    it("validates valid purchase order data with stock domain", () => {
      const valid = {
        supplierId: "507f1f77bcf86cd799439011",
        items: [
          {
            productId: "507f1f77bcf86cd799439012",
            targetDomain: "retail_products" as const,
            orderedQuantity: 10,
            unitCostPrice: 500,
          },
          {
            productId: "507f1f77bcf86cd799439013",
            targetDomain: "salon_consumables" as const,
            orderedQuantity: 5,
            unitCostPrice: 1200,
          },
        ],
      };
      const result = purchaseOrderFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects purchase order with empty items", () => {
      const invalid = {
        supplierId: "507f1f77bcf86cd799439011",
        items: [],
      };
      const result = purchaseOrderFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("receiveGoodsFormSchema", () => {
    it("accepts receive items where at least one has quantity > 0", () => {
      const valid = {
        notes: "Courier delivered batch 1",
        items: [
          {
            productId: "507f1f77bcf86cd799439012",
            receivedQuantity: 5,
          },
        ],
      };
      const result = receiveGoodsFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects receive goods when all quantities are 0", () => {
      const invalid = {
        items: [
          {
            productId: "507f1f77bcf86cd799439012",
            receivedQuantity: 0,
          },
        ],
      };
      const result = receiveGoodsFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("supplierInvoiceFormSchema", () => {
    it("validates invoice with positive totalAmount", () => {
      const valid = {
        supplierId: "507f1f77bcf86cd799439011",
        invoiceDate: "2026-11-15",
        dueDate: "2026-12-15",
        totalAmount: 15000,
      };
      const result = supplierInvoiceFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invoice with non-positive amount", () => {
      const invalid = {
        supplierId: "507f1f77bcf86cd799439011",
        invoiceDate: "2026-11-15",
        dueDate: "2026-12-15",
        totalAmount: 0,
      };
      const result = supplierInvoiceFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("supplierPaymentFormSchema", () => {
    it("validates supplier payment submission", () => {
      const valid = {
        supplierId: "507f1f77bcf86cd799439011",
        supplierInvoiceId: "507f1f77bcf86cd799439014",
        amount: 5000,
        paymentMethod: "bank_transfer" as const,
        paymentDate: "2026-11-15",
        referenceNote: "NEFT-12345",
      };
      const result = supplierPaymentFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});

