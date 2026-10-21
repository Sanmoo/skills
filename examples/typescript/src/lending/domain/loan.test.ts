import { describe, expect, it } from "vitest";
import {
  borrowBook,
  InvalidLoanError,
  isOverdue,
  LOAN_PERIOD_DAYS,
  LoanAlreadyReturnedError,
  returnLoan,
  type Loan,
} from "./loan.js";

const start = new Date("2026-01-10T09:00:00.000Z");
const request = { id: "loan-1", bookId: "book-1", borrower: "Ada Lovelace", now: start };

function borrowed(): Loan {
  return borrowBook(request);
}

function daysAfter(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

describe("borrowBook", () => {
  it("creates a loan due fourteen days after it starts", () => {
    expect(borrowed()).toEqual({
      id: "loan-1",
      bookId: "book-1",
      borrower: "Ada Lovelace",
      borrowedAt: start,
      dueAt: daysAfter(start, LOAN_PERIOD_DAYS),
      returnedAt: null,
    });
    expect(LOAN_PERIOD_DAYS).toBe(14);
  });

  it("trims the borrower and freezes the loan", () => {
    const loan = borrowBook({ ...request, borrower: "  Ada Lovelace " });

    expect(loan.borrower).toBe("Ada Lovelace");
    expect(Object.isFrozen(loan)).toBe(true);
  });

  it("copies the start date instead of sharing it", () => {
    const now = new Date(start.getTime());
    const loan = borrowBook({ ...request, now });

    now.setUTCFullYear(2030);

    expect(loan.borrowedAt).toEqual(start);
  });

  it.each([
    ["an empty id", { id: "" }, "loan id must not be empty"],
    ["a blank id", { id: "  " }, "loan id must not be empty"],
    ["an empty book id", { bookId: "" }, "loan book id must not be empty"],
    ["a blank book id", { bookId: " " }, "loan book id must not be empty"],
    ["an empty borrower", { borrower: "" }, "loan borrower must not be empty"],
    ["a blank borrower", { borrower: "   " }, "loan borrower must not be empty"],
  ])("rejects %s", (_label, override, message) => {
    expect(() => borrowBook({ ...request, ...override })).toThrow(new InvalidLoanError(message));
  });

  it("rejects an invalid start date", () => {
    expect(() => borrowBook({ ...request, now: new Date("not a date") })).toThrow(
      new InvalidLoanError("loan start must be a valid date"),
    );
  });

  it("rejects a non-string borrower from an untyped caller", () => {
    const untyped = { ...request, borrower: 7 } as unknown as typeof request;

    expect(() => borrowBook(untyped)).toThrow(
      new InvalidLoanError("loan borrower must not be empty"),
    );
  });
});

describe("returnLoan", () => {
  it("records the return moment without mutating the original loan", () => {
    const loan = borrowed();
    const returnedAt = daysAfter(start, 3);

    const returned = returnLoan(loan, returnedAt);

    expect(returned).toEqual({ ...loan, returnedAt });
    expect(returned.returnedAt).toEqual(returnedAt);
    expect(loan.returnedAt).toBeNull();
    expect(Object.isFrozen(returned)).toBe(true);
  });

  it("copies the return moment instead of sharing it", () => {
    const returnedAt = daysAfter(start, 3);
    const returned = returnLoan(borrowed(), returnedAt);

    returnedAt.setUTCFullYear(2030);

    expect(returned.returnedAt).toEqual(daysAfter(start, 3));
  });

  it("accepts a return at the exact moment of borrowing", () => {
    const returned = returnLoan(borrowed(), start);

    expect(returned.returnedAt).toEqual(start);
  });

  it("rejects a second return", () => {
    const returned = returnLoan(borrowed(), daysAfter(start, 1));

    expect(() => returnLoan(returned, daysAfter(start, 2))).toThrow(
      new LoanAlreadyReturnedError("loan-1"),
    );
  });

  it("rejects an invalid return moment", () => {
    expect(() => returnLoan(borrowed(), new Date("nope"))).toThrow(
      new InvalidLoanError("return moment must be a valid date"),
    );
  });

  it("rejects a return before the loan started", () => {
    const before = new Date(start.getTime() - 1);

    expect(() => returnLoan(borrowed(), before)).toThrow(
      new InvalidLoanError("return moment must not precede the loan"),
    );
  });
});

describe("isOverdue", () => {
  it("is false before the due date", () => {
    expect(isOverdue(borrowed(), daysAfter(start, LOAN_PERIOD_DAYS - 1))).toBe(false);
  });

  it("is false at the exact due date", () => {
    expect(isOverdue(borrowed(), daysAfter(start, LOAN_PERIOD_DAYS))).toBe(false);
  });

  it("is true one millisecond after the due date", () => {
    const dueAt = daysAfter(start, LOAN_PERIOD_DAYS);

    expect(isOverdue(borrowed(), new Date(dueAt.getTime() + 1))).toBe(true);
  });

  it("is false once the loan is returned, even after the due date", () => {
    const returned = returnLoan(borrowed(), daysAfter(start, 2));

    expect(isOverdue(returned, daysAfter(start, LOAN_PERIOD_DAYS + 30))).toBe(false);
  });
});
