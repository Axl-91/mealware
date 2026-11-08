import { db } from "../database/database.js";

export const getUserByEmail = async (email: string) => {
  return db
    .selectFrom("users")
    .select([
      "id",
      "restaurant_id",
      "name",
      "email",
      "password_hash",
      "role",
      "is_active",
    ])
    .where("email", "=", email)
    .executeTakeFirst();
};

export const getUserById = async (userId: string, restaurantId: string) => {
  return db
    .selectFrom("users")
    .select(["id", "name", "email", "role"])
    .where("id", "=", userId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .executeTakeFirst();
};
