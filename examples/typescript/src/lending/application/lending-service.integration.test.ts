import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createCatalog, migrateCatalog, type Catalog } from "../../catalog/index.js";
import {
  BookNotFoundError,
  createLending,
  LOAN_PERIOD_DAYS,
  LoanAlreadyReturnedError,
  migrateLending,
  type Lending,
} from "../index.js";
import { startPostgres, type PostgresHarness } from "../../../test/support/postgres.js";

let harness: PostgresHarness;
let pool: Pool;
let catalog: Catalog;
let lending: Lending;

beforeAll(async () => {
  harness = await startPostgres();
  pool = harness.pool;
  await migrateCatalog(pool);
  await migrateLending(pool);
  catalog = createCatalog(pool);
  lending = createLending(pool, catalog);
});

afterAll(async () => {
  await harness.stop();
});

describe("Lending", () => {
  it("borrows a book the catalog holds and finds the loan", async () => {
    const book = await catalog.addBook({ title: "Piranesi", author: "Susanna Clarke", copies: 1 });

    const loan = await lending.borrow({ bookId: book.id, borrower: " Ada Lovelace " });

    expect(loan.bookId).toBe(book.id);
    expect(loan.borrower).toBe("Ada Lovelace");
    expect(loan.dueAt.getTime() - loan.borrowedAt.getTime()).toBe(
      LOAN_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    await expect(lending.findLoan(loan.id)).resolves.toEqual(loan);
  });

  it("refuses to lend a book the catalog does not hold", async () => {
    await expect(lending.borrow({ bookId: "missing", borrower: "Ada Lovelace" })).rejects.toThrow(
      BookNotFoundError,
    );
  });

  it("records a return and refuses to return the same loan twice", async () => {
    const book = await catalog.addBook({ title: "Piranesi", author: "Susanna Clarke", copies: 1 });
    const loan = await lending.borrow({ bookId: book.id, borrower: "Ada Lovelace" });

    const returned = await lending.returnLoan(loan.id);

    expect(returned.returnedAt).toBeInstanceOf(Date);
    await expect(lending.findLoan(loan.id)).resolves.toEqual(returned);
    await expect(lending.returnLoan(loan.id)).rejects.toThrow(LoanAlreadyReturnedError);
  });

  it("reports an unknown loan instead of a missing return", async () => {
    await expect(lending.returnLoan("missing")).rejects.toThrow(/does not exist/);
    await expect(lending.findLoan("missing")).resolves.toBeNull();
  });
});
