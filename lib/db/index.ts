import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

declare const globalThis: {
  __PONTO_DB__?: Db;
  __PONTO_SQL__?: SqlClient;
} & typeof global;

export function getDb(): Db {
  if (globalThis.__PONTO_DB__) return globalThis.__PONTO_DB__;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não está definida. Configure em .env.local");
  }

  const sql = postgres(connectionString, { max: 5 });
  const db = drizzle(sql, { schema });

  globalThis.__PONTO_SQL__ = sql;
  globalThis.__PONTO_DB__ = db;

  return db;
}

export type { Db };
export { schema };
