export interface ApiResponse<T> {
  success: boolean;
  status: string;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  status: string;
  message?: string;
  data: T[];
  meta?: {
    total: number;
    page: string | number;
    limit: string | number;
    totalPages: number;
  };
}
