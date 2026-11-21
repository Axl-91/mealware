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

const orderIds: string[] = [];
const menuItemIds: string[] = [];
const categoryIds: string[] = [];

const additionalUsers: Awaited<ReturnType<typeof createTestUserWithAuth>>[] =
  [];

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

const createOrder = async (
  cookie: string,
  payload: Record<string, unknown>,
) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie },
    payload,
  });

  if (response.statusCode === 201) {
    const { order } = response.json();
    orderIds.push(order.id);
  }

  return response;
};

describe("POST /api/v1/orders", () => {
  let categoryId: string;
  let menuItemId: string;
  let menuItemPrice: number;

  beforeAll(async () => {
    app = await appPromise;

    employee = await createTestUserWithAuth(app);

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
      restaurantId: employee.user.restaurant_id,
    });

    const category = await createCategory(
      `Orders ${randomUUID()}`,
      employee.cookie,
    );

    categoryId = category.id;

    menuItemPrice = randomPrice();

    const menuItemResponse = await createMenuItem(admin.cookie, {
      categoryId,
      name: `Classic Burger ${randomUUID()}`,
      price: menuItemPrice,
    });

    expect(menuItemResponse.statusCode).toBe(201);

    menuItemId = menuItemResponse.json().menuItem.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      orderIds,
      menuItemIds,
      categoryIds,
    });

    for (const user of additionalUsers) {
      await user.cleanup();
    }

    await admin.cleanup();
    await employee.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should create an order as an employee", async () => {
    const customerName = "John Doe";
    const notes = "Extra napkins";

    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      customerName,
      notes,
      items: [
        {
          menuItemId,
          quantity: 2,
          notes: "No onions",
        },
      ],
    });

    expect(response.statusCode).toBe(201);

    const { order } = response.json();

    expect(order).toMatchObject({
      restaurant_id: employee.user.restaurant_id,
      type: "DINE_IN",
      status: "PENDING",
      customer_name: customerName,
      notes,
      created_by: employee.user.id,
      order_number: expect.any(Number),
      order_date: expect.any(String),
    });

    expect(order.id).toBeDefined();
    expect(order.created_at).toBeDefined();
    expect(order.updated_at).toBeDefined();

    const orderItems = await db
      .selectFrom("order_items")
      .selectAll()
      .where("order_id", "=", order.id)
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0]).toMatchObject({
      restaurant_id: employee.user.restaurant_id,
      order_id: order.id,
      menu_item_id: menuItemId,
      name: expect.any(String),
      unit_price: menuItemPrice.toFixed(2),
      quantity: 2,
      notes: "No onions",
    });
  });

  it("should create an order as an admin", async () => {
    const response = await createOrder(admin.cookie, {
      type: "TAKEAWAY",
      items: [
        {
          menuItemId,
          quantity: 1,
        },
      ],
    });

    expect(response.statusCode).toBe(201);

    const { order } = response.json();

    expect(order).toMatchObject({
      restaurant_id: admin.user.restaurant_id,
      type: "TAKEAWAY",
      status: "PENDING",
      customer_name: null,
      notes: null,
      created_by: admin.user.id,
    });
  });

  it("should assign sequential order numbers within the same restaurant and date", async () => {
    const firstResponse = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 1 }],
    });

    const secondResponse = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 1 }],
    });

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);

    const firstOrder = firstResponse.json().order;
    const secondOrder = secondResponse.json().order;

    expect(secondOrder.order_date).toBe(firstOrder.order_date);
    expect(secondOrder.order_number).toBe(firstOrder.order_number + 1);
  });

  it("should normalize whitespace in the customer name", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      customerName: "  John    Doe  ",
      items: [{ menuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().order.customer_name).toBe("John Doe");
  });

  it("should return 404 when a menu item does not exist", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: randomUUID(), quantity: 1 }],
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("MENU_ITEM_NOT_FOUND");
  });

  it("should return 404 when a menu item is inactive", async () => {
    const inactiveMenuItemResponse = await createMenuItem(admin.cookie, {
      categoryId,
      name: `Inactive Burger ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(inactiveMenuItemResponse.statusCode).toBe(201);

    const inactiveMenuItemId = inactiveMenuItemResponse.json().menuItem.id;

    await db
      .updateTable("menu_items")
      .set({ is_active: false })
      .where("id", "=", inactiveMenuItemId)
      .execute();

    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: inactiveMenuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("MENU_ITEM_NOT_FOUND");
  });

  it("should return 409 when a menu item is unavailable", async () => {
    const unavailableMenuItemResponse = await createMenuItem(admin.cookie, {
      categoryId,
      name: `Unavailable Burger ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(unavailableMenuItemResponse.statusCode).toBe(201);

    const unavailableMenuItemId =
      unavailableMenuItemResponse.json().menuItem.id;

    await db
      .updateTable("menu_items")
      .set({ is_available: false })
      .where("id", "=", unavailableMenuItemId)
      .execute();

    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: unavailableMenuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("MENU_ITEM_NOT_AVAILABLE");
  });

  it("should return 400 when the order has no items", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the order type is invalid", async () => {
    const response = await createOrder(employee.cookie, {
      type: "INVALID",
      items: [{ menuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the menu item ID is invalid", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: "invalid-uuid", quantity: 1 }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the quantity is not positive", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 0 }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when the quantity is not an integer", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 1.5 }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      payload: {
        type: "DINE_IN",
        items: [{ menuItemId, quantity: 1 }],
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 404 when a menu item belongs to another restaurant", async () => {
    const anotherAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    additionalUsers.push(anotherAdmin);

    const anotherCategory = await createCategory(
      `Other restaurant ${randomUUID()}`,
      anotherAdmin.cookie,
    );

    const anotherMenuItemResponse = await createMenuItem(anotherAdmin.cookie, {
      categoryId: anotherCategory.id,
      name: `Other Burger ${randomUUID()}`,
      price: randomPrice(),
    });

    expect(anotherMenuItemResponse.statusCode).toBe(201);

    const anotherMenuItemId = anotherMenuItemResponse.json().menuItem.id;

    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: anotherMenuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("MENU_ITEM_NOT_FOUND");
  });

  it("should use the menu item price from the database", async () => {
    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [
        {
          menuItemId,
          quantity: 2,
          price: 0.01,
        },
      ],
    });

    expect(response.statusCode).toBe(201);

    const { order } = response.json();

    const orderItem = await db
      .selectFrom("order_items")
      .select("unit_price")
      .where("order_id", "=", order.id)
      .executeTakeFirstOrThrow();

    expect(orderItem.unit_price).toBe(menuItemPrice.toFixed(2));
  });

  it("should not consume an order number when creation fails", async () => {
    const invalidResponse = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId: randomUUID(), quantity: 1 }],
    });

    expect(invalidResponse.statusCode).toBe(404);

    const response = await createOrder(employee.cookie, {
      type: "DINE_IN",
      items: [{ menuItemId, quantity: 1 }],
    });

    expect(response.statusCode).toBe(201);

    const { order } = response.json();

    const sequence = await db
      .selectFrom("order_sequences")
      .select("last_number")
      .where("restaurant_id", "=", employee.user.restaurant_id)
      .where("date", "=", order.order_date)
      .executeTakeFirstOrThrow();

    expect(order.order_number).toBe(sequence.last_number);
  });
});
