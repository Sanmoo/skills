import type { Pool } from "pg";
import type { Loan } from "../domain/loan.js";
import type { LoanRepository } from "../application/lending-service.js";

interface LoanRow {
  id: string;
  book_id: string;
  borrower: string;
  borrowed_at: Date;
  due_at: Date;
  returned_at: Date | null;
}

export class PostgresLoanRepository implements LoanRepository {
  constructor(private readonly pool: Pool) {}

  async save(loan: Loan): Promise<void> {
    await this.pool.query(
      `insert into lending.loans (id, book_id, borrower, borrowed_at, due_at, returned_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update
         set book_id = excluded.book_id,
             borrower = excluded.borrower,
             borrowed_at = excluded.borrowed_at,
             due_at = excluded.due_at,
             returned_at = excluded.returned_at`,
      [loan.id, loan.bookId, loan.borrower, loan.borrowedAt, loan.dueAt, loan.returnedAt],
    );
  }

  async findById(id: string): Promise<Loan | null> {
    const result = await this.pool.query<LoanRow>(
      `select id, book_id, borrower, borrowed_at, due_at, returned_at
         from lending.loans
        where id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return Object.freeze({
      id: row.id,
      bookId: row.book_id,
      borrower: row.borrower,
      borrowedAt: row.borrowed_at,
      dueAt: row.due_at,
      returnedAt: row.returned_at,
    });
  }
}

export async function migrateLoanRepository(pool: Pool): Promise<void> {
  await pool.query(`create schema if not exists lending`);
  await pool.query(
    `create table if not exists lending.loans (
       id text primary key,
       book_id text not null,
       borrower text not null,
       borrowed_at timestamptz not null,
       due_at timestamptz not null,
       returned_at timestamptz
     )`,
  );
}
