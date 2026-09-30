import { integerParam } from './integer-param';

describe('integerParam', () => {
  describe('parse', () => {
    const param = integerParam('page', { default: 1, max: 50, min: 1 });

    it.each([
      [['1'], 1],
      [['50'], 50],
      [['007'], 7],
    ] as const)('should read %j as %d', (values, expected) => {
      expect(param.parse(values)).toBe(expected);
    });

    it.each([
      [['0']],
      [['51']],
      [['1.5']],
      [['1e3']],
      [['+2']],
      [[' 2']],
      [['']],
      [['abc']],
      [['99999999999999999999']],
      [['2', '3']],
    ] as const)('should give up on %j', (values) => {
      expect(param.parse(values)).toBeUndefined();
    });

    it('should accept negatives when no min is set', () => {
      expect(integerParam('offset').parse(['-3'])).toBe(-3);
    });

    it('should accept any safe integer when no max is set', () => {
      expect(integerParam('offset', { min: 0 }).parse(['9007199254740991'])).toBe(9007199254740991);
    });
  });

  describe('serialize', () => {
    it('should write the number', () => {
      expect(integerParam('page', { default: 1 }).serialize(3)).toEqual(['3']);
    });

    it('should leave out undefined', () => {
      expect(integerParam('year').serialize(undefined)).toEqual([]);
    });

    it('should round-trip', () => {
      const param = integerParam('page', { default: 1 });

      expect(param.parse(param.serialize(12))).toBe(12);
    });
  });

  it('should carry its key and default', () => {
    const param = integerParam('page', { default: 1 });

    expect([param.key, param.default]).toEqual(['page', 1]);
  });

  it('should default to undefined without a default', () => {
    expect(integerParam('year').default).toBeUndefined();
  });

  it('should type its value by its default', () => {
    expectTypeOf(integerParam('page', { default: 1 }).default).toEqualTypeOf<number>();
    expectTypeOf(integerParam('year').default).toEqualTypeOf<number | undefined>();
  });
});
