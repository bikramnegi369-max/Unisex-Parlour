import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  applyInvoiceDiscount,
  modifyInvoiceDiscount,
  removeInvoiceDiscount,
  getInvoiceDiscountHistory,
  normalizeInvoice,
} from "../api/billing.api";
import {
  applyDiscountSchema,
  modifyDiscountSchema,
  removeDiscountSchema,
} from "../schemas/discount.schema";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Billing Invoice Discounts — API & Schema Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema Validation", () => {
    it("validates applyDiscountSchema with fixed and percentage values", () => {
      // Valid fixed discount
      const validFixed = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "invoice",
        discountType: "fixed",
        enteredValue: 150,
        reason: "Manager goodwill discount",
      });
      expect(validFixed.success).toBe(true);

      // Valid percentage discount
      const validPercentage = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "invoice",
        discountType: "percentage",
        enteredValue: 20,
        reason: "Festival seasonal promotion",
      });
      expect(validPercentage.success).toBe(true);

      // Percentage capped at 100
      const invalidPercentage = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "invoice",
        discountType: "percentage",
        enteredValue: 105,
        reason: "Excessive percentage discount",
      });
      expect(invalidPercentage.success).toBe(false);
      if (!invalidPercentage.success) {
        expect(invalidPercentage.error.issues[0].message).toContain("100%");
      }

      // Mandatory lineId when discountLevel is line
      const missingLine = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "line",
        discountType: "fixed",
        enteredValue: 50,
        reason: "Haircut discount",
      });
      expect(missingLine.success).toBe(false);
      if (!missingLine.success) {
        expect(missingLine.error.issues.some((i) => i.path.includes("lineId"))).toBe(true);
      }

      // Valid line discount
      const validLine = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "line",
        lineId: "line-item-123",
        discountType: "fixed",
        enteredValue: 50,
        reason: "Valid line level discount",
      });
      expect(validLine.success).toBe(true);

      // Mandatory reason (min 3 chars)
      const shortReason = applyDiscountSchema.safeParse({
        branchId: "branch-1",
        discountLevel: "invoice",
        discountType: "fixed",
        enteredValue: 50,
        reason: "ok",
      });
      expect(shortReason.success).toBe(false);
      if (!shortReason.success) {
        expect(shortReason.error.issues[0].message).toContain("3 characters");
      }
    });

    it("validates modifyDiscountSchema and removeDiscountSchema", () => {
      // Modify discount
      const validModify = modifyDiscountSchema.safeParse({
        branchId: "branch-1",
        enteredValue: 250,
        reason: "Adjusted after supervisor approval",
      });
      expect(validModify.success).toBe(true);

      const invalidModifyReason = modifyDiscountSchema.safeParse({
        branchId: "branch-1",
        enteredValue: 250,
        reason: "no",
      });
      expect(invalidModifyReason.success).toBe(false);

      // Remove discount
      const validRemove = removeDiscountSchema.safeParse({
        branchId: "branch-1",
        reason: "Customer chose loyalty points instead",
      });
      expect(validRemove.success).toBe(true);

      const invalidRemove = removeDiscountSchema.safeParse({
        branchId: "branch-1",
        reason: "",
      });
      expect(invalidRemove.success).toBe(false);
    });
  });

  describe("API Client Calls & Branch Scoping", () => {
    it("calls POST /billing/invoices/:id/discounts with explicit branchScope and omits lineId/lineIds for invoice level", async () => {
      const mockInvoice = {
        _id: "inv-1",
        invoiceNumber: "INV-001",
        subtotal: 1000,
        discountTotal: 100,
        grossPayable: 900,
        payableAmount: 900,
        amountDue: 900,
        status: "draft",
        branchId: "branch-100",
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Discount applied",
          data: {
            invoice: mockInvoice,
            historyEntry: {
              _id: "hist-1",
              action: "applied",
              discountLevel: "invoice",
              discountType: "fixed",
              enteredValue: 100,
              calculatedDiscount: 100,
              reason: "Courtesy",
              performedBy: "Staff 1",
            },
          },
        },
      });

      const payload = {
        branchId: "branch-100",
        discountLevel: "invoice" as const,
        discountType: "fixed" as const,
        enteredValue: 100,
        reason: "Courtesy",
      };

      const result = await applyInvoiceDiscount("inv-1", payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/discounts",
        {
          branchId: "branch-100",
          discountLevel: "invoice",
          discountType: "fixed",
          enteredValue: 100,
          reason: "Courtesy",
        },
        {
          branchScope: { type: "branch", branchId: "branch-100" },
        }
      );

      // Verify that neither lineId nor lineIds is sent in the body
      const calledBody = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(calledBody).not.toHaveProperty("lineId");
      expect(calledBody).not.toHaveProperty("lineIds");
      expect(calledBody.lineId).toBeUndefined();
      expect(calledBody.lineIds).toBeUndefined();

      expect(result.invoice.id).toBe("inv-1");
      expect(result.historyEntry?.action).toBe("applied");
    });

    it("serializes payload for 'line' level: includes lineId and omits lineIds (no null)", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Discount applied",
          data: {
            invoice: {
              _id: "inv-1",
              invoiceNumber: "INV-001",
              subtotal: 1000,
              status: "draft",
            },
          },
        },
      });

      await applyInvoiceDiscount("inv-1", {
        branchId: "branch-100",
        discountLevel: "line",
        lineId: "line-item-123",
        discountType: "percentage",
        enteredValue: 15,
        reason: "Line item promo",
      });

      const calledBody = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(calledBody.discountLevel).toBe("line");
      expect(calledBody.lineId).toBe("line-item-123");
      expect(calledBody).not.toHaveProperty("lineIds");
      expect(calledBody.lineIds).toBeUndefined();
      expect(calledBody.lineId).not.toBeNull();
    });

    it("serializes payload for 'selected_lines' level: includes lineIds and omits lineId (no null)", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Discount applied",
          data: {
            invoice: {
              _id: "inv-1",
              invoiceNumber: "INV-001",
              subtotal: 1000,
              status: "draft",
            },
          },
        },
      });

      await applyInvoiceDiscount("inv-1", {
        branchId: "branch-100",
        discountLevel: "selected_lines",
        lineIds: ["line-1", "line-2"],
        discountType: "fixed",
        enteredValue: 200,
        reason: "Multi-line bundle",
      });

      const calledBody = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(calledBody.discountLevel).toBe("selected_lines");
      expect(calledBody.lineIds).toEqual(["line-1", "line-2"]);
      expect(calledBody).not.toHaveProperty("lineId");
      expect(calledBody.lineId).toBeUndefined();
      expect(calledBody.lineIds).not.toBeNull();
    });

    it("calls PATCH /billing/invoices/:id/discounts/:discountId with explicit branchScope", async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Discount modified",
          data: {
            invoice: {
              _id: "inv-1",
              status: "draft",
              subtotal: 1000,
              discountTotal: 150,
            },
          },
        },
      });

      const result = await modifyInvoiceDiscount("inv-1", "disc-1", {
        branchId: "branch-100",
        enteredValue: 150,
        reason: "Updated promo value",
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/discounts/disc-1",
        {
          branchId: "branch-100",
          enteredValue: 150,
          reason: "Updated promo value",
        },
        {
          branchScope: { type: "branch", branchId: "branch-100" },
        }
      );
      expect(result.invoice.discountTotal).toBe(150);
    });

    it("calls DELETE /billing/invoices/:id/discounts/:discountId with payload and branchScope", async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: {
          success: true,
          message: "Discount removed",
          data: {
            invoice: {
              _id: "inv-1",
              status: "draft",
              subtotal: 1000,
              discountTotal: 0,
            },
          },
        },
      });

      const result = await removeInvoiceDiscount("inv-1", "disc-1", {
        branchId: "branch-100",
        reason: "Removed per customer request",
      });

      expect(apiClient.delete).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/discounts/disc-1",
        {
          data: {
            branchId: "branch-100",
            reason: "Removed per customer request",
          },
          branchScope: { type: "branch", branchId: "branch-100" },
        }
      );
      expect(result.invoice.discountTotal).toBe(0);
    });

    it("calls GET /billing/invoices/:id/discount-history and normalizes history entries", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              _id: "hist-1",
              invoiceId: "inv-1",
              discountId: "disc-1",
              action: "applied",
              discountLevel: "invoice",
              discountType: "percentage",
              enteredValue: 10,
              calculatedDiscount: 100,
              reason: "Opening day discount",
              performedBy: {
                _id: "usr-1",
                name: "Admin User",
                email: "admin@parlour.com",
              },
              performedAt: "2026-10-30T10:00:00Z",
              beforeSnapshot: {
                discountTotal: 0,
                payableAmount: 1000,
              },
              afterSnapshot: {
                discountTotal: 100,
                payableAmount: 900,
              },
            },
          ],
        },
      });

      const history = await getInvoiceDiscountHistory("inv-1", "branch-100");

      expect(apiClient.get).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/discount-history",
        {
          branchScope: { type: "branch", branchId: "branch-100" },
        }
      );

      expect(history.length).toBe(1);
      expect(history[0].action).toBe("applied");
      expect(typeof history[0].performedBy === "object" && history[0].performedBy.name).toBe("Admin User");
      expect(history[0].afterSnapshot?.discountTotal).toBe(100);
    });
  });

  describe("Normalization & Financial Fields", () => {
    it("correctly normalizes appliedDiscounts, lineDiscountsTotal, and invoiceDiscountsTotal", () => {
      const raw = {
        _id: "inv-10",
        invoiceNumber: "INV-10",
        status: "draft",
        subtotal: 2000,
        lineDiscountsTotal: 200,
        invoiceDiscountsTotal: 100,
        discountTotal: 300,
        grossPayable: 1700,
        subscriptionCoveredAmount: 500,
        payableAmount: 1200,
        amountPaid: 0,
        amountDue: 1200,
        lines: [
          {
            _id: "line-1",
            serviceName: "Hair Spa",
            unitPrice: 1000,
            lineTotal: 1000,
            discountTotal: 200,
            appliedDiscounts: [
              {
                _id: "disc-l1",
                discountLevel: "line",
                discountType: "fixed",
                enteredValue: 200,
                calculatedDiscount: 200,
                reason: "Service promo",
              },
            ],
          },
          {
            _id: "line-2",
            serviceName: "Facial",
            unitPrice: 1000,
            lineTotal: 1000,
            isCoveredBySubscription: true,
            subscriptionCoveredAmount: 500,
          },
        ],
        appliedDiscounts: [
          {
            _id: "disc-l1",
            discountLevel: "line",
            lineId: "line-1",
            discountType: "fixed",
            enteredValue: 200,
            calculatedDiscount: 200,
            reason: "Service promo",
          },
          {
            _id: "disc-inv1",
            discountLevel: "invoice",
            discountType: "percentage",
            enteredValue: 10,
            calculatedDiscount: 100,
            reason: "VIP Courtesy",
          },
        ],
      };

      const normalized = normalizeInvoice(raw as unknown as Record<string, unknown>);

      expect(normalized.lineDiscountsTotal).toBe(200);
      expect(normalized.invoiceDiscountsTotal).toBe(100);
      expect(normalized.discountTotal).toBe(300);
      expect(normalized.appliedDiscounts?.length).toBe(2);
      expect(normalized.items[0].appliedDiscounts?.length).toBe(1);
      expect(normalized.items[1].isCoveredBySubscription).toBe(true);
    });
  });
});

