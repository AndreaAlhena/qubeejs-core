import { getPageWindow } from './get-page-window';

describe('getPageWindow', () => {
  it.each([
    [5, 12, [1, 'gap', 4, 5, 6, 'gap', 12]],
    [1, 12, [1, 2, 3, 4, 5, 'gap', 12]],
    [12, 12, [1, 'gap', 8, 9, 10, 11, 12]],
    [4, 12, [1, 2, 3, 4, 5, 'gap', 12]],
    [9, 12, [1, 'gap', 8, 9, 10, 11, 12]],
  ] as const)('should fold page %d of %d into %j', (page, lastPage, expected) => {
    expect(getPageWindow(page, lastPage)).toEqual(expected);
  });

  it.each([
    [1, 0, [1]],
    [1, 1, [1]],
    [3, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 8, [1, 2, 3, 4, 5, 'gap', 8]],
    [8, 8, [1, 'gap', 4, 5, 6, 7, 8]],
  ] as const)('should handle page %d of %d as %j', (page, lastPage, expected) => {
    expect(getPageWindow(page, lastPage)).toEqual(expected);
  });

  it.each([
    [10, 20, { boundaries: 0 }, ['gap', 9, 10, 11, 'gap']],
    [1, 20, { boundaries: 0 }, [1, 2, 3, 4, 'gap']],
    [10, 20, { siblings: 0 }, [1, 'gap', 10, 'gap', 20]],
    [10, 20, { boundaries: 2, siblings: 2 }, [1, 2, 'gap', 8, 9, 10, 11, 12, 'gap', 19, 20]],
    [1, 20, { boundaries: 2, siblings: 2 }, [1, 2, 3, 4, 5, 6, 7, 8, 'gap', 19, 20]],
  ] as const)('should fold page %d of %d with %j into %j', (page, lastPage, options, expected) => {
    expect(getPageWindow(page, lastPage, options)).toEqual(expected);
  });

  it('should keep a constant length', () => {
    const lengths = Array.from({ length: 30 }, (_, index) => getPageWindow(index + 1, 30).length);

    expect(new Set(lengths)).toEqual(new Set([7]));
  });

  it('should never let a gap stand for a single page', () => {
    for (let page = 1; page <= 30; page += 1) {
      const items = getPageWindow(page, 30);

      items.forEach((item, index) => {
        if (item !== 'gap') {
          return;
        }

        const before = items[index - 1];
        const after = items[index + 1];

        expect(typeof before === 'number' && typeof after === 'number' && after - before > 2).toBe(
          true
        );
      });
    }
  });

  it.each([
    [0, 12, [1, 2, 3, 4, 5, 'gap', 12]],
    [99, 12, [1, 'gap', 8, 9, 10, 11, 12]],
    [Number.NaN, 12, [1, 2, 3, 4, 5, 'gap', 12]],
    [5, Number.NaN, [1]],
    [5, Number.POSITIVE_INFINITY, [1]],
    [2.7, 12.9, [1, 2, 3, 4, 5, 'gap', 12]],
  ] as const)('should clamp and never throw on %j', (page, lastPage, expected) => {
    expect(getPageWindow(page, lastPage)).toEqual(expected);
  });
});
