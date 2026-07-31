export interface ServiceFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ServiceCategoryFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}
