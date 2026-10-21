import { randomUUID } from "node:crypto";
import { createBook, type Book } from "../domain/book.js";

export interface BookRepository {
  save(book: Book): Promise<void>;
  findById(id: string): Promise<Book | null>;
}

export interface AddBookInput {
  readonly title: string;
  readonly author: string;
  readonly copies: number;
}

export class CatalogService {
  constructor(private readonly books: BookRepository) {}

  async addBook(input: AddBookInput): Promise<Book> {
    const book = createBook({
      id: randomUUID(),
      title: input.title,
      author: input.author,
      copies: input.copies,
    });
    await this.books.save(book);
    return book;
  }

  async findBook(id: string): Promise<Book | null> {
    return this.books.findById(id);
  }
}
