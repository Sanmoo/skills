export type BookId = string;

export interface Book {
  readonly id: BookId;
  readonly title: string;
}

export class InvalidBook extends Error {
  override readonly name = "InvalidBook";
}

/** Registers a Book under the id the library gives it. */
export function registerBook(id: string, title: string): Book {
  const bookId = id.trim();
  const bookTitle = title.trim();
  if (bookId === "") throw new InvalidBook("a Book needs an id");
  if (bookTitle === "") throw new InvalidBook("a Book needs a title");
  return { id: bookId, title: bookTitle };
}
