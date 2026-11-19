import type { UpdateCategoryInput } from "@mealware/shared";
import { db } from "../database/database.js";
import { isUniqueViolation } from "../utils/database.js";
import { GetCategoriesPaginatedInput } from "../database/types/categories.js";

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

export const getCategoriesPaginated = async ({
  page,
  limit,
  search,
  status,
}: GetCategoriesPaginatedInput) => {
  const offset = (page - 1) * limit;
  const normalizedSearch = search?.trim();

  let countQuery = db
    .selectFrom("categories")
    .select((eb) => eb.fn.countAll<number>().as("total"));

  let categoriesQuery = db
    .selectFrom("categories")
    .select([
      "id",
      "name",
      "created_by",
      "is_active",
      "created_at",
      "updated_at",
    ]);

  const isActive = status === "active";

  countQuery = countQuery.where("is_active", "=", isActive);
  categoriesQuery = categoriesQuery.where("is_active", "=", isActive);

  if (normalizedSearch) {
    const searchTerm = `%${normalizedSearch}%`;

    countQuery = countQuery.where("name", "ilike", searchTerm);
    categoriesQuery = categoriesQuery.where("name", "ilike", searchTerm);
  }

  const [countResult, categories] = await Promise.all([
    countQuery.executeTakeFirstOrThrow(),
    categoriesQuery
      .orderBy("name", "asc")
      .limit(limit)
      .offset(offset)
      .execute(),
  ]);

  const total = Number(countResult.total);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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

export const getCategoryByIdIncludingArchived = async (categoryId: string) => {
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
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("menu_items")
            .select("id")
            .whereRef("menu_items.category_id", "=", "categories.id")
            .where("menu_items.is_active", "=", true),
        ),
      ),
    )
    .returning("id")
    .executeTakeFirst();

  if (category) {
    return { status: "deactivated" } as const;
  }

  const existingCategory = await db
    .selectFrom("categories")
    .select("id")
    .where("id", "=", categoryId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!existingCategory) {
    return { status: "not_found" } as const;
  }

  return { status: "in_use" } as const;
};

export const reactivateCategory = async (categoryId: string) => {
  const category = await db
    .updateTable("categories")
    .set({
      is_active: true,
      updated_at: new Date(),
    })
    .where("id", "=", categoryId)
    .where("is_active", "=", false)
    .returning("id")
    .executeTakeFirst();

  if (!category) {
    return { status: "not_found" } as const;
  }

  return { status: "reactivated" } as const;
};
