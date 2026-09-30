/**
 * What `getPageRange()` reads from a page — a `PaginatedCollection` or its
 * `toPlain()` copy both fit.
 */
export type PageRangeInput = {
  /**
   * The page's rows.
   */
  readonly data: readonly unknown[];

  /**
   * The first row's position, when the backend reported it.
   */
  readonly from?: number | null;

  /**
   * The page number, from 1.
   */
  readonly page: number;

  /**
   * Rows per page, when the backend reported it.
   */
  readonly perPage?: number | null;

  /**
   * The last row's position, when the backend reported it.
   */
  readonly to?: number | null;

  /**
   * Rows in the whole list, when the backend counted them.
   */
  readonly total?: number | null;
};
