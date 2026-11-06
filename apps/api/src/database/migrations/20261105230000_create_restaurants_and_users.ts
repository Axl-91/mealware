import { sql } from "kysely";
import type { Migration } from "kysely/migration";

export const up: Migration["up"] = async (db) => {
  /**
   * ENUM user_role
   * --------------
   * - ADMIN: Full access to restaurant management.
   * - EMPLOYEE: Standard restaurant staff access.
   */
  await db.schema
    .createType("user_role")
    .asEnum(["ADMIN", "EMPLOYEE"])
    .execute();

  /**
   * TABLE restaurants
   * -----------------
   * id         UUID         PK, DEFAULT gen_random_uuid()
   * name       VARCHAR(120) NOT NULL
   * created_at TIMESTAMPTZ  NOT NULL, DEFAULT now()
   * updated_at TIMESTAMPTZ  NOT NULL, DEFAULT now()
   */
  await db.schema
    .createTable("restaurants")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("name", "varchar(120)", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  /**
   * TABLE users
   * ------------
   * id            UUID         PK, DEFAULT gen_random_uuid()
   * restaurant_id UUID         FK -> restaurants.id, NOT NULL
   * name          VARCHAR(120) NOT NULL
   * email         VARCHAR(255) NOT NULL
   * password_hash VARCHAR(255) NOT NULL
   * role          user_role    NOT NULL
   * is_active     BOOLEAN      NOT NULL, DEFAULT true
   * created_at    TIMESTAMPTZ  NOT NULL, DEFAULT now()
   * updated_at    TIMESTAMPTZ  NOT NULL, DEFAULT now()
   *
   * CONSTRAINTS
   * - UNIQUE (email)
   */
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("restaurant_id", "uuid", (column) => column.notNull())
    .addColumn("name", "varchar(120)", (column) => column.notNull())
    .addColumn("email", "varchar(255)", (column) => column.notNull())
    .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
    .addColumn("role", sql`user_role`, (column) => column.notNull())
    .addColumn("is_active", "boolean", (column) =>
      column.notNull().defaultTo(true),
    )
    .addColumn("created_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      "users_restaurant_id_foreign",
      ["restaurant_id"],
      "restaurants",
      ["id"],
    )
    .addUniqueConstraint("users_email_unique", ["email"])
    .execute();
};

export const down: Migration["down"] = async (db) => {
  await db.schema.dropTable("users").execute();
  await db.schema.dropTable("restaurants").execute();
  await db.schema.dropType("user_role").execute();
};
