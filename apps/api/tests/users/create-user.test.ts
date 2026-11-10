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
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";

describe("POST /api/v1/users", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;
  let adminCookie: string;
  let adminEmail: string;
  let createdUserId: string | undefined;
  let createdUserEmail: string | undefined;
  let cleanupAdmin: (() => Promise<void>) | undefined;
  let cleanupEmployee: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    const fixture = await createTestUserWithCleanup({
      name: `Test Admin ${randomUUID()}`,
      password: `AdminPassword-${randomUUID()}!`,
      role: USER_ROLES.ADMIN,
    });

    cleanupAdmin = fixture.cleanup;
    adminEmail = fixture.user.email;

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
        userIds: createdUserId ? [createdUserId] : [],
        userEmails: createdUserEmail ? [createdUserEmail] : [],
      });
    } finally {
      try {
        await cleanupEmployee?.();
      } finally {
        try {
          await cleanupAdmin?.();
        } finally {
          createdUserId = undefined;
          createdUserEmail = undefined;
          cleanupEmployee = undefined;
          cleanupAdmin = undefined;
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
        cookie: adminCookie,
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
        cookie: adminCookie,
      },
      payload: {
        name: `Test Employee ${randomUUID()}`,
        email: adminEmail,
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
        cookie: adminCookie,
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
    const fixture = await createTestUserWithCleanup({
      name: `Test Employee ${randomUUID()}`,
      password: `EmployeePassword-${randomUUID()}!`,
      role: USER_ROLES.EMPLOYEE,
    });

    cleanupEmployee = fixture.cleanup;

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: fixture.user.email,
        password: fixture.user.plainPassword,
      },
    });

    const employeeCookie = loginResponse.headers["set-cookie"]!.toString();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        cookie: employeeCookie,
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
