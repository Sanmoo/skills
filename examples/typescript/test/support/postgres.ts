// One real Postgres per test run, in an ephemeral container. Integration tests
// read its URL with inject("databaseUrl").
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

export const POSTGRES_IMAGE = "postgres:17.2-alpine";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  project.provide("databaseUrl", container.getConnectionUri());
  return async () => {
    await container.stop();
  };
}
