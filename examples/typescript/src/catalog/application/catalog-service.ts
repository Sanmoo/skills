import { registerBook, type Book, type BookId } from "../domain/book.js";

export interface BookRepository {
  save(book: Book): Promise<void>;
  findById(id: BookId): Promise<Book | undefined>;
}

export class CatalogService {
  constructor(private readonly books: BookRepository) {}

  /** Registers a Book, replacing the title of one already registered under the same id. */
  async register(id: string, title: string): Promise<Book> {
    const book = registerBook(id, title);
    await this.books.save(book);
    return book;
  }

  /** Finds a registered Book, or undefined when the Catalog does not hold it. */
  find(id: BookId): Promise<Book | undefined> {
    return this.books.findById(id);
  }
}
