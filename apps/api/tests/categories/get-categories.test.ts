import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";
import { createTestUser } from "../helpers/fixtures/users.js";

describe("GET /api/v1/categories", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employeeFixture: Awaited<ReturnType<typeof createTestUserWithCleanup>>;

  let adminUser: Awaited<ReturnType<typeof createTestUser>>;

  let employeeCookie: string;
  let adminCookie: string;

  let employeeCategoryId: string;
  let adminCategoryId: string;

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

  const getCategories = async (cookie: string) => {
    return app.inject({
      method: "GET",
      url: "/api/v1/categories",
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
      "Employee global category",
      employeeCookie,
    );

    employeeCategoryId = employeeCategory.id;

    const adminCategory = await createCategory(
      "Admin global category",
      adminCookie,
    );

    adminCategoryId = adminCategory.id;
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

  it("should return categories from different restaurants for an employee", async () => {
    const response = await getCategories(employeeCookie);

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
          name: "Employee global category",
        }),
        expect.objectContaining({
          id: adminCategoryId,
          name: "Admin global category",
        }),
      ]),
    );
  });

  it("should return categories from different restaurants for an admin", async () => {
    const response = await getCategories(adminCookie);

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
          name: "Employee global category",
        }),
        expect.objectContaining({
          id: adminCategoryId,
          name: "Admin global category",
        }),
      ]),
    );
  });

  it("should not return inactive categories", async () => {
    const deactivateResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${employeeCategoryId}`,
      headers: {
        cookie: employeeCookie,
      },
    });

    expect(deactivateResponse.statusCode).toBe(200);

    const response = await getCategories(adminCookie);

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
        }),
      ]),
    );

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: adminCategoryId,
          name: "Admin global category",
        }),
      ]),
    );
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
    });

    expect(response.statusCode).toBe(401);
  });
});
