import type { PageRangeInput } from '../types/page-range-input.type';
import type { PageRange } from '../types/page-range.type';

/**
 * The numbers behind "21–34 of 34". The wording stays with the app.
 *
 * Uses the backend's own `from` and `to` when the driver reports them, and
 * otherwise computes them from the page, the page size (or the row count,
 * when the size is unknown) and the rows. An empty page, or a total of 0, is
 * `{ from: 0, to: 0, total }`.
 *
 * @param result - A page: a `PaginatedCollection` or its `toPlain()` copy
 * @returns The first and last row's positions and the list's size
 * @example
 * const { from, to, total } = getPageRange(page);
 * `${from}–${to} of ${total}`; // '21–34 of 34'
 */
export function getPageRange(result: PageRangeInput): PageRange {
  const total = result.total ?? null;

  if (!result.data.length || total === 0) {
    return { from: 0, to: 0, total };
  }

  const from = result.from ?? (result.page - 1) * (result.perPage ?? result.data.length) + 1;
  const to = result.to ?? from + result.data.length - 1;

  return { from, to, total };
}
