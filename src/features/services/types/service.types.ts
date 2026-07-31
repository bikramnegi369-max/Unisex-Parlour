export interface Service {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  categoryId: string | { _id: string; name: string };
  duration: number; // in minutes
  pricing: {
    basePrice: number;
    specialPrice?: number;
  };
  taxable: boolean;
  taxRate?: number;
  displayOrder: number;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type ServicePayload = Omit<Partial<Service>, "id" | "organizationId" | "branchId" | "isActive">;
