export interface ServiceFilters {
  search?: string;
  status?: string;
  categoryId?: string;
  page?: number;
  limit?: number | "all";
  sort?: string;
  order?: "asc" | "desc";
  gender?: "male" | "female" | "unisex";
  customerGender?: "male" | "female" | "other" | "prefer_not_to_say";
}

export interface ServiceCategoryFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number | "all";
}
