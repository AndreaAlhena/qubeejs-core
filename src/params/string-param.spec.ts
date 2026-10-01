import { stringParam } from './string-param';

describe('stringParam', () => {
  describe('parse', () => {
    it('should read one value', () => {
      expect(stringParam('q').parse(['react'])).toBe('react');
    });

    it('should keep surrounding spaces unless trim is set', () => {
      // A search box fed from list state re-parses on every keystroke: trimming
      // would eat the space its user has just typed.
      expect(stringParam('q').parse(['rock '])).toBe('rock ');
      expect(stringParam('q', { trim: true }).parse(['  rock  '])).toBe('rock');
    });

    it('should give up on an empty value', () => {
      expect(stringParam('q').parse([''])).toBeUndefined();
    });

    it('should give up on a value that trims to nothing', () => {
      expect(stringParam('q', { trim: true }).parse(['   '])).toBeUndefined();
    });

    it('should give up on a value given twice', () => {
      expect(stringParam('q').parse(['a', 'b'])).toBeUndefined();
    });
  });

  describe('serialize', () => {
    it('should write the value as it is', () => {
      expect(stringParam('q').serialize('rock & roll')).toEqual(['rock & roll']);
    });

    it('should leave out an empty string and undefined', () => {
      expect(stringParam('q').serialize('')).toEqual([]);
      expect(stringParam('q').serialize(undefined)).toEqual([]);
    });

    it('should round-trip', () => {
      const param = stringParam('q');

      expect(param.parse(param.serialize(' rock & roll '))).toBe(' rock & roll ');
    });
  });

  it('should carry its default', () => {
    expect(stringParam('view', { default: 'grid' }).default).toBe('grid');
    expect(stringParam('q').default).toBeUndefined();
  });

  it('should type its value by its default', () => {
    expectTypeOf(stringParam('view', { default: 'grid' }).default).toEqualTypeOf<string>();
    expectTypeOf(stringParam('q').default).toEqualTypeOf<string | undefined>();
  });
});
