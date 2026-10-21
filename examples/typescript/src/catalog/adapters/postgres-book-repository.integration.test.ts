import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createBook, InvalidBookError } from "../domain/book.js";
import { migrateBookRepository, PostgresBookRepository } from "./postgres-book-repository.js";
import { startPostgres, type PostgresHarness } from "../../../test/support/postgres.js";

let harness: PostgresHarness;
let pool: Pool;
let repository: PostgresBookRepository;

beforeAll(async () => {
  harness = await startPostgres();
  pool = harness.pool;
  await migrateBookRepository(pool);
  repository = new PostgresBookRepository(pool);
});

afterAll(async () => {
  await harness.stop();
});

describe("PostgresBookRepository", () => {
  it("round-trips a book", async () => {
    const book = createBook({
      id: "book-1",
      title: "Piranesi",
      author: "Susanna Clarke",
      copies: 2,
    });

    await repository.save(book);

    await expect(repository.findById("book-1")).resolves.toEqual(book);
  });

  it("returns null for a book the catalog does not hold", async () => {
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("updates an existing book instead of inserting a duplicate", async () => {
    const book = createBook({
      id: "book-2",
      title: "Piranesi",
      author: "Susanna Clarke",
      copies: 2,
    });
    await repository.save(book);
    const updated = createBook({ ...book, title: "The Ladies of Grace Adieu", copies: 5 });

    await repository.save(updated);

    await expect(repository.findById("book-2")).resolves.toEqual(updated);
  });

  it("rejects a book the domain considers invalid", () => {
    expect(() => createBook({ id: "book-3", title: "", author: "Ada", copies: 1 })).toThrow(
      InvalidBookError,
    );
  });
});
