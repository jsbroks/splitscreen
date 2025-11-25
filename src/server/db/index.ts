import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export * from "drizzle-orm";

export const takeFirst = <T>(result: T[]): T => {
  if (result.length === 0) {
    throw new Error("No result found");
  }
  return result[0] as T;
};

export const takeFirstOrNull = <T>(result: T[]): T | null => {
  if (result.length === 0) {
    return null;
  }
  return result[0] as T;
};
