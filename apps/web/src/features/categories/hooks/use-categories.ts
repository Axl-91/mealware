import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deactivateCategory,
  getCategories,
  getCategoryById,
  reactivateCategory,
  updateCategory,
  type GetCategoriesParams,
} from "../api/categories-api";

export const CATEGORIES_QUERY_KEY = ["categories"];

export const useCategories = (params: GetCategoriesParams) =>
  useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "list", params],
    queryFn: () => getCategories(params),
  });

export const useCategory = (categoryId: string) =>
  useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "detail", categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: Boolean(categoryId),
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEY,
      });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      input,
    }: {
      categoryId: string;
      input: Parameters<typeof updateCategory>[1];
    }) => updateCategory(categoryId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEY,
      });
    },
  });
};

export const useDeactivateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEY,
      });
    },
  });
};

export const useReactivateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEY,
      });
    },
  });
};
