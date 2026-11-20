// Starts the built service as it ships: dist/main.js in its own process,
// against a real Postgres container. The service's "listening on port" line is
// the readiness signal; there is no fixed sleep.
import { spawn, type ChildProcess } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { POSTGRES_IMAGE } from "../../test/support/postgres.js";

const READY = /listening on port (\d+)/;
const READY_TIMEOUT_MS = 30_000;

export interface RunningService {
  readonly baseUrl: string;
  stop(): Promise<void>;
}

function waitForReadiness(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(
        new Error(
          `the service gave no readiness signal within ${String(READY_TIMEOUT_MS)} ms:\n${output}`,
        ),
      );
    }, READY_TIMEOUT_MS);
    const read = (chunk: Buffer): void => {
      output += chunk.toString();
      const match = READY.exec(output);
      if (match?.[1] !== undefined) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    };
    child.stdout?.on("data", read);
    child.stderr?.on("data", read);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(
        new Error(`the service exited with code ${String(code)} before it was ready:\n${output}`),
      );
    });
  });
}

export async function startService(
  entry = process.env.E2E_ARTIFACT ?? "dist/main.js",
): Promise<RunningService> {
  const database: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    POSTGRES_IMAGE,
  ).start();
  const child = spawn(process.execPath, [entry], {
    env: { ...process.env, DATABASE_URL: database.getConnectionUri(), PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const port = await waitForReadiness(child);
    return {
      baseUrl: `http://127.0.0.1:${String(port)}`,
      stop: async () => {
        child.kill("SIGTERM");
        await database.stop();
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    await database.stop();
    throw error;
  }
}
