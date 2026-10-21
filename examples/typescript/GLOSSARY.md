# Library Lending

An HTTP service that lets a small library catalogue the books it holds and lend them to borrowers, on Postgres.

## Lending

The core context: it decides whether a book may be lent, records loans, and records their returns.

**Loan**:
An agreement that a borrower holds a copy of a book from the moment it is borrowed until it is returned or becomes overdue.
_Avoid_: Checkout, Rental, Transaction, Borrow Record

**Borrower**:
The person who takes a book on loan, identified by name.
_Avoid_: User, Client, Patron, Member

**Due Date**:
The moment by which a loan must be returned; it is fourteen days after the loan starts.
_Avoid_: Deadline, Expiry

**Return**:
The act that ends a loan by recording when the book came back.
_Avoid_: Check-in, Give Back

**Overdue**:
A loan that is past its due date and has not been returned.
_Avoid_: Late, Expired

## Catalog

The supporting context: it owns which books the library holds, their authors, and how many copies exist.

**Book**:
A work the library holds, with an id, a title, an author, and a number of copies.
_Avoid_: Item, Volume

**Copy**:
One physical unit of a book; the catalog records how many copies of a book the library holds.
_Avoid_: Piece

**Catalog**:
The context that owns books and their copies, and answers whether a book is held.
_Avoid_: Inventory, Stock
