import { randomUUID } from "node:crypto";
import type { Catalog } from "../../catalog/index.js";
import { borrowBook, returnLoan, type Loan } from "../domain/loan.js";

export interface LoanRepository {
  save(loan: Loan): Promise<void>;
  findById(id: string): Promise<Loan | null>;
}

export interface BorrowInput {
  readonly bookId: string;
  readonly borrower: string;
}

export class BookNotFoundError extends Error {
  constructor(bookId: string) {
    super(`book ${bookId} is not in the catalog`);
    this.name = "BookNotFoundError";
  }
}

export class LoanNotFoundError extends Error {
  constructor(loanId: string) {
    super(`loan ${loanId} does not exist`);
    this.name = "LoanNotFoundError";
  }
}

export class LendingService {
  constructor(
    private readonly loans: LoanRepository,
    private readonly catalog: Catalog,
  ) {}

  async borrow(input: BorrowInput): Promise<Loan> {
    const book = await this.catalog.findBook(input.bookId);
    if (book === null) {
      throw new BookNotFoundError(input.bookId);
    }
    const loan = borrowBook({
      id: randomUUID(),
      bookId: book.id,
      borrower: input.borrower,
      now: new Date(),
    });
    await this.loans.save(loan);
    return loan;
  }

  async returnLoan(loanId: string): Promise<Loan> {
    const loan = await this.loans.findById(loanId);
    if (loan === null) {
      throw new LoanNotFoundError(loanId);
    }
    const returned = returnLoan(loan, new Date());
    await this.loans.save(returned);
    return returned;
  }

  async findLoan(loanId: string): Promise<Loan | null> {
    return this.loans.findById(loanId);
  }
}
