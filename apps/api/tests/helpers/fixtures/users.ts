import { randomUUID } from "node:crypto";
import { db } from "../../../src/database/database.js";
import { hashPassword } from "../../../src/auth/password.js";
import { USER_ROLES } from "@mealware/shared";
import { createTestRestaurant } from "./restaurants.js";

interface CreateTestUserInput {
  restaurantId?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: (typeof USER_ROLES)[keyof typeof USER_ROLES];
  isActive?: boolean;
}

export const createTestUser = async ({
  restaurantId,
  name = "Test User",
  email = `test-${randomUUID()}@mealware.test`,
  password = "TestPassword123!",
  role = USER_ROLES.EMPLOYEE,
  isActive = true,
}: CreateTestUserInput = {}) => {
  const restaurant = restaurantId ? null : await createTestRestaurant();

  const passwordHash = await hashPassword(password);

  const user = await db
    .insertInto("users")
    .values({
      restaurant_id: restaurantId ?? restaurant!.id,
      name,
      email,
      password_hash: passwordHash,
      role,
      is_active: isActive,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    ...user,
    plainPassword: password,
  };
};
