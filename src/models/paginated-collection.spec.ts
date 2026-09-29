import type { PaginatedResult } from '../types/paginated-result.type';

import { KeyNotFoundError } from '../errors/key-not-found.error';
import { PaginatedCollection } from './paginated-collection';

type Row = { id: number; slug: string; title: string };

const rows: Row[] = [
  { id: 7, slug: 'first', title: 'First' },
  { id: 9, slug: 'second', title: 'Second' },
];

const collect = (data: Row[] = rows): PaginatedCollection<Row> =>
  new PaginatedCollection<Row>(data, 2, 1, 2, 2, 15);

describe('PaginatedCollection', () => {
  describe('construction', () => {
    it('exposes the rows and page', () => {
      const collection = collect();

      expect(collection.data).toBe(rows);
      expect(collection.page).toBe(2);
    });

    it('leaves optional metadata undefined when not supplied', () => {
      const collection = new PaginatedCollection<Row>(rows, 1);

      expect(collection.total).toBeUndefined();
      expect(collection.nextPageUrl).toBeUndefined();
    });
  });

  describe('normalize', () => {
    it('keys the result by page number', () => {
      expect(collect().normalize()).toEqual({ 2: [7, 9] });
    });

    it('defaults to the id property', () => {
      expect(collect().normalize()).toEqual({ 2: [7, 9] });
    });

    it('accepts an explicit key', () => {
      // The `id` parameter was never exercised by any upstream test.
      expect(collect().normalize('slug')).toEqual({ 2: ['first', 'second'] });
    });

    it('accepts a selector function', () => {
      expect(collect().normalize((row) => row.title)).toEqual({ 2: ['First', 'Second'] });
    });

    it('falls back to id when the named key is absent from an item', () => {
      expect(collect().normalize('missing')).toEqual({ 2: [7, 9] });
    });

    it('throws when neither the named key nor id exists', () => {
      const orphan = new PaginatedCollection([{ name: 'no identifier' }], 1);

      expect(() => orphan.normalize()).toThrow(KeyNotFoundError);
    });

    it('reports the requested key in the error', () => {
      const orphan = new PaginatedCollection([{ name: 'no identifier' }], 1);

      expect(() => orphan.normalize('slug')).toThrow(new KeyNotFoundError('slug').message);
    });

    it('returns an empty list for an empty page', () => {
      expect(collect([]).normalize()).toEqual({ 2: [] });
    });

    it('supports string identifiers', () => {
      const uuids = new PaginatedCollection([{ id: 'a1' }, { id: 'b2' }], 1);

      expect(uuids.normalize()).toEqual({ 1: ['a1', 'b2'] });
    });
  });

  describe('toPlain', () => {
    const full = (): PaginatedCollection<Row> =>
      new PaginatedCollection<Row>(
        rows,
        2,
        16,
        30,
        57,
        15,
        '/articles?page=1',
        '/articles?page=3',
        4,
        '/articles?page=1',
        '/articles?page=4'
      );

    it('returns a plain object rather than a class instance', () => {
      // React Server Components refuse to pass class instances to Client
      // Components (#22).
      expect(Object.getPrototypeOf(full().toPlain())).toBe(Object.prototype);
    });

    it('carries the rows and every pagination field', () => {
      expect(full().toPlain()).toStrictEqual({
        data: rows,
        firstPageUrl: '/articles?page=1',
        from: 16,
        lastPage: 4,
        lastPageUrl: '/articles?page=4',
        nextPageUrl: '/articles?page=3',
        page: 2,
        perPage: 15,
        prevPageUrl: '/articles?page=1',
        to: 30,
        total: 57,
      });
    });

    it('keeps a key for every field the collection has', () => {
      // Guards against a field added to the class but not to toPlain().
      const collection = full();

      expect(Object.keys(collection.toPlain()).sort()).toEqual(Object.keys(collection).sort());
    });

    it('reports a field the backend did not send as null', () => {
      expect(new PaginatedCollection<Row>(rows, 1).toPlain()).toStrictEqual({
        data: rows,
        firstPageUrl: null,
        from: null,
        lastPage: null,
        lastPageUrl: null,
        nextPageUrl: null,
        page: 1,
        perPage: null,
        prevPageUrl: null,
        to: null,
        total: null,
      });
    });

    it('survives a JSON round trip with every key intact', () => {
      const sparse = new PaginatedCollection<Row>(rows, 1).toPlain();

      expect(JSON.parse(JSON.stringify(sparse))).toStrictEqual(sparse);
      expect(JSON.parse(JSON.stringify(full().toPlain()))).toStrictEqual(full().toPlain());
    });

    it('copies the rows array rather than sharing it', () => {
      const collection = collect();
      const plain = collection.toPlain();

      plain.data.push({ id: 11, slug: 'third', title: 'Third' });

      expect(collection.data).toHaveLength(2);
      expect(plain.data[0]).toBe(collection.data[0]);
    });

    it('leaves the collection unchanged', () => {
      const collection = collect();

      collection.toPlain();

      expect(collection).toBeInstanceOf(PaginatedCollection);
      expect(collection.data).toBe(rows);
      expect(collection.nextPageUrl).toBeUndefined();
    });

    it('is typed as a PaginatedResult of the row type', () => {
      expectTypeOf(collect().toPlain()).toEqualTypeOf<PaginatedResult<Row>>();
    });
  });
});
