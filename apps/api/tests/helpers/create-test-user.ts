import type { FastifyInstance } from "fastify";
import type { CreateTestUserInput } from "./fixtures/users.js";
import { createTestUser } from "./fixtures/users.js";
import { cleanupTestData } from "./cleanup.js";
import { login } from "./auth.js";

export const createTestUserWithCleanup = async (
  input: CreateTestUserInput = {},
) => {
  const user = await createTestUser(input);

  return {
    user,
    cleanup: async () => {
      await cleanupTestData({
        userIds: [user.id],
        restaurantIds: input.restaurantId ? [] : [user.restaurant_id],
      });
    },
  };
};

export const createTestUserWithAuth = async (
  app: FastifyInstance,
  input: CreateTestUserInput = {},
) => {
  const fixture = await createTestUserWithCleanup(input);

  try {
    const cookie = await login(
      app,
      fixture.user.email,
      fixture.user.plainPassword,
    );

    return {
      ...fixture,
      cookie,
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
};
