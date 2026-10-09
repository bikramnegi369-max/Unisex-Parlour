import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import {
  getInvoices,
  getInvoice,
  createInvoice,
  finalizeInvoice,
  recordPayment,
  voidPayment,
  downloadInvoicePdf,
  normalizeInvoice,
  normalizePayment,
} from "../api/billing.api";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Billing API Integration & Contract Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeInvoice", () => {
    it("correctly normalizes backend raw shape into clean typed Invoice", () => {
      const raw = {
        _id: "inv-123",
        invoiceNumber: "INV-2026-0001",
        organizationId: "org-1",
        branchId: "branch-1",
        customerId: {
          _id: "cust-1",
          name: "John Doe",
          phone: "9876543210",
        },
        appointmentId: {
          _id: "apt-1",
          appointmentCode: "APT-100",
          appointmentDate: "2026-10-10",
          timeSlot: "10:00",
        },
        status: "draft",
        paymentStatus: "unpaid",
        subtotal: 1000,
        discountTotal: 100,
        grossPayable: 900,
        subscriptionCoveredAmount: 200,
        payableAmount: 700,
        amountPaid: 0,
        amountDue: 700,
        items: [
          {
            _id: "item-1",
            serviceId: "srv-1",
            serviceName: "Haircut",
            unitPrice: 500,
            quantity: 1,
            lineTotal: 500,
            appliedSubscriptionId: null,
            subscriptionCoveredAmount: 0,
          },
          {
            _id: "item-2",
            serviceId: "srv-2",
            serviceName: "Beard Trim",
            unitPrice: 500,
            quantity: 1,
            lineTotal: 500,
            appliedSubscriptionId: "sub-1",
            subscriptionCoveredAmount: 200,
          },
        ],
      };

      const normalized = normalizeInvoice(raw as unknown as Record<string, unknown>);

      expect(normalized.id).toBe("inv-123");
      expect(normalized.invoiceNumber).toBe("INV-2026-0001");
      expect(normalized.customerId).toBe("cust-1");
      expect(normalized.customer?.name).toBe("John Doe");
      expect(normalized.appointmentId).toBe("apt-1");
      expect(normalized.appointment?.appointmentCode).toBe("APT-100");
      expect(normalized.appointment?.date).toBe("2026-10-10");
      expect(normalized.subtotal).toBe(1000);
      expect(normalized.payableAmount).toBe(700);
      expect(normalized.items.length).toBe(2);
      expect(normalized.items[1].appliedSubscriptionId).toBe("sub-1");
      expect(normalized.items[1].subscriptionCoveredAmount).toBe(200);
    });

    it("correctly normalizes exact real backend response with lines array, customerSnapshot, and nested invoice wrapper", () => {
      const realBackendResponse = {
        invoice: {
          _id: "6ac7611cb60e678a131d39d4",
          organizationId: "6a674eeb35f4849a26cab307",
          branchId: {
            _id: "6a674eeb35f4849a26cab309",
            name: "Indiranagar",
          },
          invoiceNumber: "INV-20261008-0001",
          appointmentId: "6ac760aab60e678a131d3940",
          appointmentCode: "APT-20261008-0046",
          appointmentPricingSnapshot: {
            subtotal: 10000,
            discount: 0,
            total: 10000,
          },
          customerId: {
            _id: "6ab76e6dde84df9a75ae4cc1",
            name: "Kush Qurilo",
            email: "kushqurilo@gmail.com",
            phone: "9654165886",
          },
          customerSnapshot: {
            name: "Kush Qurilo",
            phone: "9654165886",
            email: "kushqurilo@gmail.com",
          },
          lines: [
            {
              serviceId: "6ab77ffcd314ad13f1493b4c",
              appointmentServiceId: "6ac760aab60e678a131d3941",
              name: "Air Brush HD Party Make-up",
              duration: 75,
              quantity: 1,
              unitPrice: 10000,
              lineTotal: 10000,
              isCoveredBySubscription: true,
              appliedSubscriptionId: "6abba746b7bd97b5d5a7d336",
              subscriptionUsageId: "6ac760f0b60e678a131d3980",
              subscriptionCoveredAmount: 10000,
              customerPayable: 0,
              _id: "6ac7611cb60e678a131d39d5",
            },
          ],
          subtotal: 10000,
          discountTotal: 0,
          grossPayable: 10000,
          subscriptionCoveredAmount: 10000,
          payableAmount: 0,
          amountPaid: 0,
          amountDue: 0,
          status: "draft",
          paymentStatus: "unpaid",
          notes: "",
        },
        payments: [],
      };

      const normalized = normalizeInvoice(realBackendResponse as unknown as Record<string, unknown>);

      expect(normalized.id).toBe("6ac7611cb60e678a131d39d4");
      expect(normalized.invoiceNumber).toBe("INV-20261008-0001");
      expect(normalized.appointmentCode).toBe("APT-20261008-0046");
      expect(normalized.customer?.name).toBe("Kush Qurilo");
      expect(normalized.customer?.phone).toBe("9654165886");
      expect(normalized.branch?.name).toBe("Indiranagar");
      expect(normalized.items.length).toBe(1);
      expect(normalized.items[0].serviceName).toBe("Air Brush HD Party Make-up");
      expect(normalized.items[0].unitPrice).toBe(10000);
      expect(normalized.items[0].subscriptionCoveredAmount).toBe(10000);
      expect(normalized.items[0].customerPayable).toBe(0);
      expect(normalized.items[0].isCoveredBySubscription).toBe(true);
      expect(normalized.payableAmount).toBe(0);
      expect(normalized.amountDue).toBe(0);
    });
  });

  describe("normalizePayment", () => {
    it("correctly normalizes backend raw payment record", () => {
      const raw = {
        _id: "pay-100",
        paymentNumber: "PAY-100",
        invoiceId: "inv-123",
        organizationId: "org-1",
        branchId: "branch-1",
        amount: 500,
        paymentMethod: "upi",
        status: "recorded",
        paidAt: "2026-10-10T10:30:00Z",
        referenceNote: "GPay-TXN-123",
      };

      const normalized = normalizePayment(raw as unknown as Record<string, unknown>);

      expect(normalized.id).toBe("pay-100");
      expect(normalized.paymentNumber).toBe("PAY-100");
      expect(normalized.amount).toBe(500);
      expect(normalized.paymentMethod).toBe("upi");
      expect(normalized.status).toBe("recorded");
      expect(normalized.referenceNote).toBe("GPay-TXN-123");
    });
  });

  describe("API Client Calls", () => {
    it("getInvoices sends branchScope: current and sanitizes all branchId", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [{ _id: "inv-1", invoiceNumber: "INV-1" }],
        },
      });

      const res = await getInvoices({ branchId: "all", status: "draft" });

      expect(apiClient.get).toHaveBeenCalledWith("/billing/invoices", {
        params: { status: "draft" },
        branchScope: "current",
      });
      expect(res.data[0].id).toBe("inv-1");
    });

    it("getInvoices correctly exposes and normalizes meta.summary for customer billing", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [{ _id: "inv-1", invoiceNumber: "INV-1", payableAmount: 500, amountPaid: 300, amountDue: 200 }],
          meta: {
            total: 25,
            page: 1,
            limit: 10,
            totalPages: 3,
            summary: {
              totalInvoices: 25,
              totalBilled: 12500,
              totalPaid: 9500,
              totalOutstanding: 3000,
            },
          },
        },
      });

      const res = await getInvoices({ customerId: "cust-1", page: 1, limit: 10 });

      expect(res.data[0].id).toBe("inv-1");
      expect(res.meta).toBeDefined();
      expect(res.meta?.total).toBe(25);
      expect(res.meta?.totalPages).toBe(3);
      expect(res.meta?.summary).toEqual({
        totalInvoices: 25,
        totalBilled: 12500,
        totalPaid: 9500,
        totalOutstanding: 3000,
      });
    });

    it("getInvoices safely handles missing or non-finite summary fields without producing NaN", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [],
          meta: {
            total: "10",
            page: "2",
            limit: "5",
            totalPages: "2",
            summary: {
              totalInvoices: "10",
              totalBilled: 5000,
              totalPaid: null,
              totalOutstanding: undefined,
            },
          },
        },
      });

      const res = await getInvoices({ customerId: "cust-2" });

      expect(res.meta?.total).toBe(10);
      expect(res.meta?.totalPages).toBe(2);
      expect(res.meta?.summary).toEqual({
        totalInvoices: 10,
        totalBilled: 5000,
        totalPaid: 0,
        totalOutstanding: 0,
      });
    });

    it("getInvoices leaves summary undefined when backend response does not include it", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: [{ _id: "inv-1", invoiceNumber: "INV-1" }],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        },
      });

      const res = await getInvoices({ page: 1 });

      expect(res.meta?.summary).toBeUndefined();
      expect(res.meta?.total).toBe(1);
    });

    it("getInvoice fetches single invoice with branchScope: current", async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "inv-1", invoiceNumber: "INV-1" },
        },
      });

      const res = await getInvoice("inv-1");

      expect(apiClient.get).toHaveBeenCalledWith("/billing/invoices/inv-1", {
        branchScope: "current",
      });
      expect(res.id).toBe("inv-1");
    });

    it("createInvoice posts payload with explicit branch target", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "inv-new", invoiceNumber: "INV-NEW" },
        },
      });

      const payload = {
        branchId: "branch-100",
        appointmentId: "apt-200",
        discountTotal: 50,
      };

      const res = await createInvoice(payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/billing/invoices",
        payload,
        {
          branchScope: { type: "branch", branchId: "branch-100" },
        }
      );
      expect(res.id).toBe("inv-new");
    });

    it("finalizeInvoice calls POST /billing/invoices/:id/finalize", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "inv-1", status: "finalized" },
        },
      });

      const res = await finalizeInvoice("inv-1");

      expect(apiClient.post).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/finalize",
        {},
        { branchScope: "current" }
      );
      expect(res.status).toBe("finalized");
    });

    it("recordPayment calls POST /billing/invoices/:id/payments with idempotency headers when provided and handles flat response", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "pay-1", amount: 700, paymentMethod: "cash" },
        },
      });

      const res = await recordPayment("inv-1", {
        amount: 700,
        paymentMethod: "cash",
        idempotencyKey: "idem-key-12345",
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/billing/invoices/inv-1/payments",
        {
          amount: 700,
          paymentMethod: "cash",
          idempotencyKey: "idem-key-12345",
        },
        {
          branchScope: "current",
          headers: {
            "Idempotency-Key": "idem-key-12345",
            "X-Idempotency-Key": "idem-key-12345",
          },
        }
      );
      expect(res.id).toBe("pay-1");
      expect(res.amount).toBe(700);
      expect(res.isIdempotentReplay).toBeUndefined();
    });

    it("recordPayment correctly unpacks authoritative nested response with isIdempotentReplay: true", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          message: "Payment replayed successfully",
          data: {
            payment: {
              _id: "pay-authoritative-101",
              paymentNumber: "PAY-2026-0001",
              invoiceId: "inv-1",
              amount: 1500,
              paymentMethod: "upi",
              status: "recorded",
              referenceNote: "GPay-TXN-999",
            },
            invoice: {
              _id: "inv-1",
              amountDue: 0,
            },
            isIdempotentReplay: true,
          },
        },
      });

      const res = await recordPayment("inv-1", {
        amount: 1500,
        paymentMethod: "upi",
        idempotencyKey: "key-uuid-101",
      });

      expect(res.id).toBe("pay-authoritative-101");
      expect(res.paymentNumber).toBe("PAY-2026-0001");
      expect(res.amount).toBe(1500);
      expect(res.paymentMethod).toBe("upi");
      expect(res.status).toBe("recorded");
      expect(res.referenceNote).toBe("GPay-TXN-999");
      expect(res.isIdempotentReplay).toBe(true);
    });

    it("recordPayment correctly unpacks authoritative nested response without replay flag for new payment", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          message: "Payment recorded successfully",
          data: {
            payment: {
              _id: "pay-new-202",
              paymentNumber: "PAY-2026-0002",
              invoiceId: "inv-1",
              amount: 2000,
              paymentMethod: "card",
              status: "recorded",
            },
            invoice: {
              _id: "inv-1",
              amountDue: 0,
            },
          },
        },
      });

      const res = await recordPayment("inv-1", {
        amount: 2000,
        paymentMethod: "card",
        idempotencyKey: "key-uuid-202",
      });

      expect(res.id).toBe("pay-new-202");
      expect(res.paymentNumber).toBe("PAY-2026-0002");
      expect(res.amount).toBe(2000);
      expect(res.paymentMethod).toBe("card");
      expect(res.status).toBe("recorded");
      expect(res.isIdempotentReplay).toBeUndefined();
    });

    it("voidPayment calls POST /billing/payments/:paymentId/void", async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          status: "success",
          data: { _id: "pay-1", status: "voided", voidReason: "Wrong entry" },
        },
      });

      const res = await voidPayment("pay-1", {
        reason: "Wrong entry",
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/billing/payments/pay-1/void",
        { reason: "Wrong entry" },
        { branchScope: "current" }
      );
      expect(res.status).toBe("voided");
      expect(res.voidReason).toBe("Wrong entry");
    });

    it("downloadInvoicePdf calls GET /billing/invoices/:id/pdf with blob responseType", async () => {
      const mockBlob = new Blob(["fake-pdf"], { type: "application/pdf" });
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockBlob,
      });

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const originalCreateObjectURL = window.URL.createObjectURL;
      const originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/fake-pdf");
      window.URL.revokeObjectURL = vi.fn();
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      await downloadInvoicePdf("inv-1", "INV-100", "open");

      expect(apiClient.get).toHaveBeenCalledWith("/billing/invoices/inv-1/pdf", {
        responseType: "blob",
        branchScope: "current",
      });
      expect(window.URL.createObjectURL).toHaveBeenCalled();

      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      openSpy.mockRestore();
    });
  });
});
