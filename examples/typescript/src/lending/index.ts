// Lending's public interface: the delivery root imports only this module.
import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { CatalogService } from "../catalog/index.js";
import { PostgresLoanRepository } from "./adapters/postgres-loan-repository.js";
import { LendingService } from "./application/lending-service.js";

export type { Loan, LoanId } from "./domain/loan.js";
export { InvalidLoan, LoanAlreadyReturned } from "./domain/loan.js";
export type { LendingService, LoanView } from "./application/lending-service.js";
export { BookNotFound, LoanNotFound } from "./application/lending-service.js";

export async function createLending(
  pool: pg.Pool,
  catalog: Pick<CatalogService, "find">,
): Promise<LendingService> {
  await PostgresLoanRepository.migrate(pool);
  return new LendingService({
    books: catalog,
    loans: new PostgresLoanRepository(pool),
    today: () => new Date(),
    newLoanId: randomUUID,
  });
}
