import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface Reply {
  readonly status: number;
  readonly body: unknown;
}

export interface Route {
  readonly method: string;
  readonly path: RegExp;
  handle(params: readonly string[], body: unknown): Promise<Reply>;
}

/** An error a route maps to a client-facing status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function reply(status: number, body: unknown): Reply {
  return { status, body };
}

/** Reads a required string field from a JSON body, or refuses the request. */
export function field(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") throw new HttpError(400, `${key} must be a string`);
  return value;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  if (text === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "the body is not JSON");
  }
}

async function dispatch(routes: readonly Route[], request: IncomingMessage): Promise<Reply> {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  for (const route of routes) {
    const match = route.path.exec(path);
    if (match !== null && route.method === request.method) {
      return route.handle(match.slice(1), await readBody(request));
    }
  }
  return reply(404, { error: "no such route" });
}

function failure(error: unknown): Reply {
  if (error instanceof HttpError) return reply(error.status, { error: error.message });
  return reply(500, { error: "internal error" });
}

function send(response: ServerResponse, { status, body }: Reply): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function createHttpServer(routes: readonly Route[]): Server {
  return createServer((request, response) => {
    dispatch(routes, request).then(
      (result) => {
        send(response, result);
      },
      (error: unknown) => {
        send(response, failure(error));
      },
    );
  });
}
