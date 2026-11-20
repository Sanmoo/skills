import type pg from "pg";
import type { Book, BookId } from "../domain/book.js";
import type { BookRepository } from "../application/catalog-service.js";

interface BookRow {
  id: string;
  title: string;
}

/** Stores the Catalog in the `catalog` schema, which this context owns. */
export class PostgresBookRepository implements BookRepository {
  constructor(private readonly pool: pg.Pool) {}

  static async migrate(pool: pg.Pool): Promise<void> {
    await pool.query("CREATE SCHEMA IF NOT EXISTS catalog");
    await pool.query(
      "CREATE TABLE IF NOT EXISTS catalog.books (id text PRIMARY KEY, title text NOT NULL)",
    );
  }

  async save(book: Book): Promise<void> {
    await this.pool.query(
      "INSERT INTO catalog.books (id, title) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title",
      [book.id, book.title],
    );
  }

  async findById(id: BookId): Promise<Book | undefined> {
    const result = await this.pool.query<BookRow>(
      "SELECT id, title FROM catalog.books WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : { id: row.id, title: row.title };
  }
}
