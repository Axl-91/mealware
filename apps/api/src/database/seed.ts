import { sql } from "kysely";
import { USER_ROLES } from "@mealware/shared";
import { db } from "./database.js";
import { hashPassword } from "../auth/password.js";

// Initial restaurant and administrator.
const INITIAL_RESTAURANT = {
  name: "Mealware",
};

const INITIAL_ADMIN = {
  name: "Mealware Admin",
  email: "admin@mealware.local",
  password: "MealwareDevAdmin2026!",
};

const seed = async () => {
  // Check PostgreSQL connection.
  await sql`SELECT 1`.execute(db);
  console.log("PostgreSQL connection successful.");

  // Find the first restaurant.
  let restaurant = await db
    .selectFrom("restaurants")
    .select(["id", "name"])
    .orderBy("created_at", "asc")
    .executeTakeFirst();

  // Create the initial restaurant if it doesn't exist.
  if (!restaurant) {
    restaurant = await db
      .insertInto("restaurants")
      .values({
        name: INITIAL_RESTAURANT.name,
      })
      .returning(["id", "name"])
      .executeTakeFirstOrThrow();

    console.log(`Restaurant created: ${restaurant.name}`);
  } else {
    console.log(`Restaurant already exists: ${restaurant.name}`);
  }

  // Check whether the restaurant already has an administrator.
  const admin = await db
    .selectFrom("users")
    .select("id")
    .where("restaurant_id", "=", restaurant.id)
    .where("role", "=", USER_ROLES.ADMIN)
    .executeTakeFirst();

  // Create the initial administrator if it doesn't exist.
  if (!admin) {
    const passwordHash = await hashPassword(INITIAL_ADMIN.password);

    await db
      .insertInto("users")
      .values({
        restaurant_id: restaurant.id,
        name: INITIAL_ADMIN.name,
        email: INITIAL_ADMIN.email,
        password_hash: passwordHash,
        role: USER_ROLES.ADMIN,
      })
      .executeTakeFirstOrThrow();

    console.log(`Administrator created: ${INITIAL_ADMIN.email}`);
  } else {
    console.log("Restaurant already has an administrator.");
  }

  console.log("Seed completed successfully.");
};

try {
  await seed();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
