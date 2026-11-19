import { sql } from "kysely";
import { db } from "../database/database.js";

interface DashboardRepositoryInput {
  restaurantId: string;
}

interface DashboardChartsRepositoryInput {
  restaurantId: string;
  days: 7 | 30;
}

/**
 * Returns the beginning of the current day in Argentina's timezone.
 */
const getArgentinaDayStart = () =>
  sql<Date>`
    date_trunc(
      'day',
      now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
    ) AT TIME ZONE 'America/Argentina/Buenos_Aires'
  `;

/**
 * Returns the beginning of the next day in Argentina's timezone.
 */
const getArgentinaNextDayStart = () =>
  sql<Date>`
    (
      date_trunc(
        'day',
        now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      ) + interval '1 day'
    ) AT TIME ZONE 'America/Argentina/Buenos_Aires'
  `;

/**
 * Returns the beginning of the selected period in Argentina's timezone.
 * The period includes the current day.
 */
const getArgentinaPeriodStart = (days: 7 | 30) =>
  sql<Date>`
    (
      date_trunc(
        'day',
        now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      ) - (${days} - 1) * interval '1 day'
    ) AT TIME ZONE 'America/Argentina/Buenos_Aires'
  `;

/**
 * Retrieves the total amount of payments registered today.
 */
const getPaymentsToday = async ({ restaurantId }: DashboardRepositoryInput) => {
  const result = await db
    .selectFrom("payments")
    .select(sql<string>`COALESCE(SUM(amount), 0)::text`.as("total"))
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaDayStart())
    .where("created_at", "<", getArgentinaNextDayStart())
    .executeTakeFirstOrThrow();

  return result.total;
};

/**
 * Retrieves the total amount of refunds registered today.
 */
const getRefundsToday = async ({ restaurantId }: DashboardRepositoryInput) => {
  const result = await db
    .selectFrom("refunds")
    .select(sql<string>`COALESCE(SUM(amount), 0)::text`.as("total"))
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaDayStart())
    .where("created_at", "<", getArgentinaNextDayStart())
    .executeTakeFirstOrThrow();

  return result.total;
};

/**
 * Retrieves the number of orders created today.
 */
const getOrdersToday = async ({ restaurantId }: DashboardRepositoryInput) => {
  const result = await db
    .selectFrom("orders")
    .select(sql<number>`COUNT(*)::int`.as("total"))
    .where("restaurant_id", "=", restaurantId)
    .where(
      sql<boolean>`order_date = (
        now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      )::date`,
    )
    .executeTakeFirstOrThrow();

  return result.total;
};

/**
 * Retrieves the number of distinct orders that received payments today.
 */
const getPaidOrdersToday = async ({
  restaurantId,
}: DashboardRepositoryInput) => {
  const result = await db
    .selectFrom("payments")
    .select(sql<number>`COUNT(DISTINCT order_id)::int`.as("total"))
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaDayStart())
    .where("created_at", "<", getArgentinaNextDayStart())
    .executeTakeFirstOrThrow();

  return result.total;
};

/**
 * Retrieves the number of orders that still require attention,
 * regardless of their creation date.
 */
const getPendingOrders = async ({ restaurantId }: DashboardRepositoryInput) => {
  const result = await db
    .selectFrom("orders")
    .select(sql<number>`COUNT(*)::int`.as("total"))
    .where("restaurant_id", "=", restaurantId)
    .where("status", "in", ["PENDING", "PREPARING", "READY"])
    .executeTakeFirstOrThrow();

  return result.total;
};

/**
 * Retrieves all data required to build the dashboard summary.
 */
export const getDashboardSummary = async ({
  restaurantId,
}: DashboardRepositoryInput) => {
  const [
    paymentsToday,
    refundsToday,
    ordersToday,
    paidOrdersToday,
    pendingOrders,
  ] = await Promise.all([
    getPaymentsToday({ restaurantId }),
    getRefundsToday({ restaurantId }),
    getOrdersToday({ restaurantId }),
    getPaidOrdersToday({ restaurantId }),
    getPendingOrders({ restaurantId }),
  ]);

  return {
    paymentsToday,
    refundsToday,
    ordersToday,
    paidOrdersToday,
    pendingOrders,
  };
};

/**
 * Retrieves daily net sales for the selected period.
 * Payments and refunds are grouped by their registration date in Argentina.
 */
