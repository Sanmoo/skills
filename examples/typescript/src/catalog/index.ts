// The Catalog's public interface: other contexts and the delivery root import
// only this module.
import type pg from "pg";
import { PostgresBookRepository } from "./adapters/postgres-book-repository.js";
import { CatalogService } from "./application/catalog-service.js";

export type { Book, BookId } from "./domain/book.js";
export { InvalidBook } from "./domain/book.js";
export type { CatalogService } from "./application/catalog-service.js";

export async function createCatalog(pool: pg.Pool): Promise<CatalogService> {
  await PostgresBookRepository.migrate(pool);
  return new CatalogService(new PostgresBookRepository(pool));
}
