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
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";

describe("POST /api/v1/auth/login", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;
  let credentials: { email: string; password: string };
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    app = await appPromise;
  });

  beforeEach(async () => {
    const fixture = await createTestUserWithCleanup();

    credentials = {
      email: fixture.user.email,
      password: fixture.user.plainPassword,
    };

    cleanup = fixture.cleanup;
  });

  afterEach(async () => {
    await cleanup?.();
    cleanup = undefined;
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should authenticate a user with valid credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: credentials,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Login successful",
    });

    expect(response.headers["set-cookie"]?.toString()).toContain(
      "mealware_token=",
    );
  });

  it("should reject a user with an incorrect password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        ...credentials,
        password: `WrongPassword-${randomUUID()}!`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should reject a user that does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: `unknown-${randomUUID()}@mealware.test`,
        password: `TestPassword-${randomUUID()}!`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should reject an inactive user", async () => {
    const fixture = await createTestUserWithCleanup({
      isActive: false,
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: fixture.user.email,
          password: fixture.user.plainPassword,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
    } finally {
      await fixture.cleanup();
    }
  });

  it("should return 400 when the request body is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});
