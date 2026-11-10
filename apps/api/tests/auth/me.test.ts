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
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";

describe("GET /api/v1/auth/me", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;
  let userId: string;
  let userName: string;
  let userEmail: string;
  let userPassword: string;
  let cookie: string;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    const fixture = await createTestUserWithCleanup({
      name: `Test User ${randomUUID()}`,
      password: `TestPassword-${randomUUID()}!`,
      role: USER_ROLES.EMPLOYEE,
    });

    userId = fixture.user.id;
    userName = fixture.user.name;
    userEmail = fixture.user.email;
    userPassword = fixture.user.plainPassword;
    cleanup = fixture.cleanup;

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: userEmail,
        password: userPassword,
      },
    });

    cookie = loginResponse.headers["set-cookie"]!.toString();
  });

  afterEach(async () => {
    await cleanup?.();
    cleanup = undefined;
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should return the authenticated user", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        cookie,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        role: USER_ROLES.EMPLOYEE,
      },
    });

    expect(response.json().user).not.toHaveProperty("password");
    expect(response.json().user).not.toHaveProperty("password_hash");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 401 when the authenticated user has been deactivated", async () => {
    await db
      .updateTable("users")
      .set({
        is_active: false,
      })
      .where("id", "=", userId)
      .execute();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        cookie,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
