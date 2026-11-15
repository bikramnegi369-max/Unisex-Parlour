import { describe, it, expect, vi, beforeEach } from "vitest";
import { procurementApi } from "../api/procurement.api";
import { apiClient } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("Procurement API Client & Normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes _id to id in supplier listings", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            _id: "507f1f77bcf86cd799439011",
            name: "L'Oreal",
            status: "active",
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    });

    const result = await procurementApi.listSuppliers();
    expect(result.data[0].id).toBe("507f1f77bcf86cd799439011");
    expect((result.data[0] as any)._id).toBeUndefined();
  });

  it("submits goods receiving with idempotency key and normalizes response", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          receipt: {
            _id: "507f1f77bcf86cd799439099",
            grnNumber: "GRN-20261115-0001",
          },
          purchaseOrder: {
            _id: "507f1f77bcf86cd799439022",
            poNumber: "PO-20261115-0001",
            status: "partially_received",
          },
        },
      },
    });

    const res = await procurementApi.receiveGoods("507f1f77bcf86cd799439022", {
      items: [
        {
          productId: "507f1f77bcf86cd799439012",
          receivedQuantity: 5,
        },
      ],
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/procurement/orders/507f1f77bcf86cd799439022/receive",
      expect.objectContaining({ items: expect.any(Array) }),
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
      })
    );
    expect(res.receipt.id).toBe("507f1f77bcf86cd799439099");
    expect(res.purchaseOrder.id).toBe("507f1f77bcf86cd799439022");
  });
});
