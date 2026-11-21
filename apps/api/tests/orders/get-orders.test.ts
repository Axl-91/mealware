import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, USER_ROLES } from "@mealware/shared";
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

const THIRTEEN_HOURS_IN_MS = 13 * 60 * 60 * 1000;

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

const setOrderUpdatedAt = async (orderId: string, updatedAt: Date) => {
  await db
    .updateTable("orders")
    .set({ updated_at: updatedAt })
    .where("id", "=", orderId)
    .execute();
};

const setOrderStatusAndUpdatedAt = async (
  orderId: string,
  status: "COMPLETED" | "CANCELLED",
  updatedAt: Date,
) => {
  await db
    .updateTable("orders")
    .set({ status, updated_at: updatedAt })
    .where("id", "=", orderId)
    .execute();
};

const updateOrderStatus = async (
  orderId: string,
  status: (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES],
) => {
  return app.inject({
    method: "PUT",
    url: `/api/v1/orders/${orderId}/status`,
    headers: { cookie: admin.cookie },
    payload: { status },
  });
};

const createReadyOrder = async (menuItemId: string) => {
  const response = await createOrder(admin.cookie, menuItemId);

  expect(response.statusCode).toBe(201);

  const order = response.json().order;

  const preparingResponse = await updateOrderStatus(
    order.id,
    ORDER_STATUSES.PREPARING,
  );

  expect(preparingResponse.statusCode).toBe(200);

  const readyResponse = await updateOrderStatus(order.id, ORDER_STATUSES.READY);

  expect(readyResponse.statusCode).toBe(200);

  return order;
};

const createPayment = async (orderId: string, amount: number) => {
  return app.inject({
    method: "POST",
    url: `/api/v1/orders/${orderId}/payments`,
    headers: { cookie: employee.cookie },
    payload: {
      method: "CASH",
      amount,
    },
  });
};

const createRefund = async (paymentId: string, amount: number) => {
  return app.inject({
    method: "POST",
    url: `/api/v1/payments/${paymentId}/refunds`,
    headers: { cookie: admin.cookie },
    payload: { amount },
  });
};

const getOrderFromList = async (orderId: string) => {
  const response = await getOrders(admin.cookie);

  expect(response.statusCode).toBe(200);

  const order = response
    .json()
    .orders.find((item: { id: string }) => item.id === orderId);

  expect(order).toBeDefined();

  return order;
};

