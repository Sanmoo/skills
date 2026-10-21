import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";

export interface PostgresHarness {
  readonly pool: Pool;
  readonly connectionUri: string;
  stop(): Promise<void>;
}

// Integration tests run against a real Postgres, never a fake. The image is
// pinned in one place and bumped together with the deployment target.
export async function startPostgres(): Promise<PostgresHarness> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:17.2-alpine",
  ).start();
  const connectionUri = container.getConnectionUri();
  const pool = new Pool({ connectionString: connectionUri });
  return {
    pool,
    connectionUri,
    async stop(): Promise<void> {
      await pool.end();
      await container.stop();
    },
  };
}
