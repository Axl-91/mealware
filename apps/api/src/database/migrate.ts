import { FileMigrationProvider, Migrator } from "kysely/migration";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./database.js";

const migrationFolder = fileURLToPath(new URL("./migrations", import.meta.url));

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

const runMigrations = async () => {
  try {
    const { error, results } = await migrator.migrateToLatest();

    for (const result of results ?? []) {
      if (result.status === "Success") {
        console.log(`Migration completed: ${result.migrationName}`);
      } else if (result.status === "Error") {
        console.error(`Migration failed: ${result.migrationName}`);
      }
    }

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Migration execution failed:", error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
};

await runMigrations();
