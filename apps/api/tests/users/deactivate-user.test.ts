import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUser } from "../helpers/fixtures/users.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("DELETE /api/v1/users/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let createdUserIds: string[] = [];
  let createdUserEmails: string[] = [];
  let createdRestaurantIds: string[] = [];

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    admin = await createTestUserWithAuth(app, {
      name: `Test Admin ${randomUUID()}`,
      password: `AdminPassword-${randomUUID()}!`,
      role: USER_ROLES.ADMIN,
    });
  });

  afterEach(async () => {
    try {
      await cleanupTestData({
        userIds: createdUserIds,
        userEmails: createdUserEmails,
        restaurantIds: createdRestaurantIds,
      });
    } finally {
      await admin.cleanup();

      createdUserIds = [];
      createdUserEmails = [];
      createdRestaurantIds = [];
    }
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should deactivate an employee successfully", async () => {
    const employee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Test Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id);
    createdUserEmails.push(employee.email);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${employee.id}`,
      headers: {
        cookie: admin.cookie,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "User deactivated successfully",
    });

    const deactivatedUser = await db
      .selectFrom("users")
      .select(["id", "is_active"])
      .where("id", "=", employee.id)
      .executeTakeFirst();

    expect(deactivatedUser).toEqual({
      id: employee.id,
      is_active: false,
    });
  });

  it("should return 404 when the user does not exist", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${randomUUID()}`,
      headers: {
        cookie: admin.cookie,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("should return 404 when the user belongs to another restaurant", async () => {
    const otherUser = await createTestUser({
      name: `Other Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(otherUser.id);
    createdUserEmails.push(otherUser.email);
    createdRestaurantIds.push(otherUser.restaurant_id);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${otherUser.id}`,
      headers: {
        cookie: admin.cookie,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("should return 404 when the user is already inactive", async () => {
    const inactiveUser = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Inactive Employee ${randomUUID()}`,
      isActive: false,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(inactiveUser.id);
    createdUserEmails.push(inactiveUser.email);

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${inactiveUser.id}`,
      headers: {
        cookie: admin.cookie,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("should return 404 when trying to deactivate an admin", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${admin.user.id}`,
      headers: {
        cookie: admin.cookie,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 403 when the authenticated user is an employee", async () => {
    const employee = await createTestUserWithAuth(app, {
      restaurantId: admin.user.restaurant_id,
      name: `Test Employee ${randomUUID()}`,
      password: `EmployeePassword-${randomUUID()}!`,
      role: USER_ROLES.EMPLOYEE,
    });

    try {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/users/${admin.user.id}`,
        headers: {
          cookie: employee.cookie,
        },
      });

      expect(response.statusCode).toBe(403);
    } finally {
      await employee.cleanup();
    }
  });
});
