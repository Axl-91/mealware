import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";

describe("GET /api/v1/categories", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let employeeCategoryId: string;
  let adminCategoryId: string;

  const categoryIds: string[] = [];

  const searchPrefix = `Categories ${randomUUID()}`;
  const paginationPrefix = `Pagination ${randomUUID()}`;

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

  const getCategories = async (cookie: string, query = "") => {
    return app.inject({
      method: "GET",
      url: `/api/v1/categories${query}`,
      headers: {
        cookie,
      },
    });
  };

  beforeAll(async () => {
    app = await appPromise;

    employee = await createTestUserWithAuth(app);

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const employeeCategory = await createCategory(
      `${searchPrefix} Employee`,
      employee.cookie,
    );

    employeeCategoryId = employeeCategory.id;

    const adminCategory = await createCategory(
      `${searchPrefix} Admin`,
      admin.cookie,
    );

    adminCategoryId = adminCategory.id;

    await createCategory(`${paginationPrefix} A`, admin.cookie);
    await createCategory(`${paginationPrefix} B`, admin.cookie);
    await createCategory(`${paginationPrefix} C`, admin.cookie);
  });

  afterAll(async () => {
    await cleanupTestData({ categoryIds });

    await employee.cleanup();
    await admin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should return categories from different restaurants for an employee", async () => {
    const response = await getCategories(employee.cookie);

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
          name: `${searchPrefix} Employee`,
        }),
        expect.objectContaining({
          id: adminCategoryId,
          name: `${searchPrefix} Admin`,
        }),
      ]),
    );
  });

  it("should return categories from different restaurants for an admin", async () => {
    const response = await getCategories(admin.cookie);

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
          name: `${searchPrefix} Employee`,
        }),
        expect.objectContaining({
          id: adminCategoryId,
          name: `${searchPrefix} Admin`,
        }),
      ]),
    );
  });

  it("should return paginated categories with the correct metadata", async () => {
    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(paginationPrefix)}&page=1&limit=2`,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      pagination: {
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      },
    });

    expect(response.json().categories).toHaveLength(2);

    expect(
      response
        .json()
        .categories.map((category: { name: string }) => category.name),
    ).toEqual([`${paginationPrefix} A`, `${paginationPrefix} B`]);
  });

  it("should return the second page of categories", async () => {
    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(paginationPrefix)}&page=2&limit=2`,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json()).toMatchObject({
      pagination: {
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      },
    });

    expect(response.json().categories).toHaveLength(1);
    expect(response.json().categories[0].name).toBe(`${paginationPrefix} C`);
  });

  it("should filter categories by name", async () => {
    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(searchPrefix)}`,
    );

    expect(response.statusCode).toBe(200);

    const categories = response.json().categories;

    expect(categories).toHaveLength(2);

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: employeeCategoryId,
        }),
        expect.objectContaining({
          id: adminCategoryId,
        }),
      ]),
    );
  });

  it("should search categories without case sensitivity", async () => {
    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(searchPrefix.toUpperCase())}`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().categories).toHaveLength(2);
  });

  it("should return only active categories when status is active", async () => {
    const deactivateResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/categories/${employeeCategoryId}`,
      headers: {
        cookie: employee.cookie,
      },
    });

    expect(deactivateResponse.statusCode).toBe(200);

    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(searchPrefix)}&status=active`,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().categories).toEqual([
      expect.objectContaining({
        id: adminCategoryId,
        is_active: true,
      }),
    ]);
  });

  it("should return only archived categories when status is archived", async () => {
    const response = await getCategories(
      admin.cookie,
      `?search=${encodeURIComponent(searchPrefix)}&status=archived`,
    );

    expect(response.statusCode).toBe(200);

    expect(response.json().categories).toEqual([
      expect.objectContaining({
        id: employeeCategoryId,
        is_active: false,
      }),
    ]);
  });

  it.each([
    ["page", "0"],
    ["limit", "101"],
    ["status", "invalid"],
  ])(
    "should return 400 when %s has an invalid value",
    async (parameter, value) => {
      const response = await getCategories(
        admin.cookie,
        `?${parameter}=${value}`,
      );

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
    });

    expect(response.statusCode).toBe(401);
  });
});
