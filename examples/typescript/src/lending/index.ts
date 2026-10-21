import type { Pool } from "pg";
import type { Catalog } from "../catalog/index.js";
import { LendingService } from "./application/lending-service.js";
import {
  migrateLoanRepository,
  PostgresLoanRepository,
} from "./adapters/postgres-loan-repository.js";
import type { Loan } from "./domain/loan.js";

export type { Loan } from "./domain/loan.js";
export {
  borrowBook,
  InvalidLoanError,
  isOverdue,
  LOAN_PERIOD_DAYS,
  LoanAlreadyReturnedError,
  returnLoan,
} from "./domain/loan.js";
export {
  BookNotFoundError,
  LoanNotFoundError,
  type BorrowInput,
} from "./application/lending-service.js";

// The context's public interface: other contexts may import this file and
// nothing else from src/lending/.
export interface Lending {
  borrow(input: { bookId: string; borrower: string }): Promise<Loan>;
  returnLoan(loanId: string): Promise<Loan>;
  findLoan(loanId: string): Promise<Loan | null>;
}

export function createLending(pool: Pool, catalog: Catalog): Lending {
  return new LendingService(new PostgresLoanRepository(pool), catalog);
}

export async function migrateLending(pool: Pool): Promise<void> {
  await migrateLoanRepository(pool);
}
