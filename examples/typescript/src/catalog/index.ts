import type { Pool } from "pg";
import { CatalogService } from "./application/catalog-service.js";
import {
  migrateBookRepository,
  PostgresBookRepository,
} from "./adapters/postgres-book-repository.js";
import type { Book } from "./domain/book.js";

export type { Book } from "./domain/book.js";
export { createBook, InvalidBookError } from "./domain/book.js";
export type { AddBookInput } from "./application/catalog-service.js";

// The context's public interface: other contexts may import this file and
// nothing else from src/catalog/.
export interface Catalog {
  addBook(input: { title: string; author: string; copies: number }): Promise<Book>;
  findBook(id: string): Promise<Book | null>;
}

export function createCatalog(pool: Pool): Catalog {
  return new CatalogService(new PostgresBookRepository(pool));
}

export async function migrateCatalog(pool: Pool): Promise<void> {
  await migrateBookRepository(pool);
}
