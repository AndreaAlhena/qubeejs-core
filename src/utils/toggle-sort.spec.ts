import { SortEnum } from '../enums/sort.enum';
import { toggleSort } from './toggle-sort';

const byTitle = { field: 'title', order: SortEnum.ASC };
const byDateDesc = { field: 'publishedAt', order: SortEnum.DESC };

describe('toggleSort', () => {
  it('should sort an unsorted field ascending', () => {
    expect(toggleSort([], 'title')).toEqual([{ field: 'title', order: SortEnum.ASC }]);
  });

  it('should flip a sorted field', () => {
    expect(toggleSort([byTitle], 'title')).toEqual([{ field: 'title', order: SortEnum.DESC }]);
    expect(toggleSort([byDateDesc], 'publishedAt')).toEqual([
      { field: 'publishedAt', order: SortEnum.ASC },
    ]);
  });

  it('should replace the other sorts by default', () => {
    expect(toggleSort([byTitle, byDateDesc], 'publishedAt')).toEqual([
      { field: 'publishedAt', order: SortEnum.ASC },
    ]);
  });

  it('should flip in place with multiple', () => {
    expect(toggleSort([byTitle, byDateDesc], 'publishedAt', { multiple: true })).toEqual([
      byTitle,
      { field: 'publishedAt', order: SortEnum.ASC },
    ]);
  });

  it('should append with multiple', () => {
    expect(toggleSort([byTitle], 'publishedAt', { multiple: true })).toEqual([
      byTitle,
      { field: 'publishedAt', order: SortEnum.ASC },
    ]);
  });

  it('should leave the input untouched', () => {
    const sorts = Object.freeze([byTitle]);

    expect(() => toggleSort(sorts, 'title', { multiple: true })).not.toThrow();
    expect(sorts).toEqual([byTitle]);
  });
});
