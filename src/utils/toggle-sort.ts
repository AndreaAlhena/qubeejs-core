import type { Sort } from '../types/sort.type';
import type { ToggleSortOptions } from '../types/toggle-sort-options.type';

import { SortEnum } from '../enums/sort.enum';

/**
 * The sorts after a click on a column header.
 *
 * By default the field becomes the only sort. It flips only when it is the
 * primary sort — the first one, the one `getAriaSort()` announces — and starts
 * ascending otherwise, even if a secondary sort already names it. With
 * `multiple` the other sorts are kept: the field flips in place wherever it
 * is, or is appended ascending. The input is left untouched.
 *
 * @param sorts - The current sorts
 * @param field - The API field clicked
 * @param options - Whether to keep the other sorts
 * @returns The new sorts
 * @example
 * toggleSort([], 'title'); // [{ field: 'title', order: SortEnum.ASC }]
 */
export function toggleSort(
  sorts: readonly Sort[],
  field: string,
  options: ToggleSortOptions = {}
): readonly Sort[] {
  const flipped = (sort: Sort | undefined): Sort => ({
    field,
    order: sort?.order === SortEnum.ASC ? SortEnum.DESC : SortEnum.ASC,
  });

  if (!options.multiple) {
    return [flipped(sorts[0]?.field === field ? sorts[0] : undefined)];
  }

  const existing = sorts.find((sort) => sort.field === field);

  return existing
    ? sorts.map((sort) => (sort === existing ? flipped(existing) : sort))
    : [...sorts, flipped(undefined)];
}
