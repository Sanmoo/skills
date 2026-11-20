import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { useDatabase } from "../../test/support/database.js";
import { createCatalog } from "../catalog/index.js";
import { createLending } from "../lending/index.js";
import { catalogRoutes } from "./catalog-routes.js";
import { lendingRoutes } from "./lending-routes.js";
import { createHttpServer, HttpError, type Route } from "./server.js";

const pool = useDatabase();
const closers: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function serve(extra: Route[] = []): Promise<string> {
  const catalog = await createCatalog(pool);
  const lending = await createLending(pool, catalog);
  const server = createHttpServer([...catalogRoutes(catalog), ...lendingRoutes(lending), ...extra]);
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  closers.push(
    () =>
      new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  );
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

async function call(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; type: string | null; body: unknown }> {
  const init: RequestInit =
    body === undefined
      ? { method }
      : { method, body: typeof body === "string" ? body : JSON.stringify(body) };
  const response = await fetch(url, init);
  return {
    status: response.status,
    type: response.headers.get("content-type"),
    body: await response.json(),
  };
}

describe("Catalog routes", () => {
  it("registers a Book and returns it", async () => {
    const base = await serve();
    expect(await call(`${base}/books/dispossessed`, "PUT", { title: "The Dispossessed" })).toEqual({
      status: 200,
      type: "application/json",
      body: { id: "dispossessed", title: "The Dispossessed" },
    });
    expect(await call(`${base}/books/dispossessed`, "GET")).toMatchObject({
      status: 200,
      body: { id: "dispossessed", title: "The Dispossessed" },
    });
  });

  it("answers 404 for a Book the Catalog does not hold", async () => {
    const base = await serve();
    expect(await call(`${base}/books/lathe`, "GET")).toMatchObject({
      status: 404,
      body: { error: "book not found" },
    });
  });

  it("answers 400 for an invalid Book, a missing title, or a body that is not JSON", async () => {
    const base = await serve();
    expect(await call(`${base}/books/lathe`, "PUT", { title: " " })).toMatchObject({
      status: 400,
      body: { error: "a Book needs a title" },
    });
    expect(await call(`${base}/books/lathe`, "PUT", {})).toMatchObject({
      status: 400,
      body: { error: "title must be a string" },
    });
    expect(await call(`${base}/books/lathe`, "PUT")).toMatchObject({
      status: 400,
      body: { error: "title must be a string" },
    });
    expect(await call(`${base}/books/lathe`, "PUT", "{")).toMatchObject({
      status: 400,
      body: { error: "the body is not JSON" },
    });
  });
});

describe("Lending routes", () => {
  it("lends, consults, and returns a Loan", async () => {
    const base = await serve();
    await call(`${base}/books/dispossessed`, "PUT", { title: "The Dispossessed" });
    const made = await call(`${base}/loans`, "POST", { bookId: "dispossessed", borrower: "Ada" });
    expect(made).toMatchObject({
      status: 201,
      body: { bookId: "dispossessed", borrower: "Ada", returnedOn: null, overdue: false },
    });
    const id = (made.body as { id: string }).id;
    expect(await call(`${base}/loans/${id}`, "GET")).toEqual({ ...made, status: 200 });
    expect(await call(`${base}/loans/${id}/return`, "POST")).toMatchObject({
      status: 200,
      body: { id, overdue: false },
    });
    expect(await call(`${base}/loans/${id}/return`, "POST")).toMatchObject({
      status: 409,
      body: { error: `Loan ${id} was already returned` },
    });
  });

  it("answers 404 for a Book absent from the Catalog or a Loan that does not exist", async () => {
    const base = await serve();
    expect(await call(`${base}/loans`, "POST", { bookId: "lathe", borrower: "Ada" })).toMatchObject(
      {
        status: 404,
        body: { error: "Book lathe is not in the Catalog" },
      },
    );
    expect(await call(`${base}/loans/nope`, "GET")).toMatchObject({
      status: 404,
      body: { error: "Loan nope does not exist" },
    });
    expect(await call(`${base}/loans/nope/return`, "POST")).toMatchObject({ status: 404 });
  });

  it("answers 400 for a Loan without a Borrower or without a bookId", async () => {
    const base = await serve();
    await call(`${base}/books/dispossessed`, "PUT", { title: "The Dispossessed" });
    expect(
      await call(`${base}/loans`, "POST", { bookId: "dispossessed", borrower: " " }),
    ).toMatchObject({
      status: 400,
      body: { error: "a Loan needs a Borrower" },
    });
    expect(await call(`${base}/loans`, "POST", { borrower: "Ada" })).toMatchObject({
      status: 400,
      body: { error: "bookId must be a string" },
    });
  });
});

describe("the server", () => {
  it("answers 404 for an unknown route and for a known path under another method", async () => {
    const base = await serve();
    expect(await call(`${base}/shelves`, "GET")).toMatchObject({
      status: 404,
      body: { error: "no such route" },
    });
    expect(await call(`${base}/loans`, "GET")).toMatchObject({ status: 404 });
    expect(await call(`${base}/books/x/extra`, "GET")).toMatchObject({ status: 404 });
  });

  it("matches a route only on its whole path", async () => {
    const base = await serve();
    const misses: [string, string][] = [
      ["PUT", "/x/books/a"],
      ["PUT", "/books/a/x"],
      ["GET", "/x/books/a"],
      ["POST", "/x/loans"],
      ["POST", "/loans/x"],
      ["GET", "/x/loans/a"],
      ["GET", "/loans/a/x"],
      ["POST", "/x/loans/a/return"],
      ["POST", "/loans/a/return/x"],
    ];
    for (const [method, path] of misses) {
      expect(
        await call(`${base}${path}`, method, method === "GET" ? undefined : { title: "t" }),
        `${method} ${path}`,
      ).toMatchObject({
        status: 404,
        body: { error: "no such route" },
      });
    }
  });

  it("maps an HttpError to its status and anything else to 500", async () => {
    const base = await serve([
      {
        method: "GET",
        path: /^\/teapot$/,
        handle: () => Promise.reject(new HttpError(418, "short and stout")),
      },
      {
        method: "GET",
        path: /^\/broken$/,
        handle: () => Promise.reject(new Error("secret detail")),
      },
    ]);
    expect(await call(`${base}/teapot`, "GET")).toMatchObject({
      status: 418,
      body: { error: "short and stout" },
    });
    expect(await call(`${base}/broken`, "GET")).toEqual({
      status: 500,
      type: "application/json",
      body: { error: "internal error" },
    });
  });
});
