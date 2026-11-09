import { createTestUser } from "./fixtures/users.js";
import { cleanupTestData } from "./cleanup.js";

export const createTestUserWithCleanup = async () => {
  const user = await createTestUser();

  return {
    user,
    cleanup: async () => {
      await cleanupTestData({
        userIds: [user.id],
        restaurantIds: [user.restaurant_id],
      });
    },
  };
};
