import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getServices,
  getService,
  createService,
  updateService,
  updateServiceStatus,
  deleteService,
  reactivateService,
  mapServiceDTO,
  type RawServiceDTO,
} from "../api/services.api";
import { apiClient } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Services API Layer Anti-Corruption & Alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapServiceDTO Normalization", () => {
    it("correctly normalizes RawServiceDTO into clean frontend Service model", () => {
      const rawDto: RawServiceDTO = {
        _id: "srv_123",
        name: "Haircut Deluxe",
        serviceCode: "HC001",
        description: "Premium hair styling",
        categoryId: { _id: "cat_456", name: "Hair" },
        duration: 45,
        pricing: {
          basePrice: 500,
          specialPrice: 450,
        },
        taxConfiguration: {
          taxable: true,
          taxRate: 18,
        },
        status: "active",
        displayOrder: 1,
        branchId: "br_789",
        organizationId: "org_000",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };

      const normalized = mapServiceDTO(rawDto);

      expect(normalized.id).toBe("srv_123");
      expect(normalized.name).toBe("Haircut Deluxe");
      expect(normalized.code).toBe("HC001");
      expect(normalized.categoryId).toBe("cat_456");
      expect(normalized.duration).toBe(45);
      expect(normalized.basePrice).toBe(500);
      expect(normalized.pricing?.basePrice).toBe(500);
      expect(normalized.taxable).toBe(true);
      expect(normalized.taxRate).toBe(18);
      expect(normalized.isActive).toBe(true);
      expect(normalized.branchId).toBe("br_789");

      // Verify raw DTO leak fields are not exposed on normalized Service
      const asRecord = normalized as unknown as Record<string, unknown>;
      expect(asRecord._id).toBeUndefined();
      expect(asRecord.serviceCode).toBeUndefined();
      expect(asRecord.status).toBeUndefined();
      expect(asRecord.taxConfiguration).toBeUndefined();
    });

    it("handles inactive status correctly", () => {
      const rawDto: RawServiceDTO = {
        _id: "srv_999",
        name: "Trim",
        status: "inactive",
      };

      const normalized = mapServiceDTO(rawDto);
      expect(normalized.isActive).toBe(false);
    });

    it("safely handles null/undefined inputs", () => {
      const normalized = mapServiceDTO(null);
      expect(normalized).toBeNull();
    });
  });

  describe("GET Endpoints", () => {
    it("getServices calls GET /services with branchScope current and normalizes list", async () => {
      const rawDto: RawServiceDTO = {
        _id: "srv_1",
        name: "Shampoo",
        serviceCode: "SH001",
        pricing: { basePrice: 200 },
        taxConfiguration: { taxable: false, taxRate: 0 },
        status: "active",
      };

      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          data: [rawDto],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      });

      const res = await getServices({ page: 1 });

      expect(apiClient.get).toHaveBeenCalledWith("/services", {
        params: { page: 1 },
        branchScope: "current",
      });
      expect(res.data[0].id).toBe("srv_1");
      expect(res.data[0].code).toBe("SH001");
      expect(res.data[0].basePrice).toBe(200);
      expect(res.data[0].isActive).toBe(true);
    });

    it("getService calls GET /services/:id with branchScope current and normalizes single item", async () => {
      const rawDto: RawServiceDTO = {
        _id: "srv_2",
        name: "Pedicure",
        serviceCode: "PED01",
        pricing: { basePrice: 700 },
        taxConfiguration: { taxable: true, taxRate: 12 },
        status: "active",
      };

      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawDto },
      });

      const res = await getService("srv_2");

      expect(apiClient.get).toHaveBeenCalledWith("/services/srv_2", {
        branchScope: "current",
      });
      expect(res.id).toBe("srv_2");
      expect(res.code).toBe("PED01");
      expect(res.basePrice).toBe(700);
      expect(res.taxable).toBe(true);
      expect(res.taxRate).toBe(12);
    });
  });

  describe("POST /services (Create)", () => {
    it("createService sends a flat payload without nested pricing/taxConfiguration objects", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_new",
        name: "Facial Spa",
        serviceCode: "FAC01",
        pricing: { basePrice: 1500 },
        taxConfiguration: { taxable: true, taxRate: 18 },
        status: "active",
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      const created = await createService({
        name: "Facial Spa",
        code: "FAC01",
        categoryId: "cat_spa",
        duration: 60,
        basePrice: 1500,
        taxable: true,
        taxRate: 18,
        description: "Relaxing facial",
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        "/services",
        {
          name: "Facial Spa",
          serviceCode: "FAC01",
          categoryId: "cat_spa",
          duration: 60,
          basePrice: 1500,
          taxable: true,
          taxRate: 18,
          description: "Relaxing facial",
        },
        { branchScope: "current" },
      );
      expect(created.id).toBe("srv_new");
      expect(created.basePrice).toBe(1500);
    });
  });

  describe("PUT /services/:id (Update)", () => {
    it("updateService translates flat price and tax fields into nested pricing and taxConfiguration", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_upd",
        name: "Hair Cut Updated",
        pricing: { basePrice: 600 },
        taxConfiguration: { taxable: true, taxRate: 18 },
        status: "active",
      };

      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      await updateService("srv_upd", {
        name: "Hair Cut Updated",
        basePrice: 600,
        taxable: true,
        taxRate: 18,
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        "/services/srv_upd",
        {
          name: "Hair Cut Updated",
          pricing: {
            basePrice: 600,
          },
          taxConfiguration: {
            taxable: true,
            taxRate: 18,
          },
        },
        { branchScope: "current" },
      );
    });

    it("updateService does NOT send empty pricing or taxConfiguration when price/tax are not updated", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_upd2",
        name: "Hair Cut Title Only",
        status: "active",
      };

      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      await updateService("srv_upd2", {
        name: "Hair Cut Title Only",
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        "/services/srv_upd2",
        {
          name: "Hair Cut Title Only",
        },
        { branchScope: "current" },
      );
    });
  });

  describe("Status Update & Reactivation", () => {
    it("updateServiceStatus(true) sends PUT /services/:id with status active", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_status",
        status: "active",
      };

      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      const res = await updateServiceStatus("srv_status", true);

      expect(apiClient.put).toHaveBeenCalledWith(
        "/services/srv_status",
        { status: "active" },
        { branchScope: "current" },
      );
      expect(res.isActive).toBe(true);
    });

    it("updateServiceStatus(false) sends PUT /services/:id with status inactive", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_status",
        status: "inactive",
      };

      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      const res = await updateServiceStatus("srv_status", false);

      expect(apiClient.put).toHaveBeenCalledWith(
        "/services/srv_status",
        { status: "inactive" },
        { branchScope: "current" },
      );
      expect(res.isActive).toBe(false);
    });

    it("reactivateService uses PATCH /services/:id/reactivate", async () => {
      const rawResponse: RawServiceDTO = {
        _id: "srv_reactivate",
        status: "active",
      };

      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: rawResponse },
      });

      const res = await reactivateService("srv_reactivate");

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/services/srv_reactivate/reactivate",
        {},
        { branchScope: "current" },
      );
      expect(res.isActive).toBe(true);
    });

    it("deleteService calls DELETE /services/:id with branchScope current", async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      await deleteService("srv_del");

      expect(apiClient.delete).toHaveBeenCalledWith("/services/srv_del", {
        branchScope: "current",
      });
    });
  });
});
