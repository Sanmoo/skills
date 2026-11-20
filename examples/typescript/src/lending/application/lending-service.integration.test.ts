import { describe, expect, it } from "vitest";
import { useDatabase } from "../../../test/support/database.js";
import { createCatalog } from "../../catalog/index.js";
import { PostgresLoanRepository } from "../adapters/postgres-loan-repository.js";
import { LoanAlreadyReturned } from "../domain/loan.js";
import { BookNotFound, LendingService, LoanNotFound } from "./lending-service.js";

const pool = useDatabase();

async function lendingOn(...days: string[]): Promise<LendingService> {
  const catalog = await createCatalog(pool);
  await catalog.register("dispossessed", "The Dispossessed");
  await PostgresLoanRepository.migrate(pool);
  let ids = 0;
  const clock = days.map((day) => new Date(`${day}T12:00:00Z`));
  return new LendingService({
    books: catalog,
    loans: new PostgresLoanRepository(pool),
    today: () => clock.shift() ?? new Date("2026-03-01T12:00:00Z"),
    newLoanId: () => `loan-${String(++ids)}`,
  });
}

describe("LendingService", () => {
  it("lends a Book the Catalog holds and can consult the Loan", async () => {
    const lending = await lendingOn("2026-03-01", "2026-03-01", "2026-03-02");
    const made = await lending.lend("dispossessed", "Ada");
    expect(made).toEqual({
      id: "loan-1",
      bookId: "dispossessed",
      borrower: "Ada",
      loanedOn: "2026-03-01",
      dueDate: "2026-03-15",
      returnedOn: null,
      overdue: false,
    });
    expect(await lending.consult("loan-1")).toEqual(made);
  });

  it("refuses a Book the Catalog does not hold, and makes no Loan", async () => {
    const lending = await lendingOn();
    await expect(lending.lend("lathe", "Ada")).rejects.toThrow(
      new BookNotFound("Book lathe is not in the Catalog"),
    );
    const rows = await pool.query("SELECT id FROM lending.loans");
    expect(rows.rows).toEqual([]);
  });

  it("reports an open Loan past its Due Date as Overdue", async () => {
    const lending = await lendingOn("2026-03-01", "2026-03-01", "2026-03-16");
    await lending.lend("dispossessed", "Ada");
    expect((await lending.consult("loan-1")).overdue).toBe(true);
  });

  it("records the Return, which a later consultation shows", async () => {
    const lending = await lendingOn(
      "2026-03-01",
      "2026-03-01",
      "2026-03-20",
      "2026-03-20",
      "2026-03-30",
    );
    await lending.lend("dispossessed", "Ada");
    const returned = await lending.recordReturn("loan-1");
    expect(returned).toMatchObject({ returnedOn: "2026-03-20", overdue: false });
    expect(await lending.consult("loan-1")).toMatchObject({
      returnedOn: "2026-03-20",
      overdue: false,
    });
  });

  it("refuses a second Return", async () => {
    const lending = await lendingOn();
    await lending.lend("dispossessed", "Ada");
    await lending.recordReturn("loan-1");
    await expect(lending.recordReturn("loan-1")).rejects.toBeInstanceOf(LoanAlreadyReturned);
  });

  it("refuses to consult or return a Loan that does not exist", async () => {
    const lending = await lendingOn();
    await expect(lending.consult("loan-9")).rejects.toThrow(
      new LoanNotFound("Loan loan-9 does not exist"),
    );
    await expect(lending.recordReturn("loan-9")).rejects.toBeInstanceOf(LoanNotFound);
  });

  it("names its errors", () => {
    expect(new BookNotFound("x").name).toBe("BookNotFound");
    expect(new LoanNotFound("x").name).toBe("LoanNotFound");
  });
});
