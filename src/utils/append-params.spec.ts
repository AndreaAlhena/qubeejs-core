import { ParamCollisionError } from '../errors/param-collision.error';
import { appendParams } from './append-params';

describe('appendParams', () => {
  describe('composition', () => {
    it('returns the URI unchanged when there are no params', () => {
      expect(appendParams('/jobs?page=1', {})).toBe('/jobs?page=1');
    });

    it('returns the URI unchanged for a state written before params existed', () => {
      expect(appendParams('/jobs?page=1', undefined)).toBe('/jobs?page=1');
    });

    it('starts the query string when the strategy emitted none', () => {
      // PostgREST in RANGE mode returns the bare path.
      expect(appendParams('/jobs', { status: ['failed'] })).toBe('/jobs?status=failed');
    });

    it('continues the query string the strategy emitted', () => {
      expect(appendParams('/jobs?page=1', { status: ['failed'] })).toBe(
        '/jobs?page=1&status=failed'
      );
    });

    it('emits keys in insertion order', () => {
      expect(appendParams('/jobs', { status: ['failed'], include: ['queue'] })).toBe(
        '/jobs?status=failed&include=queue'
      );
    });

    it('skips a key with no values', () => {
      expect(appendParams('/jobs?page=1', { empty: [], status: ['failed'] })).toBe(
        '/jobs?page=1&status=failed'
      );
    });

    it('keeps the key literal', () => {
      expect(appendParams('/jobs', { 'meta[tag]': ['news'] })).toBe('/jobs?meta[tag]=news');
    });
  });

  describe('values', () => {
    it('joins several values with a literal comma', () => {
      expect(appendParams('/jobs', { include: ['author', 'comments'] })).toBe(
        '/jobs?include=author,comments'
      );
    });

    it('encodes each value before joining, so a comma inside one survives', () => {
      expect(appendParams('/jobs', { ids: ['a,b', 'c'] })).toBe('/jobs?ids=a%2Cb,c');
    });

    it('percent-encodes URI-reserved characters', () => {
      expect(appendParams('/jobs', { q: ['%foo & bar#+'] })).toBe(
        '/jobs?q=%25foo%20%26%20bar%23%2B'
      );
    });

    it('stringifies numbers and booleans', () => {
      expect(appendParams('/jobs', { flags: [1, true, 2.5] })).toBe('/jobs?flags=1,true,2.5');
    });

    it('emits an empty string value as an empty value', () => {
      expect(appendParams('/jobs', { status: [''] })).toBe('/jobs?status=');
    });
  });

  describe('collisions', () => {
    it('refuses a key the strategy already emitted', () => {
      expect(() => appendParams('/jobs?limit=15&page=1', { page: ['2'] })).toThrowError(
        ParamCollisionError
      );
    });

    it('refuses a plain key the strategy emitted in bracket form', () => {
      // A bracket-parsing backend would let `page=2` overwrite `page[number]`.
      expect(() =>
        appendParams('/jobs?page[number]=1&page[size]=15', { page: ['2'] })
      ).toThrowError(ParamCollisionError);
    });

    it('refuses a bracketed key nested under one the strategy emitted', () => {
      expect(() =>
        appendParams('/jobs?filter[status]=x', { 'filter[status][op]': ['eq'] })
      ).toThrowError(ParamCollisionError);
    });

    it('allows a sibling bracketed key', () => {
      expect(appendParams('/jobs?page[number]=1&page[size]=15', { 'page[cursor]': ['abc'] })).toBe(
        '/jobs?page[number]=1&page[size]=15&page[cursor]=abc'
      );
    });

    it('allows a key that only shares a prefix with an emitted one', () => {
      expect(appendParams('/jobs?pageSize=15', { page: ['2'] })).toBe('/jobs?pageSize=15&page=2');
    });

    it('reads keys from segments whose values contain "="', () => {
      // PocketBase and Sieve emit expressions such as `filter=(status='x')`.
      expect(() => appendParams("/jobs?filter=(status='x')", { filter: ['y'] })).toThrowError(
        ParamCollisionError
      );
    });

    it("reserves the keys of the next page's URI", () => {
      // PostgREST leaves `offset` out of page 1 and emits it from page 2 on.
      expect(() =>
        appendParams(
          '/jobs?limit=15',
          { offset: ['5'] },
          'postgrest',
          () => '/jobs?limit=15&offset=15'
        )
      ).toThrowError(expect.objectContaining({ driverKey: 'offset', key: 'offset' }));
    });

    it('builds the next page only when there are params to check', () => {
      const nextPageUri = vi.fn(() => '/jobs?limit=15&offset=15');

      appendParams('/jobs?limit=15', {}, 'postgrest', nextPageUri);
      appendParams('/jobs?limit=15', { empty: [] }, 'postgrest', nextPageUri);

      expect(nextPageUri).not.toHaveBeenCalled();
    });

    it('ignores a key with no values', () => {
      expect(appendParams('/jobs?page=1', { page: [] })).toBe('/jobs?page=1');
    });

    it('names both keys and the driver on the error', () => {
      expect(() => appendParams('/jobs?page[number]=1', { page: ['2'] }, 'json-api')).toThrowError(
        expect.objectContaining({ driver: 'json-api', driverKey: 'page[number]', key: 'page' })
      );
    });
  });
});
