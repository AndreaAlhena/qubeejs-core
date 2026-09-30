import type { Sort } from '../types/sort.type';
import type { ToggleSortOptions } from '../types/toggle-sort-options.type';

import { SortEnum } from '../enums/sort.enum';

/**
 * The sorts after a click on a column header.
 *
 * An unsorted field sorts ascending; a sorted one flips. The field becomes
 * the only sort, unless `multiple` keeps the others — the field then flips in
 * place, or is appended. The input is left untouched.
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
  const existing = sorts.find((sort) => sort.field === field);
  const toggled: Sort = {
    field,
    order: existing?.order === SortEnum.ASC ? SortEnum.DESC : SortEnum.ASC,
  };

  if (!options.multiple) {
    return [toggled];
  }

  return existing ? sorts.map((sort) => (sort === existing ? toggled : sort)) : [...sorts, toggled];
}
