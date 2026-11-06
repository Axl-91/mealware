import type { Migration } from "kysely/migration";

export const up: Migration["up"] = async (db) => {
  /**
   * ALTER TABLE users
   * -----------------
   * ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true
   *
   * Indicates whether the user can access the system.
   */
  await db.schema
    .alterTable("users")
    .addColumn("is_active", "boolean", (column) =>
      column.notNull().defaultTo(true),
    )
    .execute();
};

export const down: Migration["down"] = async (db) => {
  await db.schema.alterTable("users").dropColumn("is_active").execute();
};
