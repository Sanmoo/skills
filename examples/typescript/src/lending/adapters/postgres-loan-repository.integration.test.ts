import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { borrowBook, returnLoan } from "../domain/loan.js";
import { migrateLoanRepository, PostgresLoanRepository } from "./postgres-loan-repository.js";
import { startPostgres, type PostgresHarness } from "../../../test/support/postgres.js";

const start = new Date("2026-01-10T09:00:00.000Z");

let harness: PostgresHarness;
let pool: Pool;
let repository: PostgresLoanRepository;

beforeAll(async () => {
  harness = await startPostgres();
  pool = harness.pool;
  await migrateLoanRepository(pool);
  repository = new PostgresLoanRepository(pool);
});

afterAll(async () => {
  await harness.stop();
});

describe("PostgresLoanRepository", () => {
  it("round-trips an open loan", async () => {
    const loan = borrowBook({
      id: "loan-1",
      bookId: "book-1",
      borrower: "Ada Lovelace",
      now: start,
    });

    await repository.save(loan);

    await expect(repository.findById("loan-1")).resolves.toEqual(loan);
  });

  it("round-trips a returned loan", async () => {
    const loan = returnLoan(
      borrowBook({ id: "loan-2", bookId: "book-1", borrower: "Ada Lovelace", now: start }),
      new Date("2026-01-12T09:00:00.000Z"),
    );

    await repository.save(loan);

    const stored = await repository.findById("loan-2");
    expect(stored?.returnedAt).toEqual(new Date("2026-01-12T09:00:00.000Z"));
    await expect(repository.findById("loan-2")).resolves.toEqual(loan);
  });

  it("returns null for an unknown loan", async () => {
    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("updates an existing loan instead of inserting a duplicate", async () => {
    const loan = borrowBook({
      id: "loan-3",
      bookId: "book-1",
      borrower: "Ada Lovelace",
      now: start,
    });
    await repository.save(loan);
    const returned = returnLoan(loan, new Date("2026-01-20T09:00:00.000Z"));

    await repository.save(returned);

    await expect(repository.findById("loan-3")).resolves.toEqual(returned);
  });
});
