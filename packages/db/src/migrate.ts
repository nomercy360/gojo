import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const dir = new URL("../drizzle", import.meta.url).pathname;
await migrate(db, { migrationsFolder: dir });
await client.end();
console.log("migrations applied");
