/** Days between the day a Loan is made and its Due Date, under the lending policy. */
export const LOAN_PERIOD_DAYS = 14;

const DAY_MS = 86_400_000;

export type LoanId = string;

/** A calendar day, written YYYY-MM-DD. */
export type Day = string;

export interface Loan {
  readonly id: LoanId;
  readonly bookId: string;
  readonly borrower: string;
  readonly loanedOn: Day;
  readonly dueDate: Day;
  readonly returnedOn: Day | null;
}

export class InvalidLoan extends Error {
  override readonly name = "InvalidLoan";
}

export class LoanAlreadyReturned extends Error {
  override readonly name = "LoanAlreadyReturned";
}

export function dayOf(date: Date): Day {
  return date.toISOString().slice(0, 10);
}

function addDays(day: Day, days: number): Day {
  return dayOf(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

/** Makes a Loan of a Book to a Borrower, due LOAN_PERIOD_DAYS after `today`. */
export function takeOnLoan(id: LoanId, bookId: string, borrower: string, today: Date): Loan {
  const name = borrower.trim();
  if (name === "") throw new InvalidLoan("a Loan needs a Borrower");
  const loanedOn = dayOf(today);
  return {
    id,
    bookId,
    borrower: name,
    loanedOn,
    dueDate: addDays(loanedOn, LOAN_PERIOD_DAYS),
    returnedOn: null,
  };
}

/** Records the Return of a Loan, which closes it. */
export function recordReturn(loan: Loan, today: Date): Loan {
  if (loan.returnedOn !== null)
    throw new LoanAlreadyReturned(`Loan ${loan.id} was already returned`);
  return { ...loan, returnedOn: dayOf(today) };
}

/** An open Loan is Overdue once its Due Date has passed. */
export function isOverdue(loan: Loan, today: Date): boolean {
  return loan.returnedOn === null && dayOf(today) > loan.dueDate;
}
