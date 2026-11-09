import { createTestDatabase } from "./database.js";
import { runMigrations } from "../../src/database/run-migrations.js";

console.log("Preparing test database...");

export default async function setup() {
  const testDatabase = await createTestDatabase();

  try {
    await runMigrations(testDatabase.db);
  } finally {
    await testDatabase.destroy();
  }
}
