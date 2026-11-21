import type {
  CreateOrderInput,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "@mealware/shared";
import { sql } from "kysely";
import { db } from "../database/database.js";
import type { OrderStatus } from "../database/types/orders.js";

interface CreateOrderRepositoryInput extends CreateOrderInput {
  restaurantId: string;
  createdBy: string;
}

interface GetOrdersInput {
  restaurantId: string;
}

type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

interface GetOrderByIdInput {
  orderId: string;
  restaurantId: string;
}

interface UpdateOrderRepositoryInput extends UpdateOrderInput {
  orderId: string;
  restaurantId: string;
}

interface UpdateOrderStatusRepositoryInput extends UpdateOrderStatusInput {
  orderId: string;
  restaurantId: string;
  validateTransition: (currentStatus: OrderStatus) => boolean;
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

export const getOrders = async ({ restaurantId }: GetOrdersInput) => {
  return db
    .with("order_totals", (qb) =>
      qb
        .selectFrom("order_items")
        .select("order_id")
        .select(sql<string>`SUM(unit_price * quantity)`.as("total"))
        .where("restaurant_id", "=", restaurantId)
        .groupBy("order_id"),
    )
    .with("payment_totals", (qb) =>
      qb
        .selectFrom("payments")
        .select("order_id")
        .select(sql<string>`SUM(amount)`.as("total"))
        .where("restaurant_id", "=", restaurantId)
        .groupBy("order_id"),
    )
    .with("refund_totals", (qb) =>
      qb
        .selectFrom("refunds")
        .innerJoin("payments", "payments.id", "refunds.payment_id")
        .select("payments.order_id")
        .select(sql<string>`SUM(refunds.amount)`.as("total"))
        .where("refunds.restaurant_id", "=", restaurantId)
        .where("payments.restaurant_id", "=", restaurantId)
        .groupBy("payments.order_id"),
    )
    .selectFrom("orders")
    .leftJoin("order_totals", "order_totals.order_id", "orders.id")
    .leftJoin("payment_totals", "payment_totals.order_id", "orders.id")
    .leftJoin("refund_totals", "refund_totals.order_id", "orders.id")
    .selectAll("orders")
    .select(
      sql<PaymentStatus | null>`
        CASE
          WHEN orders.status NOT IN ('READY', 'COMPLETED') THEN NULL

          WHEN (
            COALESCE(payment_totals.total, 0) -
            COALESCE(refund_totals.total, 0)
          ) <= 0 THEN 'UNPAID'

          WHEN (
            COALESCE(payment_totals.total, 0) -
            COALESCE(refund_totals.total, 0)
          ) < COALESCE(order_totals.total, 0)
            THEN 'PARTIALLY_PAID'

          ELSE 'PAID'
        END
      `.as("payment_status"),
    )
    .where("orders.restaurant_id", "=", restaurantId)
    .where((eb) =>
      eb.or([
        eb("orders.status", "not in", ["COMPLETED", "CANCELLED"]),
        eb("orders.updated_at", ">=", sql<Date>`now() - interval '12 hours'`),
      ]),
    )
    .orderBy("orders.order_date", "desc")
    .orderBy("orders.order_number", "desc")
    .execute();
};

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

  const payments = await db
    .selectFrom("payments")
    .selectAll()
    .where("order_id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .orderBy("created_at", "asc")
    .execute();

  const paymentIds = payments.map((payment) => payment.id);

  const refunds =
    paymentIds.length > 0
      ? await db
          .selectFrom("refunds")
          .selectAll()
          .where("payment_id", "in", paymentIds)
          .where("restaurant_id", "=", restaurantId)
          .orderBy("created_at", "asc")
          .execute()
      : [];

  const totals = await db
    .selectFrom("order_items")
    .select(sql<string>`COALESCE(SUM(unit_price * quantity), 0)`.as("total"))
    .where("order_id", "=", orderId)
    .where("restaurant_id", "=", restaurantId)
    .executeTakeFirstOrThrow();

  const paymentStatus = await db
    .selectNoFrom((eb) => [
      sql<PaymentStatus | null>`
        CASE
          WHEN ${eb.val(order.status)} NOT IN ('READY', 'COMPLETED')
            THEN NULL

          WHEN (
            COALESCE((
              SELECT SUM(payments.amount)
              FROM payments
              WHERE payments.order_id = ${eb.val(orderId)}
                AND payments.restaurant_id = ${eb.val(restaurantId)}
            ), 0)
            -
            COALESCE((
              SELECT SUM(refunds.amount)
              FROM refunds
              INNER JOIN payments
                ON payments.id = refunds.payment_id
              WHERE payments.order_id = ${eb.val(orderId)}
                AND payments.restaurant_id = ${eb.val(restaurantId)}
                AND refunds.restaurant_id = ${eb.val(restaurantId)}
            ), 0)
          ) <= 0
            THEN 'UNPAID'

          WHEN (
            COALESCE((
              SELECT SUM(payments.amount)
              FROM payments
              WHERE payments.order_id = ${eb.val(orderId)}
                AND payments.restaurant_id = ${eb.val(restaurantId)}
            ), 0)
            -
            COALESCE((
              SELECT SUM(refunds.amount)
              FROM refunds
              INNER JOIN payments
                ON payments.id = refunds.payment_id
              WHERE payments.order_id = ${eb.val(orderId)}
                AND payments.restaurant_id = ${eb.val(restaurantId)}
                AND refunds.restaurant_id = ${eb.val(restaurantId)}
            ), 0)
          ) < ${eb.val(totals.total)}::numeric
            THEN 'PARTIALLY_PAID'

          ELSE 'PAID'
        END
      `.as("status"),
    ])
    .executeTakeFirstOrThrow();

  return {
    ...order,
    items,
    total: totals.total,
    payment_status: paymentStatus.status,
    payments: payments.map((payment) => ({
      ...payment,
      refunds: refunds.filter((refund) => refund.payment_id === payment.id),
    })),
  };
};

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

    if (status === "CANCELLED") {
      const { total: paymentsTotal } = await trx
        .selectFrom("payments")
        .select(sql<string>`COALESCE(SUM(amount), 0)::text`.as("total"))
        .where("order_id", "=", orderId)
        .where("restaurant_id", "=", restaurantId)
        .executeTakeFirstOrThrow();

      const { total: refundsTotal } = await trx
        .selectFrom("refunds")
        .innerJoin("payments", "payments.id", "refunds.payment_id")
        .select(sql<string>`COALESCE(SUM(refunds.amount), 0)::text`.as("total"))
        .where("payments.order_id", "=", orderId)
        .where("payments.restaurant_id", "=", restaurantId)
        .executeTakeFirstOrThrow();

      const receivedCents = Math.round(Number(paymentsTotal) * 100);
      const refundedCents = Math.round(Number(refundsTotal) * 100);

      if (receivedCents > refundedCents) {
        return { status: "payment_not_refunded" as const };
      }
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
