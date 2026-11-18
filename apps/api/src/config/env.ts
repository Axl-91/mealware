import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
