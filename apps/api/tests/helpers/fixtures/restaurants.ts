import { randomUUID } from "node:crypto";
import { db } from "../../../src/database/database.js";

interface CreateTestRestaurantInput {
  name?: string;
}

export const createTestRestaurant = async ({
  name = `Test Restaurant ${randomUUID()}`,
}: CreateTestRestaurantInput = {}) => {
  return db
    .insertInto("restaurants")
    .values({ name })
    .returningAll()
    .executeTakeFirstOrThrow();
};
