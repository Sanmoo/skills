import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createCatalog, InvalidBookError, migrateCatalog, type Catalog } from "../index.js";
import { startPostgres, type PostgresHarness } from "../../../test/support/postgres.js";

let harness: PostgresHarness;
let pool: Pool;
let catalog: Catalog;

beforeAll(async () => {
  harness = await startPostgres();
  pool = harness.pool;
  await migrateCatalog(pool);
  catalog = createCatalog(pool);
});

afterAll(async () => {
  await harness.stop();
});

describe("Catalog", () => {
  it("adds a book and finds it by its generated id", async () => {
    const added = await catalog.addBook({
      title: "  Piranesi ",
      author: " Susanna Clarke ",
      copies: 2,
    });

    expect(added.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(added.title).toBe("Piranesi");
    expect(added.author).toBe("Susanna Clarke");
    await expect(catalog.findBook(added.id)).resolves.toEqual(added);
  });

  it("returns null when the catalog does not hold the book", async () => {
    await expect(catalog.findBook("missing")).resolves.toBeNull();
  });

  it("rejects a book with no copies", async () => {
    await expect(
      catalog.addBook({ title: "Piranesi", author: "Susanna Clarke", copies: 0 }),
    ).rejects.toThrow(InvalidBookError);
  });
});
