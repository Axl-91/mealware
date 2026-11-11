import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";
import { createTestUser } from "../helpers/fixtures/users.js";

describe("GET /api/v1/categories/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employeeFixture: Awaited<ReturnType<typeof createTestUserWithCleanup>>;

  let adminUser: Awaited<ReturnType<typeof createTestUser>>;

  let employeeCookie: string;
  let adminCookie: string;

  let employeeCategoryId: string;
  let adminCategoryId: string;
  let inactiveCategoryId: string;

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
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: {
        cookie,
      },
      payload: {
        name,
      },
    });

    expect(response.statusCode).toBe(201);

    const category = response.json().category;
    categoryIds.push(category.id);

    return category;
  };

  const getCategoryById = async (categoryId: string, cookie: string) => {
    return app.inject({
      method: "GET",
      url: `/api/v1/categories/${categoryId}`,
      headers: {
        cookie,
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

    const employeeCategory = await createCategory(
      "Employee category by ID",
      employeeCookie,
    );

    employeeCategoryId = employeeCategory.id;

    const adminCategory = await createCategory(
      "Admin category by ID",
      adminCookie,
    );

    adminCategoryId = adminCategory.id;

    const inactiveCategory = await createCategory(
      "Inactive category by ID",
      employeeCookie,
    );

    inactiveCategoryId = inactiveCategory.id;

    const deactivateResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${inactiveCategoryId}`,
      headers: {
        cookie: employeeCookie,
      },
    });

    expect(deactivateResponse.statusCode).toBe(200);
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

  it("should return a category created by the authenticated user", async () => {
    const response = await getCategoryById(employeeCategoryId, employeeCookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: employeeCategoryId,
      name: "Employee category by ID",
      created_by: employeeFixture.user.id,
      is_active: true,
    });
  });

  it("should return a category created by a user from another restaurant", async () => {
    const response = await getCategoryById(employeeCategoryId, adminCookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: employeeCategoryId,
      name: "Employee category by ID",
      created_by: employeeFixture.user.id,
      is_active: true,
    });
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await getCategoryById(
      "00000000-0000-0000-0000-000000000000",
      employeeCookie,
    );

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 404 when the category is inactive", async () => {
    const response = await getCategoryById(inactiveCategoryId, employeeCookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "CATEGORY_NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/categories/${adminCategoryId}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return a category created by an admin when requested by an employee", async () => {
    const response = await getCategoryById(adminCategoryId, employeeCookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().category).toMatchObject({
      id: adminCategoryId,
      name: "Admin category by ID",
      created_by: adminUser.id,
      is_active: true,
    });
  });
});
