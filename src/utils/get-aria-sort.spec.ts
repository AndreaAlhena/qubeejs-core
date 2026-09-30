import { SortEnum } from '../enums/sort.enum';
import { getAriaSort } from './get-aria-sort';

const sorts = [
  { field: 'title', order: SortEnum.DESC },
  { field: 'publishedAt', order: SortEnum.ASC },
];

describe('getAriaSort', () => {
  it('should report the primary sort direction', () => {
    expect(getAriaSort(sorts, 'title')).toBe('descending');
    expect(getAriaSort([{ field: 'title', order: SortEnum.ASC }], 'title')).toBe('ascending');
  });

  it('should report none for a secondary sort', () => {
    expect(getAriaSort(sorts, 'publishedAt')).toBe('none');
  });

  it('should report none for an unsorted field', () => {
    expect(getAriaSort(sorts, 'views')).toBe('none');
    expect(getAriaSort([], 'title')).toBe('none');
  });
});
