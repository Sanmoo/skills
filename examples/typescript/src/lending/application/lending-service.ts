import type { CatalogService } from "../../catalog/index.js";
import { isOverdue, recordReturn, takeOnLoan, type Loan, type LoanId } from "../domain/loan.js";

export interface LoanRepository {
  save(loan: Loan): Promise<void>;
  findById(id: LoanId): Promise<Loan | undefined>;
}

/** What Lending needs from the Catalog: whether it holds a Book. */
export type BookLookup = Pick<CatalogService, "find">;

export interface LendingDependencies {
  readonly books: BookLookup;
  readonly loans: LoanRepository;
  readonly today: () => Date;
  readonly newLoanId: () => LoanId;
}

export interface LoanView extends Loan {
  readonly overdue: boolean;
}

export class BookNotFound extends Error {
  override readonly name = "BookNotFound";
}

export class LoanNotFound extends Error {
  override readonly name = "LoanNotFound";
}

export class LendingService {
  constructor(private readonly deps: LendingDependencies) {}

  /** Lends a Book the Catalog holds to a Borrower. */
  async lend(bookId: string, borrower: string): Promise<LoanView> {
    const book = await this.deps.books.find(bookId);
    if (book === undefined) throw new BookNotFound(`Book ${bookId} is not in the Catalog`);
    const loan = takeOnLoan(this.deps.newLoanId(), book.id, borrower, this.deps.today());
    await this.deps.loans.save(loan);
    return this.view(loan);
  }

  /** Consults a Loan, including whether it is Overdue today. */
  async consult(id: LoanId): Promise<LoanView> {
    return this.view(await this.load(id));
  }

  /** Records the Return of a Loan. */
  async recordReturn(id: LoanId): Promise<LoanView> {
    const returned = recordReturn(await this.load(id), this.deps.today());
    await this.deps.loans.save(returned);
    return this.view(returned);
  }

  private async load(id: LoanId): Promise<Loan> {
    const loan = await this.deps.loans.findById(id);
    if (loan === undefined) throw new LoanNotFound(`Loan ${id} does not exist`);
    return loan;
  }

  private view(loan: Loan): LoanView {
    return { ...loan, overdue: isOverdue(loan, this.deps.today()) };
  }
}
