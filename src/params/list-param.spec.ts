import { ArticleStatusEnum } from '../../test/fixtures/article-status.enum';
import { listParam } from './list-param';

describe('listParam', () => {
  describe('parse', () => {
    it('should split one value on the separator', () => {
      expect(listParam('tags').parse(['react,vue'])).toEqual(['react', 'vue']);
    });

    it('should read repeated keys too', () => {
      expect(listParam('tags').parse(['react', 'vue,svelte'])).toEqual(['react', 'vue', 'svelte']);
    });

    it('should drop empty items and duplicates', () => {
      expect(listParam('tags').parse(['react,,react,vue'])).toEqual(['react', 'vue']);
    });

    it('should drop items outside its values', () => {
      expect(listParam('status', { values: ArticleStatusEnum }).parse(['draft,archived'])).toEqual([
        ArticleStatusEnum.DRAFT,
      ]);
    });

    it('should give up when no item is left', () => {
      expect(
        listParam('status', { values: ArticleStatusEnum }).parse(['archived'])
      ).toBeUndefined();
    });

    it('should use a custom separator', () => {
      expect(listParam('tags', { separator: '|' }).parse(['a|b'])).toEqual(['a', 'b']);
    });
  });

  describe('serialize', () => {
    it('should join the items into one value', () => {
      expect(listParam('tags').serialize(['react', 'vue'])).toEqual(['react,vue']);
    });

    it('should leave out an empty list', () => {
      expect(listParam('tags').serialize([])).toEqual([]);
    });

    it('should round-trip', () => {
      const param = listParam('tags', { separator: '|' });

      expect(param.parse(param.serialize(['a', 'b']))).toEqual(['a', 'b']);
    });
  });

  it('should default to an empty list', () => {
    expect(listParam('tags').default).toEqual([]);
    expect(listParam('tags', { default: ['react'] }).default).toEqual(['react']);
  });

  it('should type its items by its values', () => {
    const statuses = listParam('status', { values: ArticleStatusEnum }).default;

    expectTypeOf(statuses).items.toEqualTypeOf<ArticleStatusEnum>();
    expectTypeOf(statuses).toExtend<readonly ArticleStatusEnum[]>();
    expectTypeOf(listParam('tags').default).toEqualTypeOf<readonly string[]>();
  });
});
