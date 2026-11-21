import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
} from "@mealware/shared";
import { sql } from "kysely";
import { db } from "../database/database.js";
import type { UpdateOrderInput } from "@mealware/shared";
import { OrderStatus } from "../database/types/orders.js";

interface CreateOrderRepositoryInput extends CreateOrderInput {
  restaurantId: string;
  createdBy: string;
}

export const createOrder = async ({
  restaurantId,
  createdBy,
  type,
  customerName,
  notes,
  items,
}: CreateOrderRepositoryInput) => {
  return db.transaction().execute(async (trx) => {
    // Get the restaurant-local date once, so the order and sequence
    // always use the same date, even if the transaction crosses midnight.
    const { order_date: orderDate } = await trx
      .selectFrom("restaurants")
      .select(
        sql<string>`(
          now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
        )::date`.as("order_date"),
      )
      .where("id", "=", restaurantId)
      .executeTakeFirstOrThrow();

    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await trx
      .selectFrom("menu_items")
      .select(["id", "name", "price", "is_available"])
      .where("id", "in", menuItemIds)
      .where("restaurant_id", "=", restaurantId)
      .where("is_active", "=", true)
      .execute();

    if (menuItems.length !== menuItemIds.length) {
      return { status: "menu_item_not_found" as const };
    }

    if (menuItems.some((menuItem) => !menuItem.is_available)) {
      return { status: "menu_item_not_available" as const };
    }

    // Atomically increment the daily order number for this restaurant.
    const sequence = await trx
      .insertInto("order_sequences")
      .values({
        restaurant_id: restaurantId,
        date: orderDate,
        last_number: 1,
      })
      .onConflict((conflict) =>
        conflict.columns(["restaurant_id", "date"]).doUpdateSet({
          last_number: sql<number>`order_sequences.last_number + 1`,
        }),
      )
      .returning("last_number")
      .executeTakeFirstOrThrow();

    const order = await trx
      .insertInto("orders")
      .values({
        restaurant_id: restaurantId,
        order_number: sequence.last_number,
        order_date: orderDate,
        type,
        status: "PENDING",
        customer_name: customerName ?? null,
        notes: notes ?? null,
        created_by: createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const menuItemsById = new Map(
      menuItems.map((menuItem) => [menuItem.id, menuItem]),
    );

    await trx
      .insertInto("order_items")
      .values(
        items.map((item) => {
          const menuItem = menuItemsById.get(item.menuItemId)!;

          return {
            restaurant_id: restaurantId,
            order_id: order.id,
            menu_item_id: menuItem.id,
            name: menuItem.name,
            unit_price: menuItem.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          };
        }),
      )
      .execute();

    return {
      status: "created" as const,
      order,
    };
  });
};

interface GetOrdersInput {
  restaurantId: string;
}

export const getOrders = async ({ restaurantId }: GetOrdersInput) => {
  return db
    .selectFrom("orders")
    .selectAll()
    .where("restaurant_id", "=", restaurantId)
    .orderBy("order_date", "desc")
    .orderBy("order_number", "desc")
    .execute();
};

interface GetOrderByIdInput {
  orderId: string;
  restaurantId: string;
}

export const getOrderById = async ({
  orderId,
  restaurantId,
}: GetOrderByIdInput) => {
  const order = await db
    .selectFrom("orders")
    .selectAll()
    .where("id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .executeTakeFirst();

  if (!order) {
    return null;
  }

  const items = await db
    .selectFrom("order_items")
    .selectAll()
    .where("order_id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .orderBy("created_at", "asc")
    .execute();

  return {
    ...order,
    items,
  };
};

interface UpdateOrderRepositoryInput extends UpdateOrderInput {
  orderId: string;
  restaurantId: string;
}

export const updateOrder = async ({
  orderId,
  restaurantId,
  type,
  customerName,
  notes,
  items,
}: UpdateOrderRepositoryInput) => {
  return db.transaction().execute(async (trx) => {
    const existingOrder = await trx
      .selectFrom("orders")
      .select(["id", "status"])
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!existingOrder) {
      return { status: "not_found" as const };
    }

    if (existingOrder.status !== "PENDING") {
      return { status: "not_editable" as const };
    }

    const menuItemIds = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await trx
      .selectFrom("menu_items")
      .select(["id", "name", "price", "is_available"])
      .where("id", "in", menuItemIds)
      .where("restaurant_id", "=", restaurantId)
      .where("is_active", "=", true)
      .execute();

    if (menuItems.length !== menuItemIds.length) {
      return { status: "menu_item_not_found" as const };
    }

    if (menuItems.some((menuItem) => !menuItem.is_available)) {
      return { status: "menu_item_not_available" as const };
    }

    await trx
      .updateTable("orders")
      .set({
        type,
        customer_name: customerName,
        notes,
        updated_at: new Date(),
      })
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .execute();

    await trx
      .deleteFrom("order_items")
      .where("order_id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .execute();

    const menuItemsById = new Map(
      menuItems.map((menuItem) => [menuItem.id, menuItem]),
    );

    await trx
      .insertInto("order_items")
      .values(
        items.map((item) => {
          const menuItem = menuItemsById.get(item.menuItemId)!;

          return {
            restaurant_id: restaurantId,
            order_id: orderId,
            menu_item_id: menuItem.id,
            name: menuItem.name,
            unit_price: menuItem.price,
            quantity: item.quantity,
            notes: item.notes ?? null,
          };
        }),
      )
      .execute();

    return { status: "updated" as const };
  });
};

interface UpdateOrderStatusRepositoryInput extends UpdateOrderStatusInput {
  orderId: string;
  restaurantId: string;
  validateTransition: (currentStatus: OrderStatus) => boolean;
}

export const updateOrderStatus = async ({
  orderId,
  restaurantId,
  status,
  validateTransition,
}: UpdateOrderStatusRepositoryInput) => {
  return db.transaction().execute(async (trx) => {
    const existingOrder = await trx
      .selectFrom("orders")
      .select(["id", "status"])
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .forUpdate()
      .executeTakeFirst();

    if (!existingOrder) {
      return { status: "not_found" as const };
    }

    if (!validateTransition(existingOrder.status)) {
      return { status: "invalid_transition" as const };
    }

    const order = await trx
      .updateTable("orders")
      .set({
        status,
        updated_at: new Date(),
      })
      .where("id", "=", orderId)
      .where("restaurant_id", "=", restaurantId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      status: "updated" as const,
      order,
    };
  });
};