describe("GET /api/v1/orders", () => {
  let menuItemId: string;
  let otherRestaurantMenuItemId: string;
  let menuItemPrice: number;

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
    menuItemPrice = Number(menuItem.price);

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

  it("should include old orders that are not completed or cancelled", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const orderId = createResponse.json().order.id;
    const updatedAt = new Date(Date.now() - THIRTEEN_HOURS_IN_MS);

    await setOrderUpdatedAt(orderId, updatedAt);

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).toContain(orderId);
  });

  it("should include recently completed orders", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const orderId = createResponse.json().order.id;

    await setOrderStatusAndUpdatedAt(orderId, "COMPLETED", new Date());

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).toContain(orderId);
  });

  it("should exclude completed orders older than 12 hours", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const orderId = createResponse.json().order.id;
    const updatedAt = new Date(Date.now() - THIRTEEN_HOURS_IN_MS);

    await setOrderStatusAndUpdatedAt(orderId, "COMPLETED", updatedAt);

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).not.toContain(orderId);
  });

  it("should include recently cancelled orders", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const orderId = createResponse.json().order.id;

    await setOrderStatusAndUpdatedAt(orderId, "CANCELLED", new Date());

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).toContain(orderId);
  });

  it("should exclude cancelled orders older than 12 hours", async () => {
    const createResponse = await createOrder(employee.cookie, menuItemId);

    expect(createResponse.statusCode).toBe(201);

    const orderId = createResponse.json().order.id;
    const updatedAt = new Date(Date.now() - THIRTEEN_HOURS_IN_MS);

    await setOrderStatusAndUpdatedAt(orderId, "CANCELLED", updatedAt);

    const response = await getOrders(employee.cookie);

    expect(response.statusCode).toBe(200);

    const returnedOrderIds = response
      .json()
      .orders.map((order: { id: string }) => order.id);

    expect(returnedOrderIds).not.toContain(orderId);
  });

  it("should return UNPAID for a ready order without payments", async () => {
    const order = await createReadyOrder(menuItemId);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("UNPAID");
  });

  it("should return PARTIALLY_PAID for a ready order with partial payments", async () => {
    const order = await createReadyOrder(menuItemId);

    const totalCents = Math.round(menuItemPrice * 100);
    const partialAmount = Math.floor(totalCents / 2) / 100;

    const paymentResponse = await createPayment(order.id, partialAmount);

    expect(paymentResponse.statusCode).toBe(201);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("PARTIALLY_PAID");
  });

  it("should return PAID for a fully paid ready order", async () => {
    const order = await createReadyOrder(menuItemId);

    const paymentResponse = await createPayment(order.id, menuItemPrice);

    expect(paymentResponse.statusCode).toBe(201);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("PAID");
  });

  it("should return UNPAID for a completed order without payments", async () => {
    const order = await createReadyOrder(menuItemId);

    const completeResponse = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.COMPLETED,
    );

    expect(completeResponse.statusCode).toBe(200);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("UNPAID");
  });

  it("should return PAID for a fully paid completed order", async () => {
    const order = await createReadyOrder(menuItemId);

    const paymentResponse = await createPayment(order.id, menuItemPrice);

    expect(paymentResponse.statusCode).toBe(201);

    const completeResponse = await updateOrderStatus(
      order.id,
      ORDER_STATUSES.COMPLETED,
    );

    expect(completeResponse.statusCode).toBe(200);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("PAID");
  });

  it("should return PARTIALLY_PAID after a partial refund", async () => {
    const order = await createReadyOrder(menuItemId);

    const paymentResponse = await createPayment(order.id, menuItemPrice);

    expect(paymentResponse.statusCode).toBe(201);

    const { payment } = paymentResponse.json();

    const totalCents = Math.round(menuItemPrice * 100);
    const refundAmount = Math.floor(totalCents / 2) / 100;

    const refundResponse = await createRefund(payment.id, refundAmount);

    expect(refundResponse.statusCode).toBe(201);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("PARTIALLY_PAID");
  });

  it("should return UNPAID after a full refund", async () => {
    const order = await createReadyOrder(menuItemId);

    const paymentResponse = await createPayment(order.id, menuItemPrice);

    expect(paymentResponse.statusCode).toBe(201);

    const { payment } = paymentResponse.json();

    const refundResponse = await createRefund(payment.id, menuItemPrice);

    expect(refundResponse.statusCode).toBe(201);

    const listedOrder = await getOrderFromList(order.id);

    expect(listedOrder.payment_status).toBe("UNPAID");
  });

  it.each([
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.PREPARING,
    ORDER_STATUSES.CANCELLED,
  ] as const)(
    "should return null payment_status for %s orders",
    async (status) => {
      const response = await createOrder(admin.cookie, menuItemId);

      expect(response.statusCode).toBe(201);

      const orderId = response.json().order.id;

      if (status === ORDER_STATUSES.PREPARING) {
        const preparingResponse = await updateOrderStatus(
          orderId,
          ORDER_STATUSES.PREPARING,
        );

        expect(preparingResponse.statusCode).toBe(200);
      }

      if (status === ORDER_STATUSES.CANCELLED) {
        const cancelledResponse = await updateOrderStatus(
          orderId,
          ORDER_STATUSES.CANCELLED,
        );

        expect(cancelledResponse.statusCode).toBe(200);
      }

      const listedOrder = await getOrderFromList(orderId);

      expect(listedOrder.payment_status).toBeNull();
    },
  );

  it("should return 401 when the request is unauthenticated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/orders",
    });

    expect(response.statusCode).toBe(401);
  });
});
