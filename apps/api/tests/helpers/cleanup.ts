import { db } from "../../src/database/database.js";

interface CleanupTestDataInput {
  userIds?: string[];
  restaurantIds?: string[];
}

export const cleanupTestData = async ({
  userIds = [],
  restaurantIds = [],
}: CleanupTestDataInput = {}) => {
  if (userIds.length > 0) {
    await db.deleteFrom("users").where("id", "in", userIds).execute();
  }

  if (restaurantIds.length > 0) {
    await db
      .deleteFrom("restaurants")
      .where("id", "in", restaurantIds)
      .execute();
  }
};
