import { sql } from "kysely";
import { db } from "../database/database.js";

interface DashboardRepositoryInput {
  restaurantId: string;
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
