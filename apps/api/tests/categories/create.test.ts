import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";
import { createTestUser } from "../helpers/fixtures/users.js";

describe("POST /api/v1/categories", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employeeFixture: Awaited<ReturnType<typeof createTestUserWithCleanup>>;

  let adminUser: Awaited<ReturnType<typeof createTestUser>>;

  let employeeCookie: string;
  let adminCookie: string;

  const categoryIds: string[] = [];

  const login = async (email: string, password: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email,
        password,
      },
    });

    expect(response.statusCode).toBe(200);

    const setCookie = response.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;

    expect(cookie).toBeDefined();

    return cookie!.split(";")[0]!;
  };

  const createCategory = async (name: string, cookie: string) => {
    return app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        cookie,
      },
      payload: {
        name,
      },
    });
  };

  beforeAll(async () => {
    app = await appPromise;

    employeeFixture = await createTestUserWithCleanup();

    adminUser = await createTestUser({
      role: USER_ROLES.ADMIN,
    });

    employeeCookie = await login(
      employeeFixture.user.email,
      employeeFixture.user.plainPassword,
    );

    adminCookie = await login(adminUser.email, adminUser.plainPassword);
  });

  afterAll(async () => {
    await cleanupTestData({
      categoryIds,
    });

    await employeeFixture.cleanup();

    await cleanupTestData({
      userIds: [adminUser.id],
      restaurantIds: [adminUser.restaurant_id],
    });

    await app.close();
    await db.destroy();
  });

  it("should create a category as an employee", async () => {
    const response = await createCategory(
      "  Bebidas   frias  ",
      employeeCookie,
    );

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.category).toMatchObject({
      name: "Bebidas frias",
      created_by: employeeFixture.user.id,
      is_active: true,
    });

    expect(body.category.id).toBeDefined();
    expect(body.category.created_at).toBeDefined();

    categoryIds.push(body.category.id);
  });

  it("should create a category as an admin", async () => {
    const response = await createCategory("Hamburguesas", adminCookie);

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.category).toMatchObject({
      name: "Hamburguesas",
      created_by: adminUser.id,
      is_active: true,
    });

    expect(body.category.id).toBeDefined();

    categoryIds.push(body.category.id);
  });

  it("should return 400 when the category name is empty", async () => {
    const response = await createCategory("", employeeCookie);

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("should return 400 when the category name contains a period", async () => {
    const response = await createCategory("Bebidas. Frias", employeeCookie);

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });

  it("should return 409 when a category name already exists", async () => {
    const firstResponse = await createCategory("Postres", employeeCookie);

    expect(firstResponse.statusCode).toBe(201);

    const firstCategory = firstResponse.json().category;
    categoryIds.push(firstCategory.id);

    const secondResponse = await createCategory("  postres  ", adminCookie);

    expect(secondResponse.statusCode).toBe(409);

    expect(secondResponse.json()).toMatchObject({
      error: {
        code: "CATEGORY_NAME_ALREADY_EXISTS",
        message: "Category name already exists",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      payload: {
        name: "Sin autenticacion",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
