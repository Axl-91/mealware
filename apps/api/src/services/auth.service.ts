import type { LoginInput } from "@mealware/shared";
import { verifyPassword } from "../auth/password.js";
import * as authRepository from "../repositories/auth.repository.js";

export const authenticateUser = async ({ email, password }: LoginInput) => {
  const user = await authRepository.getUserByEmail(email);

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
  return authRepository.getUserById(userId, restaurantId);
};
