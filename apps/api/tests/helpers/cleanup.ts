import { db } from "../../src/database/database.js";

interface CleanupTestDataInput {
  orderIds?: string[];
  menuItemIds?: string[];
  categoryIds?: string[];
  userIds?: string[];
  userEmails?: string[];
  restaurantIds?: string[];
}

export const cleanupTestData = async ({
  orderIds = [],
  menuItemIds = [],
  categoryIds = [],
  userIds = [],
  userEmails = [],
  restaurantIds = [],
}: CleanupTestDataInput = {}) => {
  if (orderIds.length > 0) {
    await db.deleteFrom("orders").where("id", "in", orderIds).execute();
  }

  if (menuItemIds.length > 0) {
    await db.deleteFrom("menu_items").where("id", "in", menuItemIds).execute();
  }

  if (categoryIds.length > 0) {
    await db.deleteFrom("categories").where("id", "in", categoryIds).execute();
  }

  if (userIds.length > 0) {
    await db.deleteFrom("users").where("id", "in", userIds).execute();
  }

  if (userEmails.length > 0) {
    await db.deleteFrom("users").where("email", "in", userEmails).execute();
  }

  if (restaurantIds.length > 0) {
    await db
      .deleteFrom("restaurants")
      .where("id", "in", restaurantIds)
      .execute();
  }
};
