import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Catalog } from "../catalog/index.js";
import { InvalidBookError } from "../catalog/index.js";
import type { Lending } from "../lending/index.js";
import {
  BookNotFoundError,
  InvalidLoanError,
  LoanAlreadyReturnedError,
  LoanNotFoundError,
} from "../lending/index.js";

export interface HttpApp {
  readonly catalog: Catalog;
  readonly lending: Lending;
}

interface Route {
  readonly method: string;
  readonly pattern: RegExp;
  readonly handle: (params: Record<string, string>, body: unknown) => Promise<Reply>;
}

interface Reply {
  readonly status: number;
  readonly payload: unknown;
}

class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

const MAX_BODY_BYTES = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function routes(app: HttpApp): Route[] {
  return [
    {
      method: "GET",
      pattern: /^\/health$/,
      handle: () => Promise.resolve({ status: 200, payload: { status: "ok" } }),
    },
    {
      method: "POST",
      pattern: /^\/books$/,
      handle: async (_params, body) => {
        const input = isRecord(body) ? body : {};
        return {
          status: 201,
          payload: await app.catalog.addBook({
            title: input.title as string,
            author: input.author as string,
            copies: input.copies as number,
          }),
        };
      },
    },
    {
      method: "GET",
      pattern: /^\/books\/(?<id>[^/]+)$/,
      handle: async (params) => {
        const book = await app.catalog.findBook(params.id as string);
        if (book === null) return { status: 404, payload: { error: "book not found" } };
        return { status: 200, payload: book };
      },
    },
    {
      method: "POST",
      pattern: /^\/loans$/,
      handle: async (_params, body) => {
        const input = isRecord(body) ? body : {};
        return {
          status: 201,
          payload: await app.lending.borrow({
            bookId: input.bookId as string,
            borrower: input.borrower as string,
          }),
        };
      },
    },
    {
      method: "GET",
      pattern: /^\/loans\/(?<id>[^/]+)$/,
      handle: async (params) => {
        const loan = await app.lending.findLoan(params.id as string);
        if (loan === null) return { status: 404, payload: { error: "loan not found" } };
        return { status: 200, payload: loan };
      },
    },
    {
      method: "POST",
      pattern: /^\/loans\/(?<id>[^/]+)\/return$/,
      handle: async (params) => ({
        status: 200,
        payload: await app.lending.returnLoan(params.id as string),
      }),
    },
  ];
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new InvalidRequestError("request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new InvalidRequestError("request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function toReply(error: unknown): Reply {
  if (
    error instanceof InvalidRequestError ||
    error instanceof InvalidBookError ||
    error instanceof InvalidLoanError
  ) {
    return { status: 400, payload: { error: error.message } };
  }
  if (error instanceof BookNotFoundError || error instanceof LoanNotFoundError) {
    return { status: 404, payload: { error: error.message } };
  }
  if (error instanceof LoanAlreadyReturnedError) {
    return { status: 409, payload: { error: error.message } };
  }
  return { status: 500, payload: { error: "internal server error" } };
}

function send(response: ServerResponse, reply: Reply): void {
  const body = JSON.stringify(reply.payload ?? null);
  response.writeHead(reply.status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function handle(table: Route[], request: IncomingMessage, response: ServerResponse) {
  const method = request.method ?? "GET";
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const route = table.find(
    (candidate) => candidate.method === method && candidate.pattern.test(path),
  );
  if (route === undefined) {
    const pathExists = table.some((candidate) => candidate.pattern.test(path));
    send(response, {
      status: pathExists ? 405 : 404,
      payload: { error: pathExists ? "method not allowed" : "not found" },
    });
    return;
  }
  try {
    const match = route.pattern.exec(path);
    const params = (match?.groups ?? {}) as Record<string, string>;
    const body = method === "POST" ? await readBody(request) : undefined;
    send(response, await route.handle(params, body));
  } catch (error) {
    send(response, toReply(error));
  }
}

export function createHttpServer(app: HttpApp): Server {
  const table = routes(app);
  return createServer((request, response) => {
    void handle(table, request, response);
  });
}
