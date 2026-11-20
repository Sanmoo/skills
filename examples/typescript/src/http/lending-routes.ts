import {
  BookNotFound,
  InvalidLoan,
  LoanAlreadyReturned,
  LoanNotFound,
  type LendingService,
} from "../lending/index.js";
import { HttpError, field, reply, type Route } from "./server.js";

function statusOf(error: unknown): number | undefined {
  if (error instanceof BookNotFound || error instanceof LoanNotFound) return 404;
  if (error instanceof InvalidLoan) return 400;
  if (error instanceof LoanAlreadyReturned) return 409;
  return undefined;
}

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const status = statusOf(error);
    if (status !== undefined) throw new HttpError(status, (error as Error).message);
    throw error;
  }
}

export function lendingRoutes(lending: LendingService): Route[] {
  return [
    {
      method: "POST",
      path: /^\/loans$/,
      handle: (_params, body) =>
        guard(async () =>
          reply(201, await lending.lend(field(body, "bookId"), field(body, "borrower"))),
        ),
    },
    {
      method: "GET",
      path: /^\/loans\/([^/]+)$/,
      handle: ([id = ""]) => guard(async () => reply(200, await lending.consult(id))),
    },
    {
      method: "POST",
      path: /^\/loans\/([^/]+)\/return$/,
      handle: ([id = ""]) => guard(async () => reply(200, await lending.recordReturn(id))),
    },
  ];
}
