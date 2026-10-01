import { toSearchParams } from './to-search-params';

describe('toSearchParams', () => {
  it('should read a query string with its leading ?', () => {
    expect(toSearchParams('?q=react&page=2').toString()).toBe('q=react&page=2');
  });

  it('should read a query string without its leading ?', () => {
    expect(toSearchParams('q=react').get('q')).toBe('react');
  });

  it('should copy a URLSearchParams rather than return it', () => {
    const source = new URLSearchParams('q=react');

    const copy = toSearchParams(source);
    copy.set('q', 'vue');

    expect(copy).not.toBe(source);
    expect(source.get('q')).toBe('react');
  });

  it('should copy a subclass such as Next ReadonlyURLSearchParams', () => {
    class ReadonlyURLSearchParams extends URLSearchParams {}

    expect(toSearchParams(new ReadonlyURLSearchParams('q=react')).get('q')).toBe('react');
  });

  it('should copy a URLSearchParams built in another realm', () => {
    // Stands in for jsdom's URLSearchParams: not an instance of this realm's
    // class, but iterable and carrying getAll().
    const foreign = {
      getAll: (): string[] => [],
      *[Symbol.iterator](): Generator<[string, string]> {
        yield ['q', 'react'];
        yield ['tag', 'a'];
        yield ['tag', 'b'];
      },
    } as unknown as URLSearchParams;

    const params = toSearchParams(foreign);

    expect(params.get('q')).toBe('react');
    expect(params.getAll('tag')).toEqual(['a', 'b']);
  });

  it('should turn record arrays into repeated keys and skip undefined', () => {
    const params = toSearchParams({ missing: undefined, q: 'react', tag: ['a', 'b'] });

    expect(params.toString()).toBe('q=react&tag=a&tag=b');
  });

  it('should read the same pairs from every shape', () => {
    const shapes = [
      '?q=rock+%26+roll&tag=a&tag=b',
      'q=rock+%26+roll&tag=a&tag=b',
      new URLSearchParams('q=rock+%26+roll&tag=a&tag=b'),
      { q: 'rock & roll', tag: ['a', 'b'] },
    ];

    const results = shapes.map((shape) => toSearchParams(shape).toString());

    expect(new Set(results).size).toBe(1);
  });
});
