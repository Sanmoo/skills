Feature: Lending books from the catalog

  Scenario: A borrower takes a catalogued book on loan and returns it
    Given the library holds the book "Piranesi" by "Susanna Clarke"
    When the borrower "Ada Lovelace" takes the book on loan
    Then the loan can be consulted and has not been returned
    When the borrower records the return of the loan
    Then a later consultation shows the loan has been returned

  Scenario: A borrower cannot take a book that is not in the catalog
    Given the book "The Left Hand of Darkness" is not in the catalog
    When the borrower "Ada Lovelace" asks to take the book on loan
    Then the loan request is refused because the book was not found
