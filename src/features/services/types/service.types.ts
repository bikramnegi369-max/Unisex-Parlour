export interface Service {
  id: string;
  name: string;
  code?: string;
  description?: string;
  categoryId: string | { _id: string; name: string };
  duration: number; // in minutes
  pricing?: {
    basePrice: number;
    specialPrice?: number;
  };
  basePrice: number;
  taxable: boolean;
  taxRate?: number;
  displayOrder: number;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ServicePayload = {
  name?: string;
  code?: string;
  serviceCode?: string;
  description?: string;
  categoryId?: string | { _id: string; name: string };
  duration?: number;
  pricing?: {
    basePrice?: number;
    specialPrice?: number;
  };
  basePrice?: number;
  taxable?: boolean;
  taxRate?: number;
  taxConfiguration?: {
    taxable?: boolean;
    taxRate?: number;
  };
  status?: "active" | "inactive";
  displayOrder?: number;
};
