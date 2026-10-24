import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Given, Then, When } from "@cucumber/cucumber";
import type { HttpReply } from "../support/http.js";
import type { LibraryWorld } from "../support/world.js";

interface BookBody extends Record<string, unknown> {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly copies: number;
}

interface LoanBody extends Record<string, unknown> {
  readonly id: string;
  readonly bookId: string;
  readonly borrower: string;
  readonly returnedAt: string | null;
}

interface ErrorBody extends Record<string, unknown> {
  readonly error: string;
}

function required(value: string | undefined, name: string): string {
  assert.ok(value !== undefined, `the scenario has no ${name} yet`);
  return value;
}

function expectStatus(reply: HttpReply, expected: number, action: string): void {
  assert.equal(reply.status, expected, `${action}: expected ${expected}, got ${reply.status}`);
}

function takeOnLoan(world: LibraryWorld, borrower: string): Promise<HttpReply> {
  return world.send("POST", "/loans", {
    bookId: required(world.bookId, "book"),
    borrower,
  });
}

async function consultLoan(world: LibraryWorld): Promise<LoanBody> {
  const reply = await world.send("GET", `/loans/${required(world.loanId, "loan")}`);
  expectStatus(reply, 200, "consulting the loan");
  return reply.body as LoanBody;
}

Given(
  "the library holds the book {string} by {string}",
  async function (this: LibraryWorld, title: string, author: string) {
    const reply = await this.send("POST", "/books", {
      title,
      author,
      copies: 1,
    });
    expectStatus(reply, 201, "registering the book");
    this.bookId = (reply.body as BookBody).id;
  },
);

Given(
  "the book {string} is not in the catalog",
  async function (this: LibraryWorld, title: string) {
    // A book id that was never registered; the HTTP edge only accepts an id.
    this.bookId = randomUUID();
    const reply = await this.send("GET", `/books/${this.bookId}`);
    assert.equal(reply.status, 404, `${title} unexpectedly exists in the catalog`);
  },
);

When(
  "the borrower {string} takes the book on loan",
  async function (this: LibraryWorld, borrower: string) {
    const reply = await takeOnLoan(this, borrower);
    expectStatus(reply, 201, "taking the book on loan");
    this.loanId = (reply.body as LoanBody).id;
  },
);

When(
  "the borrower {string} asks to take the book on loan",
  async function (this: LibraryWorld, borrower: string) {
    this.lastReply = await takeOnLoan(this, borrower);
  },
);

Then("the loan can be consulted and has not been returned", async function (this: LibraryWorld) {
  const loan = await consultLoan(this);
  assert.equal(loan.bookId, required(this.bookId, "book"));
  assert.equal(loan.returnedAt, null);
});

When("the borrower records the return of the loan", async function (this: LibraryWorld) {
  const reply = await this.send("POST", `/loans/${required(this.loanId, "loan")}/return`);
  expectStatus(reply, 200, "recording the return");
  const loan = reply.body as LoanBody;
  assert.notEqual(loan.returnedAt, null, "the recorded return did not report a returned loan");
});

Then("a later consultation shows the loan has been returned", async function (this: LibraryWorld) {
  const loan = await consultLoan(this);
  assert.notEqual(loan.returnedAt, null, "the loan does not show that it has been returned");
});

Then("the loan request is refused because the book was not found", function (this: LibraryWorld) {
  const reply = this.lastReply;
  assert.ok(reply !== undefined, "the scenario has no loan request yet");
  expectStatus(reply, 404, "the loan request");
  assert.ok(reply.body !== null, "the refused loan request carried no reason");
  const body = reply.body as ErrorBody;
  assert.match(body.error, /not in the catalog/);
});
