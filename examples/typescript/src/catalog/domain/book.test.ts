import { describe, expect, it } from "vitest";
import { createBook, InvalidBookError } from "./book.js";

const valid = { id: "book-1", title: "Piranesi", author: "Susanna Clarke", copies: 2 };

describe("createBook", () => {
  it("creates a frozen book with its trimmed title and author", () => {
    const book = createBook({ ...valid, title: "  Piranesi ", author: " Susanna Clarke " });

    expect(book).toEqual({ id: "book-1", title: "Piranesi", author: "Susanna Clarke", copies: 2 });
    expect(Object.isFrozen(book)).toBe(true);
  });

  it("accepts a single copy", () => {
    expect(createBook({ ...valid, copies: 1 }).copies).toBe(1);
  });

  it.each([
    ["an empty id", { ...valid, id: "" }, "book id must not be empty"],
    ["a blank id", { ...valid, id: "   " }, "book id must not be empty"],
    ["an empty title", { ...valid, title: "" }, "book title must not be empty"],
    ["a blank title", { ...valid, title: "  " }, "book title must not be empty"],
    ["an empty author", { ...valid, author: "" }, "book author must not be empty"],
    ["a blank author", { ...valid, author: " " }, "book author must not be empty"],
    ["zero copies", { ...valid, copies: 0 }, "book copies must be a positive integer"],
    ["negative copies", { ...valid, copies: -1 }, "book copies must be a positive integer"],
    ["fractional copies", { ...valid, copies: 1.5 }, "book copies must be a positive integer"],
  ])("rejects %s", (_label, draft, message) => {
    expect(() => createBook(draft)).toThrow(new InvalidBookError(message));
  });

  it("rejects a non-string title from an untyped caller", () => {
    const draft = { ...valid, title: 42 } as unknown as typeof valid;

    expect(() => createBook(draft)).toThrow(new InvalidBookError("book title must not be empty"));
  });
});
