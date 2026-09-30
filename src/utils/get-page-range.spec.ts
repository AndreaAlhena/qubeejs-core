import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { createQubee } from '../services/create-qubee';
import { getPageRange } from './get-page-range';

const rows = (count: number): { id: number }[] =>
  Array.from({ length: count }, (_, index) => ({ id: index }));

describe('getPageRange', () => {
  it('should compute the range of a last, partial page', () => {
    expect(getPageRange({ data: rows(14), page: 2, perPage: 20, total: 34 })).toEqual({
      from: 21,
      to: 34,
      total: 34,
    });
  });

  it('should prefer the range the backend reported', () => {
    expect(
      getPageRange({ data: rows(2), from: 41, page: 3, perPage: 20, to: 42, total: 82 })
    ).toEqual({ from: 41, to: 42, total: 82 });
  });

  it('should use the row count when the page size is unknown', () => {
    expect(getPageRange({ data: rows(10), page: 3 })).toEqual({ from: 21, to: 30, total: null });
  });

  it('should report an empty page as zeros', () => {
    expect(getPageRange({ data: [], page: 1, total: 0 })).toEqual({ from: 0, to: 0, total: 0 });
  });

  it('should report a total of zero as zeros, whatever the rows', () => {
    expect(getPageRange({ data: rows(3), page: 1, total: 0 })).toEqual({
      from: 0,
      to: 0,
      total: 0,
    });
  });

  it('should accept a PaginatedCollection and its plain copy', () => {
    const { paginator } = createQubee({ driver: STRAPI_DRIVER });
    const page = paginator.paginate({
      data: rows(20),
      meta: { pagination: { page: 2, pageCount: 2, pageSize: 20, total: 40 } },
    });

    expect(getPageRange(page)).toEqual(getPageRange(page.toPlain()));
    expect(getPageRange(page).total).toBe(40);
  });
});
