import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "../../src/database/types/database.js";
import { env } from "../../src/config/env.js";
import { createDatabaseIfNotExists } from "../../src/database/create-database.js";

const testDatabaseUrl = env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run tests");
}

export const createTestDatabase = async () => {
  await createDatabaseIfNotExists(testDatabaseUrl);

  const pool = new Pool({
    connectionString: testDatabaseUrl,
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    db,
    destroy: async () => {
      await db.destroy();
    },
  };
};
