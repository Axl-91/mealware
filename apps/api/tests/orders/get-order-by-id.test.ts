import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USER_ROLES } from "@mealware/shared";
import { sql } from "kysely";
import { buildApp } from "../../src/app.js";
import { db } from "../../src/database/database.js";
import { cleanupTestData } from "../helpers/cleanup.js";
import { createTestUserWithAuth } from "../helpers/create-test-user.js";
import { randomPrice } from "../helpers/random.js";

describe("GET /api/v1/orders/:id", () => {
  const appPromise = buildApp();

  let app: Awaited<typeof appPromise>;

  let admin: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let employee: Awaited<ReturnType<typeof createTestUserWithAuth>>;
  let otherAdmin: Awaited<ReturnType<typeof createTestUserWithAuth>>;

  let menuItemId: string;
  let orderId: string;
  let otherRestaurantOrderId: string;

  const orderIds: string[] = [];
  const menuItemIds: string[] = [];
  const categoryIds: string[] = [];

  const createCategory = async (name: string, cookie: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/categories",
      headers: { cookie },
      payload: { name },
    });

    expect(response.statusCode).toBe(201);

    const category = response.json().category;
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
        name: `Test menu item ${randomUUID()}`,
        description: null,
        price: randomPrice().toFixed(2),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    menuItemIds.push(menuItem.id);

    return menuItem;
  };

  const createOrder = async (cookie: string, itemId: string) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { cookie },
      payload: {
        type: "DINE_IN",
        items: [{ menuItemId: itemId, quantity: 2 }],
      },
    });

    if (response.statusCode === 201) {
      orderIds.push(response.json().order.id);
    }

    return response;
  };

  const getOrderById = async (id: string, cookie: string) => {
    return app.inject({
      method: "GET",
      url: `/api/v1/orders/${id}`,
      headers: { cookie },
    });
  };

  beforeAll(async () => {
    app = await appPromise;

    admin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    employee = await createTestUserWithAuth(app, {
      restaurantId: admin.user.restaurant_id,
      role: USER_ROLES.EMPLOYEE,
    });

    otherAdmin = await createTestUserWithAuth(app, {
      role: USER_ROLES.ADMIN,
    });

    const category = await createCategory(
      `Orders category ${randomUUID()}`,
      employee.cookie,
    );

    const menuItem = await createMenuItem({
      restaurantId: admin.user.restaurant_id,
      categoryId: category.id,
    });

    menuItemId = menuItem.id;

    const orderResponse = await createOrder(admin.cookie, menuItemId);

    expect(orderResponse.statusCode).toBe(201);

    orderId = orderResponse.json().order.id;

    const otherRestaurantMenuItem = await createMenuItem({
      restaurantId: otherAdmin.user.restaurant_id,
      categoryId: category.id,
    });

    const otherRestaurantOrderResponse = await createOrder(
      otherAdmin.cookie,
      otherRestaurantMenuItem.id,
    );

    expect(otherRestaurantOrderResponse.statusCode).toBe(201);

    otherRestaurantOrderId = otherRestaurantOrderResponse.json().order.id;
  });

  afterAll(async () => {
    await cleanupTestData({
      orderIds,
      menuItemIds,
      categoryIds,
    });

    await employee.cleanup();
    await admin.cleanup();
    await otherAdmin.cleanup();

    await app.close();
    await db.destroy();
  });

  it("should return an order for an admin", async () => {
    const response = await getOrderById(orderId, admin.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: orderId,
      restaurant_id: admin.user.restaurant_id,
      created_by: admin.user.id,
      type: "DINE_IN",
      status: "PENDING",
    });
  });

  it("should return an order for an employee", async () => {
    const response = await getOrderById(orderId, employee.cookie);

    expect(response.statusCode).toBe(200);

    expect(response.json().order).toMatchObject({
      id: orderId,
      restaurant_id: employee.user.restaurant_id,
      type: "DINE_IN",
      status: "PENDING",
    });
  });

  it("should return the order items with their snapshots", async () => {
    const response = await getOrderById(orderId, employee.cookie);

    expect(response.statusCode).toBe(200);

    const { order } = response.json();

    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      order_id: orderId,
      menu_item_id: menuItemId,
      name: expect.any(String),
      unit_price: expect.any(String),
      quantity: 2,
      notes: null,
    });
  });

  it("should return the order total and an empty payment list for a pending order", async () => {
    const response = await getOrderById(orderId, employee.cookie);

    expect(response.statusCode).toBe(200);

    const { order } = response.json();

    const expectedTotal = await db
      .selectFrom("order_items")
      .select(sql<string>`COALESCE(SUM(unit_price * quantity), 0)`.as("total"))
      .where("order_id", "=", orderId)
      .where("restaurant_id", "=", employee.user.restaurant_id)
      .executeTakeFirstOrThrow();

    expect(order.total).toBe(expectedTotal.total);
    expect(order.payment_status).toBeNull();
    expect(order.payments).toEqual([]);
  });

  it("should return payments with their refunds and calculate the payment status", async () => {
    const restaurantId = admin.user.restaurant_id;

    const total = await db
      .selectFrom("order_items")
      .select(sql<string>`SUM(unit_price * quantity)`.as("total"))
      .where("order_id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    await db
      .updateTable("orders")
      .set({ status: "READY" })
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .execute();

    const firstPayment = await db
      .insertInto("payments")
      .values({
        restaurant_id: restaurantId,
        order_id: orderId,
        method: "CASH",
        amount: total.total,
        created_by: admin.user.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const secondPayment = await db
      .insertInto("payments")
      .values({
        restaurant_id: restaurantId,
        order_id: orderId,
        method: "CASH",
        amount: total.total,
        created_by: admin.user.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const refund = await db
      .insertInto("refunds")
      .values({
        restaurant_id: restaurantId,
        payment_id: firstPayment.id,
        amount: total.total,
        created_by: admin.user.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    try {
      const response = await getOrderById(orderId, employee.cookie);

      expect(response.statusCode).toBe(200);

      const { order } = response.json();

      expect(order.total).toBe(total.total);
      expect(order.payment_status).toBe("PAID");

      expect(order.payments).toHaveLength(2);

      expect(order.payments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstPayment.id,
            amount: total.total,
            refunds: [
              expect.objectContaining({
                id: refund.id,
                amount: total.total,
              }),
            ],
          }),
          expect.objectContaining({
            id: secondPayment.id,
            amount: total.total,
            refunds: [],
          }),
        ]),
      );
    } finally {
      await db
        .deleteFrom("refunds")
        .where("payment_id", "in", [firstPayment.id, secondPayment.id])
        .execute();

      await db
        .deleteFrom("payments")
        .where("id", "in", [firstPayment.id, secondPayment.id])
        .execute();

      await db
        .updateTable("orders")
        .set({ status: "PENDING" })
        .where("id", "=", orderId)
        .where("restaurant_id", "=", restaurantId)
        .execute();
    }
  });

  it("should return 404 when the order belongs to another restaurant", async () => {
    const response = await getOrderById(otherRestaurantOrderId, admin.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      },
    });
  });

  it("should return 404 when the order does not exist", async () => {
    const response = await getOrderById(randomUUID(), employee.cookie);

    expect(response.statusCode).toBe(404);

    expect(response.json()).toMatchObject({
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      },
    });
  });

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/orders/${orderId}`,
    });

    expect(response.statusCode).toBe(401);
  });
});
