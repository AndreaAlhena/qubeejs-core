import { RansackResponseOptions } from '../models/response-options';
import { RansackResponseStrategy } from './ransack-response.strategy';

describe('RansackResponseStrategy', () => {
  let strategy: RansackResponseStrategy;
  let options: RansackResponseOptions;

  /** A bare-array body of `count` rows, ids starting at `first` */
  const rows = (count: number, first = 1): Record<string, unknown> =>
    Array.from({ length: count }, (_, i) => ({ id: first + i })) as unknown as Record<
      string,
      unknown
    >;

  const url = (page?: number): string =>
    page === undefined ? 'https://x.io/articles' : `https://x.io/articles?page=${page}`;

  beforeEach(() => {
    strategy = new RansackResponseStrategy();
    options = new RansackResponseOptions({});
  });

  it('should parse a bare-array body with no headers', () => {
    const collection = strategy.paginate(rows(2), options);

    expect(collection.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(collection.page).toBe(1);
    expect(collection.total).toBeUndefined();
    expect(collection.lastPage).toBeUndefined();
    expect(collection.from).toBeUndefined();
    expect(collection.to).toBeUndefined();
  });

  it('should read the array from an envelope at options.data', () => {
    const body = { data: [{ id: 1 }] };

    expect(strategy.paginate(body, options).data).toEqual([{ id: 1 }]);
  });

  describe('Pagy headers', () => {
    // Pagy 43 headers_hash for page 2 of 134 rows at 20 per page
    const headers = {
      'current-page': '2',
      link:
        `<${url()}>; rel="first", <${url(1)}>; rel="prev", ` +
        `<${url(3)}>; rel="next", <${url(7)}>; rel="last"`,
      'page-limit': '20',
      'total-count': '134',
      'total-pages': '7',
    };

    it('should read every field of a middle page', () => {
      const collection = strategy.paginate(rows(20, 21), options, headers);

      expect(collection.page).toBe(2);
      expect(collection.perPage).toBe(20);
      expect(collection.total).toBe(134);
      expect(collection.lastPage).toBe(7);
      expect(collection.from).toBe(21);
      expect(collection.to).toBe(40);
      expect(collection.firstPageUrl).toBe(url());
      expect(collection.prevPageUrl).toBe(url(1));
      expect(collection.nextPageUrl).toBe(url(3));
      expect(collection.lastPageUrl).toBe(url(7));
    });

    it('should stop to at the last row of a partial last page', () => {
      const last = {
        'current-page': '7',
        link: `<${url()}>; rel="first", <${url(6)}>; rel="prev", <${url(7)}>; rel="last"`,
        'page-limit': '20',
        'total-count': '134',
        'total-pages': '7',
      };

      const collection = strategy.paginate(rows(14, 121), options, last);

      expect(collection.from).toBe(121);
      expect(collection.to).toBe(134);
      expect(collection.nextPageUrl).toBeUndefined();
    });

    it('should read rel="previous", the spelling of Pagy before 43.7', () => {
      const old = { ...headers, link: `<${url(1)}>; rel="previous"` };

      expect(strategy.paginate(rows(20, 21), options, old).prevPageUrl).toBe(url(1));
    });

    it('should leave from and to undefined on an empty page past the end', () => {
      const beyond = {
        'current-page': '9',
        'page-limit': '20',
        'total-count': '134',
        'total-pages': '7',
      };

      const collection = strategy.paginate(rows(0), options, beyond);

      expect(collection.data).toEqual([]);
      expect(collection.from).toBeUndefined();
      expect(collection.to).toBeUndefined();
    });
  });

  describe('Kaminari + api-pagination headers', () => {
    it('should derive the page and the last page from the Link header', () => {
      const headers = {
        link:
          `<${url(1)}>; rel="first", <${url(1)}>; rel="prev", ` +
          `<${url(7)}>; rel="last", <${url(3)}>; rel="next"`,
        'per-page': '20',
        total: '134',
      };

      const collection = strategy.paginate(rows(20, 21), options, headers);

      expect(collection.page).toBe(2);
      expect(collection.perPage).toBe(20);
      expect(collection.total).toBe(134);
      expect(collection.lastPage).toBe(7);
      expect(collection.from).toBe(21);
      expect(collection.to).toBe(40);
      expect(collection.lastPageUrl).toBe(url(7));
    });

    it('should derive page 1 from the next link on the first page', () => {
      const headers = {
        link: `<${url(7)}>; rel="last", <${url(2)}>; rel="next"`,
        'per-page': '20',
        total: '134',
      };

      const collection = strategy.paginate(rows(20), options, headers);

      expect(collection.page).toBe(1);
      expect(collection.lastPage).toBe(7);
      expect(collection.from).toBe(1);
      expect(collection.to).toBe(20);
    });

    it('should compute the last page from the total on the last page, which has no last link', () => {
      const headers = {
        link: `<${url(1)}>; rel="first", <${url(6)}>; rel="prev"`,
        'per-page': '20',
        total: '134',
      };

      const collection = strategy.paginate(rows(14, 121), options, headers);

      expect(collection.page).toBe(7);
      expect(collection.lastPage).toBe(7);
      expect(collection.from).toBe(121);
      expect(collection.to).toBe(134);
    });

    it('should read the optional Page header when the server enables it', () => {
      const headers = { page: '3', 'per-page': '20', total: '134' };

      expect(strategy.paginate(rows(20, 41), options, headers).page).toBe(3);
    });

    it('should report one page for an empty collection', () => {
      const headers = { 'per-page': '20', total: '0' };

      const collection = strategy.paginate(rows(0), options, headers);

      expect(collection.total).toBe(0);
      expect(collection.lastPage).toBe(1);
    });
  });

  describe('header names', () => {
    it('should prefer a header named through PaginationConfig', () => {
      const custom = new RansackResponseOptions({ total: 'x-total' });
      const headers = { total: '99', 'total-count': '98', 'x-total': '50' };

      expect(strategy.paginate(rows(1), custom, headers).total).toBe(50);
    });

    it('should read headers case-insensitively from a Headers bag', () => {
      const headers = new Headers({ 'Per-Page': '20', Total: '134' });

      const collection = strategy.paginate(rows(20), options, headers);

      expect(collection.total).toBe(134);
      expect(collection.perPage).toBe(20);
    });

    it('should skip a header disabled with an empty name, which Headers.get() rejects', () => {
      const disabled = new RansackResponseOptions({ currentPage: '', total: '' });
      const headers = new Headers({ page: '3', total: '7' });

      const collection = strategy.paginate(rows(1), disabled, headers);

      expect(collection.total).toBe(7);
      expect(collection.page).toBe(3);
    });

    it('should ignore unparseable header values', () => {
      const headers = { 'page-limit': 'twenty', 'total-count': 'n/a', 'total-pages': '' };

      const collection = strategy.paginate(rows(1), options, headers);

      expect(collection.total).toBeUndefined();
      expect(collection.perPage).toBeUndefined();
      expect(collection.lastPage).toBeUndefined();
    });
  });

  it('should take the page size from a full page when no header names it', () => {
    const headers = { link: `<${url(2)}>; rel="next"`, total: '134' };

    const collection = strategy.paginate(rows(20), options, headers);

    expect(collection.perPage).toBe(20);
    expect(collection.lastPage).toBe(7);
  });
});
