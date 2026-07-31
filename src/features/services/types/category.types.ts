export interface ServiceCategory {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceCategoryPayload = Omit<Partial<ServiceCategory>, "id" | "organizationId" | "branchId" | "isActive">;
