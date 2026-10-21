import { Pool } from "pg";
import type { Book } from "../domain/book.js";
import type { BookRepository } from "../application/catalog-service.js";

interface BookRow {
  id: string;
  title: string;
  author: string;
  copies: number;
}

export class PostgresBookRepository implements BookRepository {
  constructor(private readonly pool: Pool) {}

  async save(book: Book): Promise<void> {
    await this.pool.query(
      `insert into catalog.books (id, title, author, copies)
       values ($1, $2, $3, $4)
       on conflict (id) do update
         set title = excluded.title, author = excluded.author, copies = excluded.copies`,
      [book.id, book.title, book.author, book.copies],
    );
  }

  async findById(id: string): Promise<Book | null> {
    const result = await this.pool.query<BookRow>(
      `select id, title, author, copies from catalog.books where id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return Object.freeze({
      id: row.id,
      title: row.title,
      author: row.author,
      copies: row.copies,
    });
  }
}

export async function migrateBookRepository(pool: Pool): Promise<void> {
  await pool.query(`create schema if not exists catalog`);
  await pool.query(
    `create table if not exists catalog.books (
       id text primary key,
       title text not null,
       author text not null,
       copies integer not null
     )`,
  );
}
