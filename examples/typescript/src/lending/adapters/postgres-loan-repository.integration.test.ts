import { describe, expect, it } from "vitest";
import { useDatabase } from "../../../test/support/database.js";
import type { Loan } from "../domain/loan.js";
import { PostgresLoanRepository } from "./postgres-loan-repository.js";

const pool = useDatabase();

const loan: Loan = {
  id: "loan-1",
  bookId: "dispossessed",
  borrower: "Ada",
  loanedOn: "2026-03-01",
  dueDate: "2026-03-15",
  returnedOn: null,
};

async function repository(): Promise<PostgresLoanRepository> {
  await PostgresLoanRepository.migrate(pool);
  return new PostgresLoanRepository(pool);
}

describe("PostgresLoanRepository", () => {
  it("finds an open Loan it saved, field by field", async () => {
    const loans = await repository();
    await loans.save(loan);
    expect(await loans.findById("loan-1")).toEqual(loan);
  });

  it("finds nothing under an id it never saved", async () => {
    const loans = await repository();
    await loans.save(loan);
    expect(await loans.findById("loan-2")).toBeUndefined();
  });

  it("records the Return of a Loan saved again", async () => {
    const loans = await repository();
    await loans.save(loan);
    await loans.save({ ...loan, returnedOn: "2026-03-10" });
    expect(await loans.findById("loan-1")).toEqual({ ...loan, returnedOn: "2026-03-10" });
  });

  it("keeps its rows in the lending schema, and migrates twice safely", async () => {
    const loans = await repository();
    await PostgresLoanRepository.migrate(pool);
    await loans.save(loan);
    const rows = await pool.query("SELECT id FROM lending.loans");
    expect(rows.rows).toEqual([{ id: "loan-1" }]);
  });

  it("allows only an open Loan to lack a Return at the schema", async () => {
    await repository();
    await expect(
      pool.query(
        "INSERT INTO lending.loans (id, book_id, borrower, loaned_on, due_date) VALUES ('x', 'b', NULL, '2026-01-01', '2026-01-15')",
      ),
    ).rejects.toThrow(/null value/);
  });
});
