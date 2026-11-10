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
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";

describe("GET /api/v1/users", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;
  let adminCookie: string;
  let adminRestaurantId: string;
  let adminCleanup: (() => Promise<void>) | undefined;

  let createdUserIds: string[] = [];
  let createdUserEmails: string[] = [];
  let createdRestaurantIds: string[] = [];

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    const fixture = await createTestUserWithCleanup({
      name: `Test Admin ${randomUUID()}`,
      password: `AdminPassword-${randomUUID()}!`,
      role: USER_ROLES.ADMIN,
    });

    adminCleanup = fixture.cleanup;
    adminRestaurantId = fixture.user.restaurant_id;

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: fixture.user.email,
        password: fixture.user.plainPassword,
      },
    });

    adminCookie = loginResponse.headers["set-cookie"]!.toString();
  });

  afterEach(async () => {
    try {
      await cleanupTestData({
        userIds: createdUserIds,
        userEmails: createdUserEmails,
        restaurantIds: createdRestaurantIds,
      });
    } finally {
      try {
        await adminCleanup?.();
      } finally {
        createdUserIds = [];
        createdUserEmails = [];
        createdRestaurantIds = [];
        adminCleanup = undefined;
      }
    }
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should return active users from the admin's restaurant", async () => {
    const employee = await createTestUser({
      restaurantId: adminRestaurantId,
      name: `Test Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id);
    createdUserEmails.push(employee.email);

    const otherUser = await createTestUser({
      name: `Other Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(otherUser.id);
    createdUserEmails.push(otherUser.email);
    createdRestaurantIds.push(otherUser.restaurant_id);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: {
        cookie: adminCookie,
      },
    });

    expect(response.statusCode).toBe(200);

    const { users } = response.json();

    expect(users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employee.id,
          email: employee.email,
        }),
      ]),
    );

    expect(users).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: otherUser.id,
        }),
      ]),
    );
  });

  it("should not return inactive users", async () => {
    const inactiveUser = await createTestUser({
      restaurantId: adminRestaurantId,
      name: `Inactive Employee ${randomUUID()}`,
      isActive: false,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(inactiveUser.id);
    createdUserEmails.push(inactiveUser.email);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: {
        cookie: adminCookie,
      },
    });

    expect(response.statusCode).toBe(200);

    const { users } = response.json();

    expect(users).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: inactiveUser.id,
        }),
      ]),
    );
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 403 when the authenticated user is an employee", async () => {
    const employee = await createTestUser({
      restaurantId: adminRestaurantId,
      name: `Test Employee ${randomUUID()}`,
      password: `EmployeePassword-${randomUUID()}!`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id);
    createdUserEmails.push(employee.email);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: employee.email,
        password: employee.plainPassword,
      },
    });

    const employeeCookie = loginResponse.headers["set-cookie"]!.toString();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: {
        cookie: employeeCookie,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
