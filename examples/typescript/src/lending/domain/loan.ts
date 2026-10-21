// Lending domain, the core of the system. No framework, storage, or node
// built-in imports belong here.
export type Loan = Readonly<{
  id: string;
  bookId: string;
  borrower: string;
  borrowedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
}>;

export const LOAN_PERIOD_DAYS = 14;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BorrowRequest {
  readonly id: string;
  readonly bookId: string;
  readonly borrower: string;
  readonly now: Date;
}

export class InvalidLoanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLoanError";
  }
}

export class LoanAlreadyReturnedError extends Error {
  constructor(loanId: string) {
    super(`loan ${loanId} has already been returned`);
    this.name = "LoanAlreadyReturnedError";
  }
}

export function borrowBook(request: BorrowRequest): Loan {
  if (typeof request.id !== "string" || request.id.trim() === "") {
    throw new InvalidLoanError("loan id must not be empty");
  }
  if (typeof request.bookId !== "string" || request.bookId.trim() === "") {
    throw new InvalidLoanError("loan book id must not be empty");
  }
  if (typeof request.borrower !== "string" || request.borrower.trim() === "") {
    throw new InvalidLoanError("loan borrower must not be empty");
  }
  if (Number.isNaN(request.now.getTime())) {
    throw new InvalidLoanError("loan start must be a valid date");
  }
  const borrowedAt = new Date(request.now.getTime());
  return Object.freeze({
    id: request.id,
    bookId: request.bookId,
    borrower: request.borrower.trim(),
    borrowedAt,
    dueAt: new Date(borrowedAt.getTime() + LOAN_PERIOD_DAYS * MILLISECONDS_PER_DAY),
    returnedAt: null,
  });
}

export function returnLoan(loan: Loan, now: Date): Loan {
  if (loan.returnedAt !== null) {
    throw new LoanAlreadyReturnedError(loan.id);
  }
  if (Number.isNaN(now.getTime())) {
    throw new InvalidLoanError("return moment must be a valid date");
  }
  if (now.getTime() < loan.borrowedAt.getTime()) {
    throw new InvalidLoanError("return moment must not precede the loan");
  }
  return Object.freeze({ ...loan, returnedAt: new Date(now.getTime()) });
}

export function isOverdue(loan: Loan, now: Date): boolean {
  return loan.returnedAt === null && now.getTime() > loan.dueAt.getTime();
}
