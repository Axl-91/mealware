import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";

describe("POST /api/v1/auth/logout", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  beforeAll(async () => {
    app = await appPromise;
  });

  afterAll(async () => {
    await app.close();
    await db.destroy();
  });

  it("should logout successfully and clear the authentication cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Logout successful",
    });

    const setCookie = response.headers["set-cookie"]?.toString();

    expect(setCookie).toContain("mealware_token=");
    expect(setCookie).toMatch(/Max-Age=0/i);
  });

  it("should logout successfully even when the user is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Logout successful",
    });
  });
});
