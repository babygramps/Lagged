import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Allow build/test/import without DB; runtime queries will fail clearly.
  // The cron route and any DB-touching action will surface the missing var.
}

export const db = drizzle(neon(connectionString ?? "postgres://invalid"), { schema });
export { schema };
