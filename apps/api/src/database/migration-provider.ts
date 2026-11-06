import { FileMigrationProvider } from "kysely/migration";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const migrationFolder = fileURLToPath(new URL("./migrations", import.meta.url));

export const createMigrationProvider = () => {
  return new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  });
};
