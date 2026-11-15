import { randomUUID } from "node:crypto";
import { USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUser } from "../helpers/fixtures/users.js";
import { createTestUserWithCleanup } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

const appPromise = buildApp();

let app: Awaited<ReturnType<typeof buildApp>>;

let employeeFixture: Awaited<ReturnType<typeof createTestUserWithCleanup>>;
let adminUser: Awaited<ReturnType<typeof createTestUser>>;

let employeeCookie: string;
let adminCookie: string;

const menuItemIds: string[] = [];
const categoryIds: string[] = [];

const login = async (email: string, password: string) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });

  expect(response.statusCode).toBe(200);

  const setCookie = response.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;

  return cookie!.split(";")[0]!;
};

const createCategory = async (name: string, cookie: string) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/categories",
    headers: { cookie },
    payload: { name },
  });

  expect(response.statusCode).toBe(201);

  const { category } = response.json();

  categoryIds.push(category.id);

  return category;
};

const createMenuItem = async (
  cookie: string,
  payload: Record<string, unknown>,
) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/menu-items",
    headers: { cookie },
    payload,
  });

  if (response.statusCode === 201) {
    const { menuItem } = response.json();
    menuItemIds.push(menuItem.id);
  }

  return response;
};

describe("POST /api/v1/menu-items", () => {
  let categoryId: string;

  beforeAll(async () => {
    app = await appPromise;

    employeeFixture = await createTestUserWithCleanup();
    adminUser = await createTestUser({ role: USER_ROLES.ADMIN });

    employeeCookie = await login(
      employeeFixture.user.email,
      employeeFixture.user.plainPassword,
    );

    adminCookie = await login(adminUser.email, adminUser.plainPassword);

    const category = await createCategory(
      `Menu Items ${randomUUID()}`,
      employeeCookie,
    );

    categoryId = category.id;
  });

  afterAll(async () => {
    await cleanupTestData({ menuItemIds, categoryIds });

    await employeeFixture.cleanup();

    await cleanupTestData({
      userIds: [adminUser.id],
      restaurantIds: [adminUser.restaurant_id],
    });

    await app.close();
    await db.destroy();
  });

  it("should create a menu item as an admin", async () => {
    const price = randomPrice();

    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: `Classic Burger ${randomUUID()}`,
      description: "Burger with cheese",
      price,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      menuItem: {
        category_id: categoryId,
        restaurant_id: adminUser.restaurant_id,
        description: "Burger with cheese",
        price: price.toFixed(2),
        is_available: true,
        is_active: true,
      },
    });

    expect(response.json().menuItem.name).toBeDefined();
    expect(response.json().menuItem.id).toBeDefined();
    expect(response.json().menuItem.created_at).toBeDefined();
    expect(response.json().menuItem.updated_at).toBeDefined();
  });

  it("should normalize whitespace in the menu item name", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: "  Double    Cheese   Burger  ",
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().menuItem.name).toBe("Double Cheese Burger");
  });

  it("should return 403 when an employee tries to create a menu item", async () => {
    const response = await createMenuItem(employeeCookie, {
      categoryId,
      name: `Employee Burger ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(403);
  });

  it("should return 400 when the name is empty", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: "   ",
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the name exceeds the maximum length", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: "A".repeat(151),
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the price is negative", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: `Invalid Price ${randomUUID()}`,
      price: -1,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the price has more than two decimal places", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId,
      name: `Invalid Decimals ${randomUUID()}`,
      price: 10.123,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the category ID is invalid", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId: "invalid-uuid",
      name: `Invalid Category ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 404 when the category does not exist", async () => {
    const response = await createMenuItem(adminCookie, {
      categoryId: randomUUID(),
      name: `Missing Category ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("CATEGORY_NOT_FOUND");
  });

  it("should return 404 when the category is inactive", async () => {
    const category = await createCategory(
      `Inactive Category ${randomUUID()}`,
      employeeCookie,
    );

    await db
      .updateTable("categories")
      .set({ is_active: false })
      .where("id", "=", category.id)
      .execute();

    const response = await createMenuItem(adminCookie, {
      categoryId: category.id,
      name: `Inactive Category Item ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("CATEGORY_NOT_FOUND");
  });

  it("should return 409 when a menu item with the same name already exists in the restaurant", async () => {
    const name = `Duplicate Burger ${randomUUID()}`;

    const firstResponse = await createMenuItem(adminCookie, {
      categoryId,
      name,
      price: randomPrice(),
    });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await createMenuItem(adminCookie, {
      categoryId,
      name: name.toLowerCase(),
      price: randomPrice(),
    });

    expect(secondResponse.statusCode).toBe(409);
    expect(secondResponse.json().error.code).toBe(
      "MENU_ITEM_NAME_ALREADY_EXISTS",
    );
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/menu-items",
      payload: {
        categoryId,
        name: `Unauthenticated Burger ${randomUUID()}`,
        price: randomPrice(),
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
