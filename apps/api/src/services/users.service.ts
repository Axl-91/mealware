import type { CreateUserInput } from "@mealware/shared";
import { db } from "../database/database.js";
import { hashPassword } from "../auth/password.js";

export const createUser = async (
  input: CreateUserInput,
  restaurantId: string,
) => {
  const passwordHash = await hashPassword(input.password);

  try {
    return await db
      .insertInto("users")
      .values({
        restaurant_id: restaurantId,
        name: input.name,
        email: input.email,
        password_hash: passwordHash,
        role: "EMPLOYEE",
      })
      .returning(["id", "name", "email", "role", "is_active", "created_at"])
      .executeTakeFirstOrThrow();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return null;
    }

    throw error;
  }
};

export const getUsers = async (restaurantId: string) => {
  return db
    .selectFrom("users")
    .select([
      "id",
      "name",
      "email",
      "role",
      "is_active",
      "created_at",
      "updated_at",
    ])
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .orderBy("created_at", "desc")
    .execute();
};
