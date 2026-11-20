// Delivery mechanics for the lending scenarios: HTTP requests and status codes
// stay here, out of the feature files.
import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { LibraryWorld } from "../support/world.js";

Given(
  "the Book {string} is registered in the Catalog",
  async function (this: LibraryWorld, title: string) {
    const answer = await this.send("PUT", `/books/${this.bookId(title)}`, { title });
    assert.equal(answer.status, 200);
  },
);

When(
  "the Borrower {string} takes {string} on Loan",
  async function (this: LibraryWorld, borrower: string, title: string) {
    const answer = await this.send("POST", "/loans", { bookId: this.bookId(title), borrower });
    assert.equal(answer.status, 201);
    this.loanId = String(answer.body.id);
  },
);

When(
  "the Borrower {string} tries to take {string} on Loan",
  async function (this: LibraryWorld, borrower: string, title: string) {
    await this.send("POST", "/loans", { bookId: this.bookId(title), borrower });
  },
);

Then("the Loan can be consulted and is still open", async function (this: LibraryWorld) {
  const answer = await this.send("GET", `/loans/${String(this.loanId)}`);
  assert.equal(answer.status, 200);
  assert.equal(answer.body.returnedOn, null);
});

When("the Return of the Loan is recorded", async function (this: LibraryWorld) {
  const answer = await this.send("POST", `/loans/${String(this.loanId)}/return`);
  assert.equal(answer.status, 200);
});

Then(
  "a later consultation shows that the Loan has been returned",
  async function (this: LibraryWorld) {
    const answer = await this.send("GET", `/loans/${String(this.loanId)}`);
    assert.equal(answer.status, 200);
    assert.match(String(answer.body.returnedOn), /^\d{4}-\d{2}-\d{2}$/);
  },
);

Then("the Loan is refused because the Book was not found", function (this: LibraryWorld) {
  assert.equal(this.lastAnswer?.status, 404);
  assert.match(String(this.lastAnswer.body.error), /not in the Catalog/);
});
