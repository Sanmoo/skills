import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Given, Then, When } from "@cucumber/cucumber";
import { request } from "../support/http.js";
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

function required(value: string, name: string): string {
  assert.notEqual(value, "", `the scenario has no ${name} yet`);
  return value;
}

Given(
  "the library holds the book {string} by {string}",
  async function (this: LibraryWorld, title: string, author: string) {
    const reply = await request(this.baseUrl, "POST", "/books", {
      title,
      author,
      copies: 1,
    });
    assert.equal(
      reply.status,
      201,
      `registering the book failed with status ${String(reply.status)}`,
    );
    const book = reply.body as BookBody;
    this.bookTitle = book.title;
    this.bookId = book.id;
  },
);

Given(
  "the book {string} is not in the catalog",
  async function (this: LibraryWorld, title: string) {
    this.bookTitle = title;
    this.bookId = `absent-${randomUUID()}`;
    const reply = await request(this.baseUrl, "GET", `/books/${this.bookId}`);
    assert.equal(reply.status, 404, `${title} unexpectedly exists in the catalog`);
  },
);

When(
  "the borrower {string} takes the book on loan",
  async function (this: LibraryWorld, borrower: string) {
    const reply = await request(this.baseUrl, "POST", "/loans", {
      bookId: required(this.bookId, "book"),
      borrower,
    });
    assert.equal(
      reply.status,
      201,
      `taking the book on loan failed with status ${String(reply.status)}`,
    );
    this.loanId = (reply.body as LoanBody).id;
  },
);

When(
  "the borrower {string} asks to take the book on loan",
  async function (this: LibraryWorld, borrower: string) {
    const reply = await request(this.baseUrl, "POST", "/loans", {
      bookId: required(this.bookId, "book"),
      borrower,
    });
    this.lastStatus = reply.status;
    this.lastBody = reply.body;
  },
);

Then("the loan can be consulted and has not been returned", async function (this: LibraryWorld) {
  const reply = await request(this.baseUrl, "GET", `/loans/${required(this.loanId, "loan")}`);
  assert.equal(reply.status, 200, `consulting the loan failed with status ${String(reply.status)}`);
  const loan = reply.body as LoanBody;
  assert.equal(loan.bookId, required(this.bookId, "book"));
  assert.equal(loan.returnedAt, null);
});

When("the borrower records the return of the loan", async function (this: LibraryWorld) {
  const reply = await request(
    this.baseUrl,
    "POST",
    `/loans/${required(this.loanId, "loan")}/return`,
  );
  assert.equal(
    reply.status,
    200,
    `recording the return failed with status ${String(reply.status)}`,
  );
  const loan = reply.body as LoanBody;
  assert.notEqual(loan.returnedAt, null, "the recorded return did not report a returned loan");
});

Then("a later consultation shows the loan has been returned", async function (this: LibraryWorld) {
  const reply = await request(this.baseUrl, "GET", `/loans/${required(this.loanId, "loan")}`);
  assert.equal(reply.status, 200, `consulting the loan failed with status ${String(reply.status)}`);
  const loan = reply.body as LoanBody;
  assert.notEqual(loan.returnedAt, null, "the loan does not show that it has been returned");
});

Then("the loan request is refused because the book was not found", function (this: LibraryWorld) {
  assert.equal(
    this.lastStatus,
    404,
    `the loan request was answered with status ${String(this.lastStatus)}`,
  );
  const body = this.lastBody as ErrorBody;
  assert.match(body.error, /not in the catalog/);
});
