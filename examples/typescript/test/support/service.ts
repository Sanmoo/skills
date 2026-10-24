import { spawn, type ChildProcess } from "node:child_process";

const READINESS = /listening on (\d+)/;
const START_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 10_000;

export interface RunningService {
  readonly baseUrl: string;
  stop(): Promise<void>;
}

// Starts the built service as its own process and waits for the readiness line
// main.ts prints after the server starts listening. Anything else - a missing
// artifact, a crash, a database that is unavailable - fails the wait instead of
// letting a scenario run against a service that is not there.
export async function startService(databaseUrl: string): Promise<RunningService> {
  const child = spawn(process.execPath, ["dist/main.js"], {
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let port: number;
  try {
    port = await waitForReadiness(child);
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: () => stopChild(child),
  };
}

function waitForReadiness(child: ChildProcess): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let output = "";
    let settled = false;

    const finish = (): boolean => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
      child.off("exit", onExit);
      child.off("error", onError);
      return true;
    };
    const succeed = (port: number): void => {
      if (finish()) resolve(port);
    };
    const fail = (message: string): void => {
      if (finish()) reject(new Error(message));
    };

    const onStdout = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
      const match = READINESS.exec(output);
      if (match?.[1] !== undefined) succeed(Number(match[1]));
    };
    const onStderr = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      fail(
        `service exited before reporting readiness (code ${String(code)}, signal ${String(signal)}): ${output}`,
      );
    };
    const onError = (error: Error): void => {
      fail(`service failed to start: ${error.message}`);
    };

    const timer = setTimeout(() => {
      fail(`service did not report readiness within ${START_TIMEOUT_MS} ms: ${output}`);
    }, START_TIMEOUT_MS);
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise<void>((resolve) => {
    child.once("exit", () => {
      resolve();
    });
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  const exited = waitForExit(child);
  child.kill("SIGTERM");
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
  }, STOP_TIMEOUT_MS);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}
