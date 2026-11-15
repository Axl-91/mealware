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
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("POST /api/v1/users", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>> | undefined;

  let createdUserId: string | undefined;
  let createdUserEmail: string | undefined;

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
        userIds: createdUserId ? [createdUserId] : [],
        userEmails: createdUserEmail ? [createdUserEmail] : [],
      });
    } finally {
      try {
        await employee?.cleanup();
      } finally {
        try {
          await admin.cleanup();
        } finally {
          createdUserId = undefined;
          createdUserEmail = undefined;
          employee = undefined;
        }
      }
    }
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should create an employee successfully", async () => {
    const userData = {
      name: `Test Employee ${randomUUID()}`,
      email: `employee-${randomUUID()}@mealware.test`,
      password: `TestPassword-${randomUUID()}!`,
    };

    createdUserEmail = userData.email;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        cookie: admin.cookie,
      },
      payload: userData,
    });

    expect(response.statusCode).toBe(201);

    const { user } = response.json();

    createdUserId = user.id;

    expect(user).toMatchObject({
      name: userData.name,
      email: userData.email,
      role: USER_ROLES.EMPLOYEE,
      is_active: true,
    });

    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("password_hash");
  });

  it("should return 409 when email already exists", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        cookie: admin.cookie,
      },
      payload: {
        name: `Test Employee ${randomUUID()}`,
        email: admin.user.email,
        password: `TestPassword-${randomUUID()}!`,
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 400 when the request body is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        cookie: admin.cookie,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: {
        name: `Test Employee ${randomUUID()}`,
        email: `employee-${randomUUID()}@mealware.test`,
        password: `TestPassword-${randomUUID()}!`,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 403 when the authenticated user is an employee", async () => {
    employee = await createTestUserWithAuth(app, {
      name: `Test Employee ${randomUUID()}`,
      password: `EmployeePassword-${randomUUID()}!`,
      role: USER_ROLES.EMPLOYEE,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        cookie: employee.cookie,
      },
      payload: {
        name: `Test Employee ${randomUUID()}`,
        email: `employee-${randomUUID()}@mealware.test`,
        password: `TestPassword-${randomUUID()}!`,
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
