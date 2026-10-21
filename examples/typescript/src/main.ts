import { Pool } from "pg";
import { createCatalog, migrateCatalog } from "./catalog/index.js";
import { createLending, migrateLending } from "./lending/index.js";
import { createHttpServer } from "./http/server.js";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === "") {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

const port = Number(process.env.PORT ?? "3000");
const pool = new Pool({ connectionString: requireDatabaseUrl() });

await migrateCatalog(pool);
await migrateLending(pool);

const catalog = createCatalog(pool);
const lending = createLending(pool, catalog);
const server = createHttpServer({ catalog, lending });

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (address !== null && typeof address === "object") {
    console.log(`listening on ${address.port}`);
  }
});

async function shutdown(): Promise<void> {
  server.close();
  await pool.end();
}

process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
