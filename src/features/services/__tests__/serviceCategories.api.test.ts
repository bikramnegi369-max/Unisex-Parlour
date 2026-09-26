import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getServiceCategories,
  getServiceCategory,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  reactivateServiceCategory,
  type RawServiceCategoryDTO,
} from "../api/serviceCategories.api";
import { apiClient } from "@/lib/api/axios";
import type {
  ServiceCategoryCreatePayload,
  ServiceCategoryUpdatePayload,
} from "../types/category.types";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Service Categories API Layer (Organization-Global)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /services/categories (List)", () => {
    it("fetches categories organization-wide with branchScope none and normalizes IDs", async () => {
      const mockRaw: RawServiceCategoryDTO[] = [
        {
          _id: "cat_1",
          name: "Hair Styling",
          description: "All hair care and styling",
          displayOrder: 1,
          isActive: true,
          organizationId: "org_global_123",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ];

      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: {
          data: mockRaw,
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      });

      const res = await getServiceCategories({ search: "Hair" });

      expect(apiClient.get).toHaveBeenCalledWith("/services/categories", {
        params: { search: "Hair" },
        branchScope: "none",
      });
      expect(res.data[0].id).toBe("cat_1");
      expect(res.data[0].name).toBe("Hair Styling");
      expect(res.data[0].organizationId).toBe("org_global_123");
      expect((res.data[0] as unknown as Record<string, unknown>).branchId).toBeUndefined();
    });
  });

  describe("GET /services/categories/:id (Single)", () => {
    it("fetches a single category with branchScope none and normalizes ID", async () => {
      const mockRaw: RawServiceCategoryDTO = {
        _id: "cat_2",
        name: "Spa & Wellness",
        displayOrder: 2,
        status: "active",
        organizationId: "org_global_123",
      };

      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockRaw },
      });

      const res = await getServiceCategory("cat_2");

      expect(apiClient.get).toHaveBeenCalledWith("/services/categories/cat_2", {
        branchScope: "none",
      });
      expect(res.id).toBe("cat_2");
      expect(res.isActive).toBe(true);
      expect((res as unknown as Record<string, unknown>).branchId).toBeUndefined();
    });
  });

  describe("POST /services/categories (Create)", () => {
    it("submits category create payload without branchId or organizationId", async () => {
      const payload: ServiceCategoryCreatePayload = {
        name: "Nails & Care",
        description: "Manicure and Pedicure treatments",
        displayOrder: 3,
      };

      const mockCreated: RawServiceCategoryDTO = {
        _id: "cat_3",
        name: "Nails & Care",
        description: "Manicure and Pedicure treatments",
        displayOrder: 3,
        isActive: true,
        organizationId: "org_global_123",
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockCreated },
      });

      const res = await createServiceCategory(payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/services/categories",
        {
          name: "Nails & Care",
          description: "Manicure and Pedicure treatments",
          displayOrder: 3,
        },
        { branchScope: "none" },
      );

      // Verify no branchId in request body
      const postBody = (apiClient.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(postBody.branchId).toBeUndefined();
      expect(postBody.organizationId).toBeUndefined();

      expect(res.id).toBe("cat_3");
      expect(res.name).toBe("Nails & Care");
    });
  });

  describe("PUT /services/categories/:id (Update)", () => {
    it("submits update payload with branchScope none and no branchId", async () => {
      const payload: ServiceCategoryUpdatePayload = {
        name: "Nails & Pedicure Deluxe",
        displayOrder: 4,
      };

      const mockUpdated: RawServiceCategoryDTO = {
        _id: "cat_3",
        name: "Nails & Pedicure Deluxe",
        displayOrder: 4,
        isActive: true,
        organizationId: "org_global_123",
      };

      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockUpdated },
      });

      const res = await updateServiceCategory("cat_3", payload);

      expect(apiClient.put).toHaveBeenCalledWith(
        "/services/categories/cat_3",
        payload,
        { branchScope: "none" },
      );

      const putBody = (apiClient.put as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(putBody.branchId).toBeUndefined();
      expect(putBody.organizationId).toBeUndefined();

      expect(res.name).toBe("Nails & Pedicure Deluxe");
    });
  });

  describe("DELETE /services/categories/:id (Deactivate)", () => {
    it("calls DELETE /services/categories/:id with branchScope none", async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      await deleteServiceCategory("cat_3");

      expect(apiClient.delete).toHaveBeenCalledWith("/services/categories/cat_3", {
        branchScope: "none",
      });
    });
  });

  describe("PATCH /services/categories/:id/reactivate (Reactivate)", () => {
    it("calls PATCH /services/categories/:id/reactivate with branchScope none", async () => {
      const mockReactivated: RawServiceCategoryDTO = {
        _id: "cat_3",
        name: "Nails & Pedicure Deluxe",
        isActive: true,
        organizationId: "org_global_123",
      };

      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: mockReactivated },
      });

      const res = await reactivateServiceCategory("cat_3");

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/services/categories/cat_3/reactivate",
        {},
        { branchScope: "none" },
      );
      expect(res.id).toBe("cat_3");
      expect(res.isActive).toBe(true);
    });
  });
});
