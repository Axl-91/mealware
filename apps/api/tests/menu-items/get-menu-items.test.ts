import { randomUUID } from "node:crypto";
import { USER_ROLES } from "@mealware/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

const appPromise = buildApp();

let app: Awaited<ReturnType<typeof buildApp>>;

let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
let otherRestaurantAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

const menuItemIds: string[] = [];
const categoryIds: string[] = [];

const createCategory = async (createdBy: string) => {
  const category = await db
    .insertInto("categories")
    .values({
      name: `Test Category ${randomUUID()}`,
      created_by: createdBy,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  categoryIds.push(category.id);

  return category;
};

const createMenuItem = async ({
  restaurantId,
  categoryId,
  isAvailable = true,
  isActive = true,
}: {
  restaurantId: string;
  categoryId: string;
  isAvailable?: boolean;
  isActive?: boolean;
}) => {
  const menuItem = await db
    .insertInto("menu_items")
    .values({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: `Test Menu Item ${randomUUID()}`,
      description: null,
      price: randomPrice().toFixed(2),
      is_available: isAvailable,
      is_active: isActive,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  menuItemIds.push(menuItem.id);

  return menuItem;
};

describe("GET /api/v1/menu-items", () => {
  let availableMenuItemId: string;
  let unavailableMenuItemId: string;
  let inactiveMenuItemId: string;
  let otherRestaurantMenuItemId: string;

  beforeAll(async () => {
    app = await appPromise;

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    employee = await createTestUserWithAuth(app, {
      restaurantId: admin.user.restaurant_id,
    });

    otherRestaurantAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const category = await createCategory(employee.user.id);

    const availableMenuItem = await createMenuItem({
      restaurantId: employee.user.restaurant_id,
      categoryId: category.id,
    });

    availableMenuItemId = availableMenuItem.id;

    const unavailableMenuItem = await createMenuItem({
      restaurantId: employee.user.restaurant_id,
      categoryId: category.id,
      isAvailable: false,
    });

    unavailableMenuItemId = unavailableMenuItem.id;

    const inactiveMenuItem = await createMenuItem({
      restaurantId: employee.user.restaurant_id,
      categoryId: category.id,
      isActive: false,
    });

    inactiveMenuItemId = inactiveMenuItem.id;

    const otherRestaurantMenuItem = await createMenuItem({
      restaurantId: otherRestaurantAdmin.user.restaurant_id,
      categoryId: category.id,
    });

    otherRestaurantMenuItemId = otherRestaurantMenuItem.id;
  });

  afterAll(async () => {
    await cleanupTestData({ menuItemIds, categoryIds });

    await employee.cleanup();
    await admin.cleanup();
    await otherRestaurantAdmin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should return active menu items belonging to the admin's restaurant by default", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items",
      headers: { cookie: admin.cookie },
    });

    expect(response.statusCode).toBe(200);

    const { menuItems } = response.json();
    const returnedMenuItemIds = menuItems.map(
      (menuItem: { id: string }) => menuItem.id,
    );

    expect(returnedMenuItemIds).toContain(availableMenuItemId);
    expect(returnedMenuItemIds).toContain(unavailableMenuItemId);
    expect(returnedMenuItemIds).not.toContain(inactiveMenuItemId);
    expect(returnedMenuItemIds).not.toContain(otherRestaurantMenuItemId);

    expect(
      menuItems.every(
        (menuItem: { restaurant_id: string }) =>
          menuItem.restaurant_id === admin.user.restaurant_id,
      ),
    ).toBe(true);
  });

  it("should return active menu items when status=active", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items?status=active",
      headers: { cookie: admin.cookie },
    });

    expect(response.statusCode).toBe(200);

    const { menuItems } = response.json();
    const returnedMenuItemIds = menuItems.map(
      (menuItem: { id: string }) => menuItem.id,
    );

    expect(returnedMenuItemIds).toContain(availableMenuItemId);
    expect(returnedMenuItemIds).toContain(unavailableMenuItemId);
    expect(returnedMenuItemIds).not.toContain(inactiveMenuItemId);
    expect(returnedMenuItemIds).not.toContain(otherRestaurantMenuItemId);
  });

  it("should return archived menu items when status=archived", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items?status=archived",
      headers: { cookie: admin.cookie },
    });

    expect(response.statusCode).toBe(200);

    const { menuItems } = response.json();
    const returnedMenuItemIds = menuItems.map(
      (menuItem: { id: string }) => menuItem.id,
    );

    expect(returnedMenuItemIds).toContain(inactiveMenuItemId);
    expect(returnedMenuItemIds).not.toContain(availableMenuItemId);
    expect(returnedMenuItemIds).not.toContain(unavailableMenuItemId);
    expect(returnedMenuItemIds).not.toContain(otherRestaurantMenuItemId);

    expect(
      menuItems.every(
        (menuItem: { restaurant_id: string; is_active: boolean }) =>
          menuItem.restaurant_id === admin.user.restaurant_id &&
          menuItem.is_active === false,
      ),
    ).toBe(true);
  });

  it("should return active and archived menu items when status=all", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items?status=all",
      headers: { cookie: admin.cookie },
    });

    expect(response.statusCode).toBe(200);

    const { menuItems } = response.json();
    const returnedMenuItemIds = menuItems.map(
      (menuItem: { id: string }) => menuItem.id,
    );

    expect(returnedMenuItemIds).toContain(availableMenuItemId);
    expect(returnedMenuItemIds).toContain(unavailableMenuItemId);
    expect(returnedMenuItemIds).toContain(inactiveMenuItemId);
    expect(returnedMenuItemIds).not.toContain(otherRestaurantMenuItemId);

    expect(
      menuItems.every(
        (menuItem: { restaurant_id: string }) =>
          menuItem.restaurant_id === admin.user.restaurant_id,
      ),
    ).toBe(true);
  });

  it("should return 400 when status is invalid", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items?status=invalid",
      headers: { cookie: admin.cookie },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return active menu items belonging to the employee's restaurant", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items",
      headers: { cookie: employee.cookie },
    });

    expect(response.statusCode).toBe(200);

    const { menuItems } = response.json();
    const returnedMenuItemIds = menuItems.map(
      (menuItem: { id: string }) => menuItem.id,
    );

    expect(returnedMenuItemIds).toContain(availableMenuItemId);
    expect(returnedMenuItemIds).toContain(unavailableMenuItemId);
    expect(returnedMenuItemIds).not.toContain(inactiveMenuItemId);
    expect(returnedMenuItemIds).not.toContain(otherRestaurantMenuItemId);

    expect(
      menuItems.every(
        (menuItem: { restaurant_id: string }) =>
          menuItem.restaurant_id === employee.user.restaurant_id,
      ),
    ).toBe(true);
  });

  it("should return an empty array when the restaurant has no menu items", async () => {
    const emptyRestaurantAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/menu-items",
        headers: { cookie: emptyRestaurantAdmin.cookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().menuItems).toEqual([]);
    } finally {
      await emptyRestaurantAdmin.cleanup();
    }
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/menu-items",
    });

    expect(response.statusCode).toBe(401);
  });
});
