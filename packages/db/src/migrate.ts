import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { runCurriculumSeed } from "./seed-curriculum.ts";
import { runSeed } from "./seed-kanji.ts";

const url = process.env.DATABASE_URL ?? "postgres://gojo:gojo@localhost:5432/gojo";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const migrationsDir = fileURLToPath(new URL("../drizzle", import.meta.url));
await migrate(db, { migrationsFolder: migrationsDir });
await client.end();
console.log("migrations applied");

const dataDir = fileURLToPath(new URL("../data", import.meta.url));
await runSeed(dataDir);
await runCurriculumSeed(dataDir);
console.log("seed complete");
