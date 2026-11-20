import { describe, expect, it } from "vitest";
import { InvalidBook, registerBook } from "./book.js";

describe("registerBook", () => {
  it("registers a Book under its id and title", () => {
    expect(registerBook("dispossessed", "The Dispossessed")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
  });

  it("trims the id and the title", () => {
    expect(registerBook("  dispossessed ", " The Dispossessed  ")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
  });

  it("refuses a Book without an id", () => {
    expect(() => registerBook("   ", "The Dispossessed")).toThrow(
      new InvalidBook("a Book needs an id"),
    );
  });

  it("refuses a Book without a title", () => {
    expect(() => registerBook("dispossessed", "  ")).toThrow(
      new InvalidBook("a Book needs a title"),
    );
  });

  it("names its error", () => {
    expect(new InvalidBook("x").name).toBe("InvalidBook");
  });
});
