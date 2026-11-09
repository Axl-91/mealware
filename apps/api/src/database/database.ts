import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "./types/database.js";
import { env } from "../config/env.js";

const connectionString =
  env.NODE_ENV === "test" ? env.TEST_DATABASE_URL : env.DATABASE_URL;

if (!connectionString) {
  throw new Error("TEST_DATABASE_URL is required when NODE_ENV=test");
}

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});
