# Library Lending

A small public library's system for lending the books it holds under its own lending policy.

## Lending

Owns the lending policy: who borrows which book, until when, and whether it came back in time.

**Loan**:
One Borrower holding one Book from the Catalog for a period that ends at its Due Date. A Loan is open until its Return is recorded.
_Avoid_: checkout, rental

**Borrower**:
The person a Loan is made to, identified by the library.
_Avoid_: user, patron, member

**Due Date**:
The day by which a Loan's Book must be back. The lending policy sets it when the Loan is made.
_Avoid_: deadline, expiry

**Return**:
The recorded moment a Loan's Book came back, which closes the Loan.
_Avoid_: checkin, giveback

**Overdue**:
The state of an open Loan whose Due Date has passed without a Return.
_Avoid_: late, delinquent

## Catalog

Owns what the library holds: the Books it has registered and their Copies.

**Book**:
A work the library has registered in its Catalog, identified independently of any physical unit.
_Avoid_: item, volume

**Copy**:
One physical unit of a Book that the library holds.
_Avoid_: exemplar, specimen

**Catalog**:
The register of every Book the library holds.
_Avoid_: inventory, stock
