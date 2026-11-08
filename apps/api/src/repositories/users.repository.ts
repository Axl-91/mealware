import type { UpdateUserInput } from "@mealware/shared";
import { db } from "../database/database.js";

interface CreateUserRepositoryInput {
  restaurantId: string;
  name: string;
  email: string;
  passwordHash: string;
}

const isUniqueViolation = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
};

export const createUser = async ({
  restaurantId,
  name,
  email,
  passwordHash,
}: CreateUserRepositoryInput) => {
  try {
    return await db
      .insertInto("users")
      .values({
        restaurant_id: restaurantId,
        name,
        email,
        password_hash: passwordHash,
        role: "EMPLOYEE",
      })
      .returning(["id", "name", "email", "role", "is_active", "created_at"])
      .executeTakeFirstOrThrow();
  } catch (error) {
    if (isUniqueViolation(error)) {
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

export const getUserById = async (userId: string, restaurantId: string) => {
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
    .where("id", "=", userId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .executeTakeFirst();
};

export const updateUser = async (
  userId: string,
  restaurantId: string,
  input: UpdateUserInput,
) => {
  try {
    const user = await db
      .updateTable("users")
      .set({
        name: input.name,
        email: input.email,
        updated_at: new Date(),
      })
      .where("id", "=", userId)
      .where("restaurant_id", "=", restaurantId)
      .where("is_active", "=", true)
      .returning([
        "id",
        "name",
        "email",
        "role",
        "is_active",
        "created_at",
        "updated_at",
      ])
      .executeTakeFirst();

    if (!user) {
      return { status: "not_found" } as const;
    }

    return {
      status: "updated",
      user,
    } as const;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "email_exists" } as const;
    }

    throw error;
  }
};

export const deactivateUser = async (userId: string, restaurantId: string) => {
  const user = await db
    .updateTable("users")
    .set({
      is_active: false,
      updated_at: new Date(),
    })
    .where("id", "=", userId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .where("role", "=", "EMPLOYEE")
    .returning("id")
    .executeTakeFirst();

  return user;
};
