import { parseLinkHeader } from './parse-link-header';

describe('parseLinkHeader', () => {
  it('should return no relations for a missing header', () => {
    expect(parseLinkHeader(null)).toEqual({});
    expect(parseLinkHeader(undefined)).toEqual({});
    expect(parseLinkHeader('')).toEqual({});
  });

  it('should read all four navigation relations', () => {
    const value =
      '<https://x.io/items>; rel="first", <https://x.io/items?page=1>; rel="prev", ' +
      '<https://x.io/items?page=3>; rel="next", <https://x.io/items?page=7>; rel="last"';

    expect(parseLinkHeader(value)).toEqual({
      first: 'https://x.io/items',
      last: 'https://x.io/items?page=7',
      next: 'https://x.io/items?page=3',
      prev: 'https://x.io/items?page=1',
    });
  });

  it('should read rel="previous" as prev', () => {
    expect(parseLinkHeader('<https://x.io/items?page=1>; rel="previous"')).toEqual({
      prev: 'https://x.io/items?page=1',
    });
  });

  it('should ignore relations it does not model', () => {
    const value =
      '<https://x.io/wp-json/wp/v2>; rel="collection", <https://x.io/a?page=2>; rel="next"';

    expect(parseLinkHeader(value)).toEqual({ next: 'https://x.io/a?page=2' });
  });

  it('should ignore relation names inherited from Object.prototype', () => {
    expect(parseLinkHeader('<https://x.io/a>; rel="constructor toString __proto__"')).toEqual({});
  });

  it('should read every relation of a space-separated rel list', () => {
    expect(parseLinkHeader('<https://x.io/a?page=2>; rel="next last"')).toEqual({
      last: 'https://x.io/a?page=2',
      next: 'https://x.io/a?page=2',
    });
  });

  it('should match relation names case-insensitively', () => {
    expect(parseLinkHeader('<https://x.io/a?page=2>; rel="Next"')).toEqual({
      next: 'https://x.io/a?page=2',
    });
  });

  it('should tolerate whitespace around the separators', () => {
    expect(parseLinkHeader('<https://x.io/a?page=2>  ;  rel="next"')).toEqual({
      next: 'https://x.io/a?page=2',
    });
  });
});
