import { ResponseOptions } from '../models/response-options';
import { PostgrestResponseStrategy } from './postgrest-response.strategy';

describe('PostgrestResponseStrategy', () => {
  let strategy: PostgrestResponseStrategy;
  let options: ResponseOptions;

  beforeEach(() => {
    strategy = new PostgrestResponseStrategy();
    options = new ResponseOptions({});
  });

  // Body shape — PostgREST returns a bare array
  describe('body shape', () => {
    it('should accept a bare array as the response body', () => {
      const collection = strategy.paginate([{ id: 1 }, { id: 2 }], options);

      expect(collection.data).toHaveLength(2);
    });

    it('should accept an envelope with the array at options.data', () => {
      const collection = strategy.paginate({ data: [{ id: 1 }] }, options);

      expect(collection.data).toHaveLength(1);
    });
  });

  // Content-Range header parsing — the bulk of the strategy's job
  describe('Content-Range parsing', () => {
    it('should derive from/to/total/perPage/page/lastPage from 0-9/50', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': '0-9/50' }
      );

      // 1-indexed conversion: from=1, to=10; perPage=10
      expect(collection.from).toBe(1);
      expect(collection.to).toBe(10);
      expect(collection.total).toBe(50);
      expect(collection.perPage).toBe(10);
      expect(collection.page).toBe(1);
      expect(collection.lastPage).toBe(5);
    });

    it('should derive page 3 from 20-29/50', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': '20-29/50' }
      );

      expect(collection.page).toBe(3);
      expect(collection.lastPage).toBe(5);
    });

    it('should leave total and lastPage undefined when total is "*"', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': '0-9/*' }
      );

      expect(collection.total).toBeUndefined();
      expect(collection.lastPage).toBeUndefined();
      expect(collection.perPage).toBe(10);
      expect(collection.page).toBe(1);
    });

    it('should tolerate a missing Content-Range header', () => {
      const collection = strategy.paginate([{ id: 1 }], options);

      expect(collection.from).toBeUndefined();
      expect(collection.to).toBeUndefined();
      expect(collection.total).toBeUndefined();
      expect(collection.perPage).toBeUndefined();
      expect(collection.lastPage).toBeUndefined();
      expect(collection.page).toBe(1);
    });

    it('should tolerate a malformed Content-Range header', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': 'garbage' }
      );

      expect(collection.from).toBeUndefined();
      expect(collection.total).toBeUndefined();
    });

    it('should accept HttpHeaders-like bags with a .get() method', () => {
      const headers = {
        get(name: string): string | null {
          return name === 'Content-Range' ? '0-4/25' : null;
        },
      };

      const collection = strategy.paginate([{ id: 1 }], options, headers);

      expect(collection.perPage).toBe(5);
      expect(collection.total).toBe(25);
      expect(collection.lastPage).toBe(5);
    });

    it('should convert PostgREST 0-indexed bounds to 1-indexed from/to', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': '10-19/100' }
      );

      // PostgREST: from=10, to=19 → library: from=11, to=20
      expect(collection.from).toBe(11);
      expect(collection.to).toBe(20);
      expect(collection.page).toBe(2);
      expect(collection.lastPage).toBe(10);
    });
  });

  // The page size is the requested limit: the span of a short last page is not (#45)
  describe('requested limit', () => {
    it('should place a partial last page by the limit, not by its span', () => {
      const collection = strategy.paginate(
        [{ id: 31 }, { id: 32 }, { id: 33 }, { id: 34 }],
        options,
        { 'Content-Range': '30-33/34' },
        10
      );

      expect(collection.page).toBe(4);
      expect(collection.perPage).toBe(10);
      expect(collection.lastPage).toBe(4);
      expect(collection.from).toBe(31);
      expect(collection.to).toBe(34);
    });

    it('should not count an extra page when the last page is short (20-33/34 at limit 20)', () => {
      const collection = strategy.paginate(
        [{ id: 21 }],
        options,
        { 'Content-Range': '20-33/34' },
        20
      );

      expect(collection.page).toBe(2);
      expect(collection.perPage).toBe(20);
      expect(collection.lastPage).toBe(2);
    });

    it('should place a short last page past page 2 (40-44/45 at limit 20)', () => {
      const collection = strategy.paginate(
        [{ id: 41 }],
        options,
        { 'Content-Range': '40-44/45' },
        20
      );

      expect(collection.page).toBe(3);
      expect(collection.lastPage).toBe(3);
    });

    it('should place a one-row last page', () => {
      const collection = strategy.paginate(
        [{ id: 31 }],
        options,
        { 'Content-Range': '30-30/31' },
        10
      );

      expect(collection.page).toBe(4);
      expect(collection.lastPage).toBe(4);
      expect(collection.from).toBe(31);
      expect(collection.to).toBe(31);
    });

    it('should count no extra page when the total is an exact multiple of the limit', () => {
      const first = strategy.paginate([{ id: 1 }], options, { 'Content-Range': '0-9/30' }, 10);
      const last = strategy.paginate([{ id: 21 }], options, { 'Content-Range': '20-29/30' }, 10);

      expect(first.page).toBe(1);
      expect(first.lastPage).toBe(3);
      expect(last.page).toBe(3);
      expect(last.lastPage).toBe(3);
    });

    it('should place a short page without a total, leaving the last page unknown', () => {
      const collection = strategy.paginate(
        [{ id: 31 }],
        options,
        { 'Content-Range': '30-33/*' },
        10
      );

      expect(collection.page).toBe(4);
      expect(collection.perPage).toBe(10);
      expect(collection.total).toBeUndefined();
      expect(collection.lastPage).toBeUndefined();
    });

    it('should fall back to the span when no limit is given', () => {
      const collection = strategy.paginate([{ id: 21 }], options, { 'Content-Range': '20-29/50' });

      expect(collection.perPage).toBe(10);
      expect(collection.page).toBe(3);
    });

    it('should fall back to the span when the limit is not a page size', () => {
      const collection = strategy.paginate(
        [{ id: 21 }],
        options,
        { 'Content-Range': '20-29/50' },
        0
      );

      expect(collection.perPage).toBe(10);
      expect(collection.page).toBe(3);
    });
  });

  // URL fields — PostgREST doesn't emit page URLs, these stay undefined
  describe('page URLs', () => {
    it('should leave prevPageUrl / nextPageUrl / firstPageUrl / lastPageUrl undefined', () => {
      const collection = strategy.paginate(
        [{ id: 1 }],
        options,

        { 'Content-Range': '0-9/50' }
      );

      expect(collection.prevPageUrl).toBeUndefined();
      expect(collection.nextPageUrl).toBeUndefined();
      expect(collection.firstPageUrl).toBeUndefined();
      expect(collection.lastPageUrl).toBeUndefined();
    });
  });
});
