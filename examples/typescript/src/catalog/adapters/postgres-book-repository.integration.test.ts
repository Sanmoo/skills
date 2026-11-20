import { describe, expect, it } from "vitest";
import { useDatabase } from "../../../test/support/database.js";
import { PostgresBookRepository } from "./postgres-book-repository.js";

const pool = useDatabase();

async function repository(): Promise<PostgresBookRepository> {
  await PostgresBookRepository.migrate(pool);
  return new PostgresBookRepository(pool);
}

describe("PostgresBookRepository", () => {
  it("finds a Book it saved", async () => {
    const books = await repository();
    await books.save({ id: "dispossessed", title: "The Dispossessed" });
    expect(await books.findById("dispossessed")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
  });

  it("finds nothing under an id it never saved", async () => {
    const books = await repository();
    await books.save({ id: "dispossessed", title: "The Dispossessed" });
    expect(await books.findById("lathe")).toBeUndefined();
  });

  it("replaces the title of a Book saved again", async () => {
    const books = await repository();
    await books.save({ id: "dispossessed", title: "Draft" });
    await books.save({ id: "dispossessed", title: "The Dispossessed" });
    expect(await books.findById("dispossessed")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
  });

  it("keeps its rows in the catalog schema, and migrates twice safely", async () => {
    const books = await repository();
    await PostgresBookRepository.migrate(pool);
    await books.save({ id: "dispossessed", title: "The Dispossessed" });
    const rows = await pool.query("SELECT id, title FROM catalog.books");
    expect(rows.rows).toEqual([{ id: "dispossessed", title: "The Dispossessed" }]);
  });

  it("refuses a Book without a title at the schema", async () => {
    await repository();
    await expect(
      pool.query("INSERT INTO catalog.books (id, title) VALUES ('x', NULL)"),
    ).rejects.toThrow(/null value/);
  });
});
