import type { UpdateCategoryInput } from "@mealware/shared";
import { db } from "../database/database.js";
import { isUniqueViolation } from "../utils/database.js";

interface CreateCategoryRepositoryInput {
  name: string;
  createdBy: string;
}

export const createCategory = async ({
  name,
  createdBy,
}: CreateCategoryRepositoryInput) => {
  try {
    return await db
      .insertInto("categories")
      .values({
        name,
        created_by: createdBy,
      })
      .returning(["id", "name", "created_by", "is_active", "created_at"])
      .executeTakeFirstOrThrow();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return null;
    }

    throw error;
  }
};

export const getCategories = async () => {
  return db
    .selectFrom("categories")
    .select([
      "id",
      "name",
      "created_by",
      "is_active",
      "created_at",
      "updated_at",
    ])
    .where("is_active", "=", true)
    .orderBy("name", "asc")
    .execute();
};

export const getCategoryById = async (categoryId: string) => {
  return db
    .selectFrom("categories")
    .select([
      "id",
      "name",
      "created_by",
      "is_active",
      "created_at",
      "updated_at",
    ])
    .where("id", "=", categoryId)
    .where("is_active", "=", true)
    .executeTakeFirst();
};

export const updateCategory = async (
  categoryId: string,
  input: UpdateCategoryInput,
) => {
  try {
    const category = await db
      .updateTable("categories")
      .set({
        name: input.name,
        updated_at: new Date(),
      })
      .where("id", "=", categoryId)
      .where("is_active", "=", true)
      .returning([
        "id",
        "name",
        "created_by",
        "is_active",
        "created_at",
        "updated_at",
      ])
      .executeTakeFirst();

    if (!category) {
      return { status: "not_found" } as const;
    }

    return {
      status: "updated",
      category,
    } as const;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "name_exists" } as const;
    }

    throw error;
  }
};

export const deactivateCategory = async (categoryId: string) => {
  const category = await db
    .updateTable("categories")
    .set({
      is_active: false,
      updated_at: new Date(),
    })
    .where("id", "=", categoryId)
    .where("is_active", "=", true)
    .returning("id")
    .executeTakeFirst();

  if (!category) {
    return { status: "not_found" } as const;
  }

  return { status: "deactivated" } as const;
};
