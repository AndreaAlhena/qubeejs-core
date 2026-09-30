import { ArticleStatusEnum } from '../../test/fixtures/article-status.enum';
import { enumParam } from './enum-param';

describe('enumParam', () => {
  describe('with a string enum', () => {
    const param = enumParam('status', ArticleStatusEnum);

    it('should read a member', () => {
      expect(param.parse(['published'])).toBe(ArticleStatusEnum.PUBLISHED);
    });

    it.each([[['archived']], [['PUBLISHED']], [['draft', 'published']]] as const)(
      'should give up on %j',
      (values) => {
        expect(param.parse(values)).toBeUndefined();
      }
    );

    it('should write the member', () => {
      expect(param.serialize(ArticleStatusEnum.DRAFT)).toEqual(['draft']);
    });

    it('should leave out undefined', () => {
      expect(param.serialize(undefined)).toEqual([]);
    });
  });

  describe('with a tuple', () => {
    const param = enumParam('view', ['grid', 'table'], { default: 'grid' });

    it('should read a member', () => {
      expect(param.parse(['table'])).toBe('table');
    });

    it('should carry its default', () => {
      expect(param.default).toBe('grid');
    });

    it('should round-trip', () => {
      expect(param.parse(param.serialize('table'))).toBe('table');
    });
  });

  it('should type its value by its values and default', () => {
    expectTypeOf(enumParam('status', ArticleStatusEnum).default).toEqualTypeOf<
      ArticleStatusEnum | undefined
    >();
    expectTypeOf(enumParam('view', ['grid', 'table'], { default: 'grid' }).default).toEqualTypeOf<
      'grid' | 'table'
    >();
  });
});
