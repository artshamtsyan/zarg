import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __zarg_pg__: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __zarg_db__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function getClient() {
  if (!global.__zarg_pg__) {
    global.__zarg_pg__ = postgres(env.databaseUrl(), {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return global.__zarg_pg__;
}

export function getDb() {
  if (!global.__zarg_db__) {
    global.__zarg_db__ = drizzle(getClient(), { schema });
  }
  return global.__zarg_db__;
}

export { schema };
