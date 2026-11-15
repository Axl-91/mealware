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

    employee = await createTestUserWithAuth(app);

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const employeeCategory = await createCategory(
      "Employee global category",
      employee.cookie,
    );

    employeeCategoryId = employeeCategory.id;

    const adminCategory = await createCategory(
      "Admin global category",
      admin.cookie,
    );

    adminCategoryId = adminCategory.id;
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
    const response = await getCategories(admin.cookie);

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
        cookie: employee.cookie,
      },
    });

    expect(deactivateResponse.statusCode).toBe(200);

    const response = await getCategories(admin.cookie);

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
