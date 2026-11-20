import { World, setWorldConstructor } from "@cucumber/cucumber";

export interface Answer {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

/** One scenario's state. Book ids are unique per scenario so scenarios never share rows. */
export class LibraryWorld extends World {
  static baseUrl = "";
  readonly run = Math.random().toString(36).slice(2, 10);
  loanId: string | undefined;
  lastAnswer: Answer | undefined;

  bookId(title: string): string {
    return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${this.run}`;
  }

  async send(method: string, path: string, body?: unknown): Promise<Answer> {
    const init: RequestInit =
      body === undefined ? { method } : { method, body: JSON.stringify(body) };
    const response = await fetch(`${LibraryWorld.baseUrl}${path}`, init);
    this.lastAnswer = {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
    return this.lastAnswer;
  }
}

setWorldConstructor(LibraryWorld);
