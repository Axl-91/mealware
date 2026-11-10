import type { CreateTestUserInput } from "./fixtures/users.js";
import { createTestUser } from "./fixtures/users.js";
import { cleanupTestData } from "./cleanup.js";

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
