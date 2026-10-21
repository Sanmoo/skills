import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type PostgresHarness } from "../../test/support/postgres.js";

// The e2e level drives the service as it ships: the built artifact, reached
// over HTTP. Nothing is imported from src/.
let harness: PostgresHarness;
type ServiceProcess = ChildProcessByStdio<null, Readable, Readable>;
let service: ServiceProcess;
let baseUrl: string;

function waitForListening(child: ServiceProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error(`service did not start: ${output}`));
    }, 30_000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = output.match(/listening on (\d+)/);
      if (match?.[1] !== undefined) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`service exited with ${code}: ${output}`));
    });
  });
}

beforeAll(async () => {
  harness = await startPostgres();
  service = spawn(process.execPath, ["dist/main.js"], {
    env: {
      ...process.env,
      DATABASE_URL: harness.connectionUri,
      PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await waitForListening(service);
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  service.kill("SIGTERM");
  await harness.stop();
});

describe("library lending service over HTTP", () => {
  let bookId: string;
  let loanId: string;

  it("answers its health endpoint", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("adds a book through the catalog context", async () => {
    const response = await fetch(`${baseUrl}/books`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Piranesi", author: "Susanna Clarke", copies: 1 }),
    });

    expect(response.status).toBe(201);
    const book = (await response.json()) as { id: string; title: string };
    expect(book.title).toBe("Piranesi");
    bookId = book.id;

    const found = await fetch(`${baseUrl}/books/${bookId}`);
    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toMatchObject({ id: bookId, title: "Piranesi" });
  });

  it("lends the book through the lending context", async () => {
    const response = await fetch(`${baseUrl}/loans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId, borrower: "Ada Lovelace" }),
    });

    expect(response.status).toBe(201);
    const loan = (await response.json()) as { id: string; bookId: string; returnedAt: null };
    expect(loan.bookId).toBe(bookId);
    expect(loan.returnedAt).toBeNull();
    loanId = loan.id;

    const found = await fetch(`${baseUrl}/loans/${loanId}`);
    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toMatchObject({ id: loanId });
  });

  it("returns the loan and reports a second return as a conflict", async () => {
    const response = await fetch(`${baseUrl}/loans/${loanId}/return`, { method: "POST" });
    expect(response.status).toBe(200);
    const returned = (await response.json()) as { returnedAt: string | null };
    expect(returned.returnedAt).not.toBeNull();

    const again = await fetch(`${baseUrl}/loans/${loanId}/return`, { method: "POST" });
    expect(again.status).toBe(409);
  });

  it("reports a loan for a book the catalog does not hold as not found", async () => {
    const response = await fetch(`${baseUrl}/loans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId: "missing", borrower: "Ada Lovelace" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects a malformed book as a bad request", async () => {
    const response = await fetch(`${baseUrl}/books`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "", author: "Susanna Clarke", copies: 1 }),
    });

    expect(response.status).toBe(400);
  });

  it("distinguishes an unknown path from a wrong method", async () => {
    const unknown = await fetch(`${baseUrl}/nothing`);
    expect(unknown.status).toBe(404);

    const wrongMethod = await fetch(`${baseUrl}/books`, { method: "DELETE" });
    expect(wrongMethod.status).toBe(405);
  });
});
