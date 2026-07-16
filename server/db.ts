
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// DEV_DATABASE_URL  → Railway dev DB  (development only)
// PROD_DATABASE_URL → Railway prod DB (production)
// DATABASE_URL      → Replit fallback
const connectionString =
  process.env.NODE_ENV === "production"
    ? (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL)
    : (process.env.DEV_DATABASE_URL || process.env.PROD_DATABASE_URL || process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeon = connectionString.includes("neon.tech");
const isRailway = connectionString.includes("railway");

export const pool = new Pool({
  connectionString,
  max: 3,
  // Release connections after 1s idle — Railway's proxy drops them quickly, so
  // it's safer to always connect fresh than to reuse potentially dead connections.
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 15000,
  ssl: (isNeon || isRailway) ? { rejectUnauthorized: false } : undefined,
});

// Prevent idle-client errors from propagating as unhandled rejections
pool.on("error", (err) => {
  console.error("[db] Pool idle client error (suppressed):", err.message);
});

export const db = drizzle(pool, { schema });
