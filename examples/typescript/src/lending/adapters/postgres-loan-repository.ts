import type pg from "pg";
import type { Loan, LoanId } from "../domain/loan.js";
import type { LoanRepository } from "../application/lending-service.js";

interface LoanRow {
  id: string;
  book_id: string;
  borrower: string;
  loaned_on: string;
  due_date: string;
  returned_on: string | null;
}

/** Stores Loans in the `lending` schema, which this context owns. */
export class PostgresLoanRepository implements LoanRepository {
  constructor(private readonly pool: pg.Pool) {}

  static async migrate(pool: pg.Pool): Promise<void> {
    await pool.query("CREATE SCHEMA IF NOT EXISTS lending");
    await pool.query(
      `CREATE TABLE IF NOT EXISTS lending.loans (
        id text PRIMARY KEY,
        book_id text NOT NULL,
        borrower text NOT NULL,
        loaned_on date NOT NULL,
        due_date date NOT NULL,
        returned_on date
      )`,
    );
  }

  async save(loan: Loan): Promise<void> {
    await this.pool.query(
      `INSERT INTO lending.loans (id, book_id, borrower, loaned_on, due_date, returned_on)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET returned_on = EXCLUDED.returned_on`,
      [loan.id, loan.bookId, loan.borrower, loan.loanedOn, loan.dueDate, loan.returnedOn],
    );
  }

  async findById(id: LoanId): Promise<Loan | undefined> {
    const result = await this.pool.query<LoanRow>(
      `SELECT id, book_id, borrower, loaned_on::text, due_date::text, returned_on::text
       FROM lending.loans WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toLoan(row);
  }
}

function toLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    bookId: row.book_id,
    borrower: row.borrower,
    loanedOn: row.loaned_on,
    dueDate: row.due_date,
    returnedOn: row.returned_on,
  };
}
