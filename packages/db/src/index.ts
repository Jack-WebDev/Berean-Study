import { env } from "@berean-study/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/** One pool and Drizzle client are shared by this runtime instance. */
export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/** @deprecated Use the module-scoped `db` client instead. */
export function createDb() {
	return db;
}
