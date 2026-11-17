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

const orderIds: string[] = [];
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
}: {
  restaurantId: string;
  categoryId: string;
}) => {
  const menuItem = await db
    .insertInto("menu_items")
    .values({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: `Test Menu Item ${randomUUID()}`,
      description: null,
      price: randomPrice().toFixed(2),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  menuItemIds.push(menuItem.id);

  return menuItem;
};

const createOrder = async (cookie: string, menuItemId: string) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie },
    payload: {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 1 }],
    },
  });

  if (response.statusCode === 201) {
    const { order } = response.json();
    orderIds.push(order.id);
  }

  return response;
};

const getOrders = async (cookie: string) => {
  return app.inject({
    method: "GET",
    url: "/api/v1/orders",
    headers: { cookie },
  });
};

describe("GET /api/v1/orders", () => {
  let menuItemId: string;
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

    const menuItem = await createMenuItem({
      restaurantId: employee.user.restaurant_id,
      categoryId: category.id,
    });

    menuItemId = menuItem.id;

    const otherRestaurantMenuItem = await createMenuItem({
      restaurantId: otherRestaurantAdmin.user.restaurant_id,
      categoryId: category.id,
    });

    otherRestaurantMenuItemId = otherRestaurantMenuItem.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      orderIds,
      menuItemIds,
      categoryIds,
    });

    await employee.cleanup();
    await admin.cleanup();
    await otherRestaurantAdmin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should return orders belonging to the admin's restaurant", async () => {
    const createResponse = await createOrder(admin.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const createdOrderId = createResponse.json().order.id;

    const response = await getOrders(admin.cookie);

    expect(response.statusCode).toBe(200);

    const { orders } = response.json();
    const returnedOrderIds = orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).toContain(createdOrderId);

    expect(
      orders.every(
        (order: { restaurant_id: string }) =>
          order.restaurant_id === admin.user.restaurant_id,
      ),
    ).toBe(true);
  });

  it("should return orders belonging to the employee's restaurant", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const createdOrderId = createResponse.json().order.id;

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const { orders } = response.json();
    const returnedOrderIds = orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).toContain(createdOrderId);

    expect(
      orders.every(
        (order: { restaurant_id: string }) =>
          order.restaurant_id === employee.user.restaurant_id,
      ),
    ).toBe(true);
  });

  it("should not return orders belonging to another restaurant", async () => {
    const otherRestaurantOrderResponse = await createOrder(
      otherRestaurantAdmin.cookie,
      otherRestaurantMenuItemId,
    );

    expect(otherRestaurantOrderResponse.statusCode).toBe(201);

    const otherRestaurantOrderId = otherRestaurantOrderResponse.json().order.id;

    const response = await getOrders(admin.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).not.toContain(otherRestaurantOrderId);
  });

  it("should return an empty array when the restaurant has no orders", async () => {
    const emptyRestaurantAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    try {
      const response = await getOrders(emptyRestaurantAdmin.cookie);

      expect(response.statusCode).toBe(200);
      expect(response.json().orders).toEqual([]);
    } finally {
      await emptyRestaurantAdmin.cleanup();
    }
  });

  it("should return orders ordered by date and order number in descending order", async () => {
    const firstResponse = await createOrder(employee.cookie, menuItemId);
    const secondResponse = await createOrder(employee.cookie, menuItemId);
    const thirdResponse = await createOrder(employee.cookie, menuItemId);

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);
    expect(thirdResponse.statusCode).toBe(201);

    const firstOrder = firstResponse.json().order;
    const secondOrder = secondResponse.json().order;
    const thirdOrder = thirdResponse.json().order;

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    const createdOrderIds = [firstOrder.id, secondOrder.id, thirdOrder.id];

    const orderedCreatedOrderIds = returnedOrderIds.filter((id: string) =>
      createdOrderIds.includes(id),
    );

    expect(orderedCreatedOrderIds).toEqual([
      thirdOrder.id,
      secondOrder.id,
      firstOrder.id,
    ]);
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
    });

    expect(response.statusCode).toBe(401);
  });
});
