export interface ServiceCategory {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategoryCreatePayload {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface ServiceCategoryUpdatePayload {
  name?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type ServiceCategoryPayload = ServiceCategoryCreatePayload | ServiceCategoryUpdatePayload;
