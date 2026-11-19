import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@mealware/shared";
import { apiRequest } from "@/lib/api";

export type CategoryStatus = "active" | "archived";

export interface Category {
  id: string;
  name: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoriesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatus;
}

export interface GetCategoriesResponse {
  categories: Category[];
  pagination: CategoriesPagination;
}

export interface GetCategoryResponse {
  category: Category;
}

export interface CreateCategoryResponse {
  category: Category;
}

export interface UpdateCategoryResponse {
  category: Category;
}

export interface CategoryActionResponse {
  message: string;
}

export const getCategories = (params: GetCategoriesParams = {}) => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();

  return apiRequest<GetCategoriesResponse>(
    `/categories${query ? `?${query}` : ""}`,
  );
};

export const getCategoryById = (categoryId: string) =>
  apiRequest<GetCategoryResponse>(`/categories/${categoryId}`);

export const createCategory = (input: CreateCategoryInput) =>
  apiRequest<CreateCategoryResponse>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateCategory = (
  categoryId: string,
  input: UpdateCategoryInput,
) =>
  apiRequest<UpdateCategoryResponse>(`/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });

export const deactivateCategory = (categoryId: string) =>
  apiRequest<CategoryActionResponse>(`/categories/${categoryId}`, {
    method: "DELETE",
  });

export const reactivateCategory = (categoryId: string) =>
  apiRequest<CategoryActionResponse>(`/categories/${categoryId}/reactivate`, {
    method: "PUT",
  });
