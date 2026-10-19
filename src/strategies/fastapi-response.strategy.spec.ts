import { FastapiResponseOptions } from '../models/response-options';
import { FastapiResponseStrategy } from './fastapi-response.strategy';

describe('FastapiResponseStrategy', () => {
  let strategy: FastapiResponseStrategy;
  let options: FastapiResponseOptions;

  const rows = (count: number, start = 1): { id: number }[] =>
    Array.from({ length: count }, (_, index) => ({ id: start + index }));

  beforeEach(() => {
    strategy = new FastapiResponseStrategy();
    options = new FastapiResponseOptions({});
  });

  it('should read the body of a fastapi-pagination Page', () => {
    const response = { items: rows(10, 11), page: 2, pages: 10, size: 10, total: 95 };

    const collection = strategy.paginate(response, options);

    expect(collection.data).toEqual(rows(10, 11));
    expect(collection.page).toBe(2);
    expect(collection.perPage).toBe(10);
    expect(collection.total).toBe(95);
    expect(collection.lastPage).toBe(10);
    expect(collection.from).toBe(11);
    expect(collection.to).toBe(20);
    expect(collection.firstPageUrl).toBeUndefined();
    expect(collection.prevPageUrl).toBeUndefined();
    expect(collection.nextPageUrl).toBeUndefined();
    expect(collection.lastPageUrl).toBeUndefined();
  });

  it('should stop to at the total on the last page', () => {
    const response = { items: rows(5, 91), page: 10, pages: 10, size: 10, total: 95 };

    const collection = strategy.paginate(response, options);

    expect(collection.from).toBe(91);
    expect(collection.to).toBe(95);
  });

  it('should read an empty result as one page with no rows', () => {
    const response = { items: [], page: 1, pages: 0, size: 50, total: 0 };

    const collection = strategy.paginate(response, options);

    expect(collection.data).toEqual([]);
    expect(collection.total).toBe(0);
    expect(collection.lastPage).toBe(1);
    expect(collection.from).toBeUndefined();
    expect(collection.to).toBeUndefined();
  });

  it('should leave from and to unset on a page past the end', () => {
    const response = { items: [], page: 5, pages: 3, size: 10, total: 30 };

    const collection = strategy.paginate(response, options);

    expect(collection.page).toBe(5);
    expect(collection.lastPage).toBe(3);
    expect(collection.from).toBeUndefined();
    expect(collection.to).toBeUndefined();
  });

  it('should read the links of a fastapi_pagination.links Page', () => {
    const response = {
      items: rows(10, 11),
      links: {
        first: '/articles?page=1&size=10',
        last: '/articles?page=10&size=10',
        next: '/articles?page=3&size=10',
        prev: '/articles?page=1&size=10',
        self: '/articles?page=2&size=10',
      },
      page: 2,
      pages: 10,
      size: 10,
      total: 95,
    };

    const collection = strategy.paginate(response, options);

    expect(collection.firstPageUrl).toBe('/articles?page=1&size=10');
    expect(collection.prevPageUrl).toBe('/articles?page=1&size=10');
    expect(collection.nextPageUrl).toBe('/articles?page=3&size=10');
    expect(collection.lastPageUrl).toBe('/articles?page=10&size=10');
  });

  it('should read a null link as no link', () => {
    const response = {
      items: rows(10),
      links: {
        first: '/articles?page=1&size=10',
        last: '/articles?page=10&size=10',
        next: '/articles?page=2&size=10',
        prev: null,
        self: '/articles?page=1&size=10',
      },
      page: 1,
      pages: 10,
      size: 10,
      total: 95,
    };

    const collection = strategy.paginate(response, options);

    expect(collection.prevPageUrl).toBeUndefined();
    expect(collection.nextPageUrl).toBe('/articles?page=2&size=10');
  });

  it('should read the null total and pages of UseIncludeTotal(False) as unknown', () => {
    const response = { items: rows(10, 11), page: 2, pages: null, size: 10, total: null };

    const collection = strategy.paginate(response, options);

    expect(collection.total).toBeUndefined();
    expect(collection.lastPage).toBeUndefined();
    expect(collection.page).toBe(2);
    expect(collection.from).toBe(11);
    expect(collection.to).toBe(20);
  });

  it('should drop the last link fastapi-pagination points at page 1 when it has no total', () => {
    const response = {
      items: rows(10, 41),
      links: {
        first: '/articles?page=1&size=10',
        last: '/articles?page=1&size=10',
        next: null,
        prev: '/articles?page=4&size=10',
        self: '/articles?page=5&size=10',
      },
      page: 5,
      pages: null,
      size: 10,
      total: null,
    };

    const collection = strategy.paginate(response, options);

    expect(collection.lastPageUrl).toBeUndefined();
    expect(collection.firstPageUrl).toBe('/articles?page=1&size=10');
    expect(collection.prevPageUrl).toBe('/articles?page=4&size=10');
  });

  it('should count to from the rows when the total is short of a full page', () => {
    const response = { items: rows(3, 21), page: 3, pages: null, size: 10, total: null };

    const collection = strategy.paginate(response, options);

    expect(collection.from).toBe(21);
    expect(collection.to).toBe(23);
  });

  it('should follow keys renamed through PaginationConfig', () => {
    const renamed = new FastapiResponseOptions({ data: 'content', total: 'totalElements' });
    const response = { content: rows(2), page: 1, pages: 1, size: 10, totalElements: 2 };

    const collection = strategy.paginate(response, renamed);

    expect(collection.data).toEqual(rows(2));
    expect(collection.total).toBe(2);
  });
});
