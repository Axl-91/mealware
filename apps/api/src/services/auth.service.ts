import { db } from "../database/database.js";
import { verifyPassword } from "../auth/password.js";

interface AuthenticateUserInput {
  email: string;
  password: string;
}

export const authenticateUser = async ({
  email,
  password,
}: AuthenticateUserInput) => {
  const user = await db
    .selectFrom("users")
    .select(["id", "restaurant_id", "password_hash", "role", "is_active"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user || !user.is_active) {
    return null;
  }

  const isPasswordValid = await verifyPassword(user.password_hash, password);

  if (!isPasswordValid) {
    return null;
  }

  return {
    sub: user.id,
    restaurantId: user.restaurant_id,
    role: user.role,
  };
};

interface GetAuthenticatedUserInput {
  userId: string;
  restaurantId: string;
}

export const getAuthenticatedUser = async ({
  userId,
  restaurantId,
}: GetAuthenticatedUserInput) => {
  return db
    .selectFrom("users")
    .select(["id", "name", "email", "role"])
    .where("id", "=", userId)
    .where("restaurant_id", "=", restaurantId)
    .where("is_active", "=", true)
    .executeTakeFirst();
};
