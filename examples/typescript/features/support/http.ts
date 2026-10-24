// The only application seam the e2e level uses: requests to the running
// service's public HTTP edge.
export type JsonBody = Record<string, unknown> | null;

export interface HttpReply {
  readonly status: number;
  readonly body: JsonBody;
}

export async function request(
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<HttpReply> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, init);
  return {
    status: response.status,
    body: parseBody(await response.text()),
  };
}

function parseBody(text: string): JsonBody {
  if (text === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`the service replied with invalid JSON: ${text}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`the service replied with a JSON value that is not an object: ${text}`);
  }
  return parsed as Record<string, unknown>;
}
