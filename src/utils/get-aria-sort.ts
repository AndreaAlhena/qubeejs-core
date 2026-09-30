import type { AriaSort } from '../types/aria-sort.type';
import type { Sort } from '../types/sort.type';

import { SortEnum } from '../enums/sort.enum';

/**
 * The `aria-sort` value for a column header.
 *
 * Only the **primary** sort reports a direction — ARIA allows one sorted
 * column per table — so every other column, sorted or not, is `'none'`.
 *
 * @param sorts - The current sorts
 * @param field - The column's API field
 * @returns `'ascending'`, `'descending'` or `'none'`
 */
export function getAriaSort(sorts: readonly Sort[], field: string): AriaSort {
  const [primary] = sorts;

  if (primary?.field !== field) {
    return 'none';
  }

  return primary.order === SortEnum.DESC ? 'descending' : 'ascending';
}