const getSalesByDay = async ({
  restaurantId,
  days,
}: DashboardChartsRepositoryInput) => {
  const argentinaDate = sql<string>`
    to_char(
      created_at AT TIME ZONE 'America/Argentina/Buenos_Aires',
      'YYYY-MM-DD'
    )
  `;

  const paymentSalesQuery = db
    .selectFrom("payments")
    .select([
      argentinaDate.as("date"),
      sql<string>`SUM(amount)::text`.as("total"),
    ])
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaPeriodStart(days))
    .where("created_at", "<", getArgentinaNextDayStart())
    .groupBy(argentinaDate);

  const refundSalesQuery = db
    .selectFrom("refunds")
    .select([
      argentinaDate.as("date"),
      sql<string>`(-SUM(amount))::text`.as("total"),
    ])
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaPeriodStart(days))
    .where("created_at", "<", getArgentinaNextDayStart())
    .groupBy(argentinaDate);

  return db
    .selectFrom(paymentSalesQuery.unionAll(refundSalesQuery).as("daily_sales"))
    .select(["date", sql<string>`SUM(total::numeric)::text`.as("total")])
    .groupBy("date")
    .orderBy("date")
    .execute();
};

/**
 * Retrieves the number of orders grouped by their current status.
 */
const getOrdersByStatus = async ({
  restaurantId,
  days,
}: DashboardChartsRepositoryInput) => {
  return db
    .selectFrom("orders")
    .select(["status", sql<number>`COUNT(*)::int`.as("total")])
    .where("restaurant_id", "=", restaurantId)
    .where(
      sql<boolean>`order_date BETWEEN (
        (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        - (${days} - 1)
      ) AND (
        now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      )::date`,
    )
    .groupBy("status")
    .execute();
};

/**
 * Retrieves net sales grouped by payment method.
 * Refunds are attributed to the original payment method.
 */
const getSalesByPaymentMethod = async ({
  restaurantId,
  days,
}: DashboardChartsRepositoryInput) => {
  const paymentSalesQuery = db
    .selectFrom("payments")
    .select(["method", sql<string>`SUM(amount)::text`.as("total")])
    .where("restaurant_id", "=", restaurantId)
    .where("created_at", ">=", getArgentinaPeriodStart(days))
    .where("created_at", "<", getArgentinaNextDayStart())
    .groupBy("method");

  const refundSalesQuery = db
    .selectFrom("refunds")
    .innerJoin("payments", (join) =>
      join
        .onRef("payments.id", "=", "refunds.payment_id")
        .onRef("payments.restaurant_id", "=", "refunds.restaurant_id"),
    )
    .select([
      "payments.method as method",
      sql<string>`(-SUM(refunds.amount))::text`.as("total"),
    ])
    .where("refunds.restaurant_id", "=", restaurantId)
    .where("refunds.created_at", ">=", getArgentinaPeriodStart(days))
    .where("refunds.created_at", "<", getArgentinaNextDayStart())
    .groupBy("payments.method");

  return db
    .selectFrom(paymentSalesQuery.unionAll(refundSalesQuery).as("method_sales"))
    .select(["method", sql<string>`SUM(total::numeric)::text`.as("total")])
    .groupBy("method")
    .orderBy("method")
    .execute();
};

/**
 * Retrieves the number of orders grouped by order type.
 */
const getOrdersByType = async ({
  restaurantId,
  days,
}: DashboardChartsRepositoryInput) => {
  return db
    .selectFrom("orders")
    .select(["type", sql<number>`COUNT(*)::int`.as("total")])
    .where("restaurant_id", "=", restaurantId)
    .where(
      sql<boolean>`order_date BETWEEN (
        (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        - (${days} - 1)
      ) AND (
        now() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      )::date`,
    )
    .groupBy("type")
    .execute();
};

/**
 * Retrieves all data required to build the dashboard charts.
 */
export const getDashboardCharts = async (
  input: DashboardChartsRepositoryInput,
) => {
  const [sales, ordersByStatus, salesByPaymentMethod, ordersByType] =
    await Promise.all([
      getSalesByDay(input),
      getOrdersByStatus(input),
      getSalesByPaymentMethod(input),
      getOrdersByType(input),
    ]);

  return {
    sales,
    ordersByStatus,
    salesByPaymentMethod,
    ordersByType,
  };
};
