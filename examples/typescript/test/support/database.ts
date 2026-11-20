import pg from "pg";
import { afterAll, beforeEach, inject } from "vitest";

/** A pool on the run's Postgres, emptied of every context's rows before each test. */
export function useDatabase(): pg.Pool {
  const pool = new pg.Pool({ connectionString: inject("databaseUrl") });
  beforeEach(async () => {
    await pool.query("DROP SCHEMA IF EXISTS catalog CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS lending CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });
  return pool;
}
