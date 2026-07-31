import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;

const globalDatabase = globalThis as typeof globalThis & {
  estoqueSql?: SqlClient;
};

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL não configurada. Conecte um PostgreSQL na Vercel ou copie .env.example para .env.local.",
    );
  }

  if (!globalDatabase.estoqueSql) {
    globalDatabase.estoqueSql = postgres(databaseUrl, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }

  return globalDatabase.estoqueSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
