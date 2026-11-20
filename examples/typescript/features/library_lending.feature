Feature: Lending the Books the Catalog holds
  The library lends the Books registered in its Catalog to Borrowers.
  A Loan stays open until its Return is recorded.

  Scenario: A Borrower takes a Book on Loan and returns it
    Given the Book "The Dispossessed" is registered in the Catalog
    When the Borrower "Ada" takes "The Dispossessed" on Loan
    Then the Loan can be consulted and is still open
    When the Return of the Loan is recorded
    Then a later consultation shows that the Loan has been returned

  Scenario: A Book absent from the Catalog cannot be taken on Loan
    When the Borrower "Ada" tries to take "The Unwritten Book" on Loan
    Then the Loan is refused because the Book was not found
