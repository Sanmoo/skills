import { setWorldConstructor, World } from "@cucumber/cucumber";
import type { JsonBody } from "./http.js";

// One scenario's business state. Each scenario gets a new World, and the Before
// hook empties the database, so no scenario depends on another's data or order.
export class LibraryWorld extends World {
  baseUrl = "";
  bookTitle = "";
  bookId = "";
  loanId = "";
  lastStatus = 0;
  lastBody: JsonBody = null;
}

setWorldConstructor(LibraryWorld);
