import { AfterAll, Before, BeforeAll, setDefaultTimeout } from "@cucumber/cucumber";
import { startPostgres, type PostgresHarness } from "../../test/support/postgres.js";
import { startService, type RunningService } from "../../test/support/service.js";
import type { LibraryWorld } from "./world.js";

// Starting the container and the compiled service is slower than a step, so the
// default Cucumber timeout of five seconds would fail a healthy run.
setDefaultTimeout(120_000);

let postgres: PostgresHarness | undefined;
let service: RunningService | undefined;

async function stopInfrastructure(): Promise<void> {
  const runningService = service;
  const runningPostgres = postgres;
  service = undefined;
  postgres = undefined;
  try {
    await runningService?.stop();
  } finally {
    await runningPostgres?.stop();
  }
}

BeforeAll(async () => {
  try {
    postgres = await startPostgres();
    service = await startService(postgres.connectionUri);
  } catch (error) {
    await stopInfrastructure();
    throw error;
  }
});

// A fresh World is not database isolation: the scenarios share one Postgres
// container, so every scenario starts from empty schemas. Cleanup runs before
// each scenario, which also clears anything a failed setup left behind.
Before(async function (this: LibraryWorld) {
  if (postgres === undefined || service === undefined) {
    throw new Error("the e2e infrastructure did not start");
  }
  this.baseUrl = service.baseUrl;
  await postgres.pool.query("truncate table catalog.books, lending.loans");
});

AfterAll(async () => {
  await stopInfrastructure();
});
