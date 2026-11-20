// Composition root of the shipped service. It reports the port it listens on;
// that line is the readiness signal the e2e level waits for.
import pg from "pg";
import { createCatalog } from "./catalog/index.js";
import { catalogRoutes } from "./http/catalog-routes.js";
import { lendingRoutes } from "./http/lending-routes.js";
import { createHttpServer } from "./http/server.js";
import { createLending } from "./lending/index.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const catalog = await createCatalog(pool);
const lending = await createLending(pool, catalog);
const server = createHttpServer([...catalogRoutes(catalog), ...lendingRoutes(lending)]);

server.listen(Number(process.env.PORT ?? 0), () => {
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : address;
  console.log(`listening on port ${String(port)}`);
});

process.on("SIGTERM", () => {
  server.close(() => void pool.end());
});
