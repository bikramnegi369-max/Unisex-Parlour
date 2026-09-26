export interface ServiceFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  limit?: number | "all";
  sort?: string;
  order?: "asc" | "desc";
}

export interface ServiceCategoryFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number | "all";
}
