import { InvalidBook, type CatalogService } from "../catalog/index.js";
import { HttpError, field, reply, type Route } from "./server.js";

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof InvalidBook) throw new HttpError(400, error.message);
    throw error;
  }
}

export function catalogRoutes(catalog: CatalogService): Route[] {
  return [
    {
      method: "PUT",
      path: /^\/books\/([^/]+)$/,
      handle: ([id = ""], body) =>
        guard(async () => reply(200, await catalog.register(id, field(body, "title")))),
    },
    {
      method: "GET",
      path: /^\/books\/([^/]+)$/,
      handle: async ([id = ""]) => {
        const book = await catalog.find(id);
        return book === undefined ? reply(404, { error: "book not found" }) : reply(200, book);
      },
    },
  ];
}
