import { afterAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { db } from "../../src/database/database.js";

describe("Test database", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("should connect successfully", async () => {
    const result = await sql<{ result: number }>`SELECT 1 AS result`.execute(
      db,
    );

    expect(Number(result.rows[0]?.result)).toBe(1);
  });
});
