import type { PageWindowItem } from '../types/page-window-item.type';
import type { PageWindowOptions } from '../types/page-window-options.type';

/**
 * The places a pagination bar shows: page numbers, with `'gap'` where a run
 * of pages is folded.
 *
 * The window keeps a **constant length** — `2 × boundaries + 2 × siblings + 3`,
 * or every page when there are no more than that — so the buttons do not
 * shift as the user pages. A gap never stands for a single page: that page's
 * number is shown instead.
 *
 * Never throws. A page outside `1`–`lastPage` is clamped; fractional input is
 * floored; a `lastPage` below 1, `NaN` or `Infinity` — a backend that reports
 * no count — is treated as 1.
 *
 * @param page - The current page, from 1
 * @param lastPage - The number of pages
 * @param options - Pages shown at each end and around the current one
 * @returns The numbers and gaps, in order
 * @example
 * getPageWindow(5, 12); // [1, 'gap', 4, 5, 6, 'gap', 12]
 * getPageWindow(1, 12); // [1, 2, 3, 4, 5, 'gap', 12]
 */
export function getPageWindow(
  page: number,
  lastPage: number,
  options: PageWindowOptions = {}
): readonly PageWindowItem[] {
  const { boundaries = 1, siblings = 1 } = options;
  const last = Number.isFinite(lastPage) ? Math.max(1, Math.floor(lastPage)) : 1;
  const current = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), last) : 1;

  if (last <= 2 * boundaries + 2 * siblings + 3) {
    return pagesBetween(1, last);
  }

  const siblingsStart = Math.max(
    Math.min(current - siblings, last - boundaries - 2 * siblings - 1),
    boundaries + 2
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundaries + 2 * siblings + 2),
    last - boundaries - 1
  );

  return [
    ...pagesBetween(1, boundaries),
    siblingsStart > boundaries + 2 ? 'gap' : boundaries + 1,
    ...pagesBetween(siblingsStart, siblingsEnd),
    siblingsEnd < last - boundaries - 1 ? 'gap' : last - boundaries,
    ...pagesBetween(last - boundaries + 1, last),
  ];
}

/**
 * The page numbers from `first` to `last`, both included; none when `last`
 * comes first.
 *
 * @param first - The first page
 * @param last - The last page
 * @returns The numbers, in order
 */
function pagesBetween(first: number, last: number): number[] {
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}
