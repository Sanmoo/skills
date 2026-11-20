import { describe, expect, it } from "vitest";
import { useDatabase } from "../../../test/support/database.js";
import { createCatalog, InvalidBook } from "../index.js";

const pool = useDatabase();

describe("CatalogService", () => {
  it("registers a Book it can then find", async () => {
    const catalog = await createCatalog(pool);
    expect(await catalog.register(" dispossessed ", "The Dispossessed")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
    expect(await catalog.find("dispossessed")).toEqual({
      id: "dispossessed",
      title: "The Dispossessed",
    });
  });

  it("does not find a Book it never registered", async () => {
    const catalog = await createCatalog(pool);
    expect(await catalog.find("lathe")).toBeUndefined();
  });

  it("stores nothing for an invalid Book", async () => {
    const catalog = await createCatalog(pool);
    await expect(catalog.register("lathe", " ")).rejects.toBeInstanceOf(InvalidBook);
    expect(await catalog.find("lathe")).toBeUndefined();
  });
});
