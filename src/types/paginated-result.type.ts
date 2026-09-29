import type { PaginatedObject } from './paginated-object.type';

/**
 * One page of rows as a plain, JSON-safe object — what
 * `PaginatedCollection.toPlain()` returns.
 *
 * Carries the same fields as `PaginatedCollection`, in a shape that can cross
 * a serialisation boundary such as a React Server Component handing props to
 * a Client Component:
 *
 * - it is an object literal, not a class instance;
 * - a field the backend did not report is `null` rather than `undefined`, so
 *   `JSON.stringify` keeps every key.
 *
 * Rows are passed through as the response held them.
 */
export type PaginatedResult<T extends PaginatedObject> = {
  /** The rows on this page */
  data: T[];
  /** URL of the first page, when the backend reports links */
  firstPageUrl: string | null;
  /** Position of the first row on this page within the whole result set, 1-based */
  from: number | null;
  /** Number of the last page */
  lastPage: number | null;
  /** URL of the last page, when the backend reports links */
  lastPageUrl: string | null;
  /** URL of the next page, when the backend reports links */
  nextPageUrl: string | null;
  /** The current page number, 1-based */
  page: number;
  /** Number of rows per page */
  perPage: number | null;
  /** URL of the previous page, when the backend reports links */
  prevPageUrl: string | null;
  /** Position of the last row on this page within the whole result set, 1-based */
  to: number | null;
  /** Number of rows in the whole result set */
  total: number | null;
};
