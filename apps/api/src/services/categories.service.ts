import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@mealware/shared";
import * as categoriesRepository from "../repositories/categories.repository.js";

export const createCategory = async (
  input: CreateCategoryInput,
  userId: string,
) => {
  return categoriesRepository.createCategory({
    name: input.name,
    createdBy: userId,
  });
};

export const getCategories = async () => {
  return categoriesRepository.getCategories();
};

export const getCategoryById = async (categoryId: string) => {
  return categoriesRepository.getCategoryById(categoryId);
};

export const updateCategory = async (
  categoryId: string,
  userId: string,
  input: UpdateCategoryInput,
) => {
  const category = await categoriesRepository.getCategoryById(categoryId);

  if (!category) {
    return { status: "not_found" } as const;
  }

  if (category.created_by !== userId) {
    return { status: "forbidden" } as const;
  }

  return categoriesRepository.updateCategory(categoryId, input);
};

export const deactivateCategory = async (
  categoryId: string,
  userId: string,
) => {
  const category = await categoriesRepository.getCategoryById(categoryId);

  if (!category) {
    return { status: "not_found" } as const;
  }

  if (category.created_by !== userId) {
    return { status: "forbidden" } as const;
  }

  return categoriesRepository.deactivateCategory(categoryId);
};
