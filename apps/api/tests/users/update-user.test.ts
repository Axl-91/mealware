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

describe("PUT /api/v1/users/:id", () => {
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
      try {
        await admin.cleanup();
      } finally {
        createdUserIds = [];
        createdUserEmails = [];
        createdRestaurantIds = [];
      }
    }
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should update a user's name and email successfully", async () => {
    const employee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Test Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id);
    createdUserEmails.push(employee.email);

    const updatedData = {
      name: `Updated Employee ${randomUUID()}`,
      email: `updated-${randomUUID()}@mealware.test`,
    };

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${employee.id}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: updatedData,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        id: employee.id,
        name: updatedData.name,
        email: updatedData.email,
        role: USER_ROLES.EMPLOYEE,
        is_active: true,
      },
    });
  });

  it("should return 409 when the email already belongs to another user", async () => {
    const employee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Test Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    const anotherEmployee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Another Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id, anotherEmployee.id);
    createdUserEmails.push(employee.email, anotherEmployee.email);

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${employee.id}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: anotherEmployee.email,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email already exists",
      },
    });
  });

  it("should return 404 when the user does not exist", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${randomUUID()}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: `updated-${randomUUID()}@mealware.test`,
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
      method: "PUT",
      url: `/api/v1/users/${otherUser.id}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: `updated-${randomUUID()}@mealware.test`,
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

  it("should return 404 when the user is inactive", async () => {
    const inactiveUser = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Inactive Employee ${randomUUID()}`,
      isActive: false,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(inactiveUser.id);
    createdUserEmails.push(inactiveUser.email);

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${inactiveUser.id}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: `updated-${randomUUID()}@mealware.test`,
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

  it("should return 400 when the request body is invalid", async () => {
    const employee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
      name: `Test Employee ${randomUUID()}`,
      role: USER_ROLES.EMPLOYEE,
    });

    createdUserIds.push(employee.id);
    createdUserEmails.push(employee.email);

    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${employee.id}`,
      headers: {
        cookie: admin.cookie,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/users/${randomUUID()}`,
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: `updated-${randomUUID()}@mealware.test`,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 403 when the authenticated user is an employee", async () => {
    const employee = await createTestUser({
      restaurantId: admin.user.restaurant_id,
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
      method: "PUT",
      url: `/api/v1/users/${employee.id}`,
      headers: {
        cookie: employeeCookie,
      },
      payload: {
        name: `Updated Employee ${randomUUID()}`,
        email: `updated-${randomUUID()}@mealware.test`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
