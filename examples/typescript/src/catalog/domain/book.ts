// Catalog domain: the books the library holds. No framework, storage, or
// node built-in imports belong here.
export type Book = Readonly<{
  id: string;
  title: string;
  author: string;
  copies: number;
}>;

export interface BookDraft {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly copies: number;
}

export class InvalidBookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBookError";
  }
}

export function createBook(draft: BookDraft): Book {
  if (typeof draft.id !== "string" || draft.id.trim() === "") {
    throw new InvalidBookError("book id must not be empty");
  }
  if (typeof draft.title !== "string" || draft.title.trim() === "") {
    throw new InvalidBookError("book title must not be empty");
  }
  if (typeof draft.author !== "string" || draft.author.trim() === "") {
    throw new InvalidBookError("book author must not be empty");
  }
  if (!Number.isInteger(draft.copies) || draft.copies < 1) {
    throw new InvalidBookError("book copies must be a positive integer");
  }
  return Object.freeze({
    id: draft.id,
    title: draft.title.trim(),
    author: draft.author.trim(),
    copies: draft.copies,
  });
}
