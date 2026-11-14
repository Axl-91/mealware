import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "@mealware/shared";
import { db } from "../database/database.js";
import { isUniqueViolation } from "../utils/database.js";

interface CreateMenuItemRepositoryInput extends CreateMenuItemInput {
  restaurantId: string;
}

interface UpdateMenuItemRepositoryInput extends UpdateMenuItemInput {
  menuItemId: string;
  restaurantId: string;
}

interface GetMenuItemsInput {
  restaurantId: string;
}

interface GetMenuItemByIdInput {
  menuItemId: string;
  restaurantId: string;
}

interface DeactivateMenuItemInput {
  menuItemId: string;
  restaurantId: string;
}

export const createMenuItem = async ({
  restaurantId,
  categoryId,
  name,
  description,
  price,
}: CreateMenuItemRepositoryInput) => {
  const category = await db
    .selectFrom("categories")
    .select("id")
    .where("id", "=", categoryId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!category) {
    return { status: "category_not_found" as const };
  }

  try {
    const menuItem = await db
      .insertInto("menu_items")
      .values({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description: description ?? null,
        price: price.toFixed(2),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: "created" as const,
      menuItem,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "name_exists" as const };
    }

    throw error;
  }
};

export const getMenuItems = async ({ restaurantId }: GetMenuItemsInput) => {
  return db
    .selectFrom("menu_items")
    .selectAll()
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .orderBy("name", "asc")
    .execute();
};

export const getMenuItemById = async ({
  menuItemId,
  restaurantId,
}: GetMenuItemByIdInput) => {
  return db
    .selectFrom("menu_items")
    .selectAll()
    .where("id", "=", menuItemId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .executeTakeFirst();
};

export const updateMenuItem = async ({
  menuItemId,
  restaurantId,
  categoryId,
  name,
  description,
  price,
}: UpdateMenuItemRepositoryInput) => {
  const existingMenuItem = await db
    .selectFrom("menu_items")
    .select("id")
    .where("id", "=", menuItemId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!existingMenuItem) {
    return { status: "not_found" as const };
  }

  const category = await db
    .selectFrom("categories")
    .select("id")
    .where("id", "=", categoryId)
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!category) {
    return { status: "category_not_found" as const };
  }

  try {
    const menuItem = await db
      .updateTable("menu_items")
      .set({
        category_id: categoryId,
        name,
        description,
        price: price.toFixed(2),
        updated_at: new Date(),
      })
      .where("id", "=", menuItemId)
      .where("restaurant_id", "=", restaurantId)
      .where("is_active", "=", true)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: "updated" as const,
      menuItem,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "name_exists" as const };
    }

    throw error;
  }
};

export const deactivateMenuItem = async ({
  menuItemId,
  restaurantId,
}: DeactivateMenuItemInput) => {
  const menuItem = await db
    .updateTable("menu_items")
    .set({
      is_active: false,
      updated_at: new Date(),
    })
    .where("id", "=", menuItemId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .returning("id")
    .executeTakeFirst();

  if (!menuItem) {
    return { status: "not_found" as const };
  }

  return { status: "deactivated" as const };
};
