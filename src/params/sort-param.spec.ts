import { SortEnum } from '../enums/sort.enum';
import { sortParam } from './sort-param';

describe('sortParam', () => {
  const param = sortParam('sort', {
    default: [{ field: 'publishedAt', order: SortEnum.DESC }],
    fields: ['publishedAt', 'title'],
  });

  describe('parse', () => {
    it('should read a descending sort', () => {
      expect(param.parse(['-publishedAt'])).toEqual([
        { field: 'publishedAt', order: SortEnum.DESC },
      ]);
    });

    it('should read several sorts in order', () => {
      expect(param.parse(['title,-publishedAt'])).toEqual([
        { field: 'title', order: SortEnum.ASC },
        { field: 'publishedAt', order: SortEnum.DESC },
      ]);
    });

    it.each([
      [['views']],
      [['title,-title']],
      [['']],
      [['title,']],
      [['title', 'publishedAt']],
    ] as const)('should give up on %j', (values) => {
      expect(param.parse(values)).toBeUndefined();
    });
  });

  describe('serialize', () => {
    it('should write tokens joined by commas', () => {
      expect(
        param.serialize([
          { field: 'title', order: SortEnum.ASC },
          { field: 'publishedAt', order: SortEnum.DESC },
        ])
      ).toEqual(['title,-publishedAt']);
    });

    it('should leave out an empty list', () => {
      expect(param.serialize([])).toEqual([]);
    });

    it('should write a field it does not know by its name', () => {
      expect(param.serialize([{ field: 'views', order: SortEnum.ASC }])).toEqual(['views']);
    });
  });

  describe('with URL aliases', () => {
    const aliased = sortParam('sort', { fields: { newest: 'publishedAt', title: 'title' } });

    it('should read tokens into API fields', () => {
      expect(aliased.parse(['-newest,title'])).toEqual([
        { field: 'publishedAt', order: SortEnum.DESC },
        { field: 'title', order: SortEnum.ASC },
      ]);
    });

    it('should refuse an API field name used as a token', () => {
      expect(aliased.parse(['publishedAt'])).toBeUndefined();
    });

    it('should write API fields as tokens', () => {
      expect(aliased.serialize([{ field: 'publishedAt', order: SortEnum.DESC }])).toEqual([
        '-newest',
      ]);
    });

    it('should list each API field once', () => {
      expect(sortParam('sort', { fields: { a: 'title', b: 'title' } }).sortFields).toEqual([
        'title',
      ]);
    });
  });

  it('should list its API fields', () => {
    expect(param.sortFields).toEqual(['publishedAt', 'title']);
  });

  it('should default to no sort', () => {
    expect(sortParam('sort', { fields: ['title'] }).default).toEqual([]);
  });

  it('should round-trip', () => {
    const sorts = [
      { field: 'title', order: SortEnum.DESC },
      { field: 'publishedAt', order: SortEnum.ASC },
    ];

    expect(param.parse(param.serialize(sorts))).toEqual(sorts);
  });

  it('should type its fields', () => {
    expectTypeOf(param.sortFields).toEqualTypeOf<readonly ('publishedAt' | 'title')[]>();
  });
});
