import { describe, expect, it } from "vitest";
import {
  InvalidLoan,
  LOAN_PERIOD_DAYS,
  LoanAlreadyReturned,
  dayOf,
  isOverdue,
  recordReturn,
  takeOnLoan,
} from "./loan.js";

const madeOn = new Date("2026-03-01T15:30:00Z");

describe("takeOnLoan", () => {
  it("makes an open Loan due after the loan period", () => {
    expect(takeOnLoan("loan-1", "dispossessed", "Ada", madeOn)).toEqual({
      id: "loan-1",
      bookId: "dispossessed",
      borrower: "Ada",
      loanedOn: "2026-03-01",
      dueDate: "2026-03-15",
      returnedOn: null,
    });
  });

  it("uses a fourteen-day loan period", () => {
    expect(LOAN_PERIOD_DAYS).toBe(14);
  });

  it("crosses month and year ends", () => {
    expect(takeOnLoan("loan-2", "b", "Ada", new Date("2026-12-25T00:00:00Z")).dueDate).toBe(
      "2027-01-08",
    );
  });

  it("trims the Borrower", () => {
    expect(takeOnLoan("loan-1", "b", "  Ada ", madeOn).borrower).toBe("Ada");
  });

  it("refuses a Loan without a Borrower", () => {
    expect(() => takeOnLoan("loan-1", "b", "  ", madeOn)).toThrow(
      new InvalidLoan("a Loan needs a Borrower"),
    );
  });
});

describe("recordReturn", () => {
  it("closes the Loan on the day of its Return", () => {
    const loan = takeOnLoan("loan-1", "b", "Ada", madeOn);
    expect(recordReturn(loan, new Date("2026-03-10T09:00:00Z"))).toEqual({
      ...loan,
      returnedOn: "2026-03-10",
    });
  });

  it("refuses a second Return", () => {
    const returned = recordReturn(takeOnLoan("loan-1", "b", "Ada", madeOn), madeOn);
    expect(() => recordReturn(returned, madeOn)).toThrow(
      new LoanAlreadyReturned("Loan loan-1 was already returned"),
    );
  });
});

describe("isOverdue", () => {
  const loan = takeOnLoan("loan-1", "b", "Ada", madeOn);

  it("is not Overdue on its Due Date", () => {
    expect(isOverdue(loan, new Date("2026-03-15T23:59:59Z"))).toBe(false);
  });

  it("is Overdue the day after its Due Date", () => {
    expect(isOverdue(loan, new Date("2026-03-16T00:00:00Z"))).toBe(true);
  });

  it("is never Overdue once returned", () => {
    const returned = recordReturn(loan, new Date("2026-03-20T00:00:00Z"));
    expect(isOverdue(returned, new Date("2026-04-01T00:00:00Z"))).toBe(false);
  });
});

describe("errors and days", () => {
  it("names its errors", () => {
    expect(new InvalidLoan("x").name).toBe("InvalidLoan");
    expect(new LoanAlreadyReturned("x").name).toBe("LoanAlreadyReturned");
  });

  it("writes a day as YYYY-MM-DD in UTC", () => {
    expect(dayOf(new Date("2026-03-01T23:30:00-03:00"))).toBe("2026-03-02");
  });
});
