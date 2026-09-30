import { booleanParam } from './boolean-param';

describe('booleanParam', () => {
  const param = booleanParam('archived', { default: false });

  describe('parse', () => {
    it.each([
      [['true'], true],
      [['1'], true],
      [['false'], false],
      [['0'], false],
    ] as const)('should read %j as %s', (values, expected) => {
      expect(param.parse(values)).toBe(expected);
    });

    it.each([[['yes']], [['TRUE']], [['']], [['true', 'false']]] as const)(
      'should give up on %j',
      (values) => {
        expect(param.parse(values)).toBeUndefined();
      }
    );
  });

  describe('serialize', () => {
    it('should write true and false', () => {
      expect([param.serialize(true), param.serialize(false)]).toEqual([['true'], ['false']]);
    });

    it('should leave out undefined', () => {
      expect(booleanParam('archived').serialize(undefined)).toEqual([]);
    });
  });

  it('should default to undefined without a default', () => {
    expect(booleanParam('archived').default).toBeUndefined();
  });

  it('should round-trip', () => {
    expect(param.parse(param.serialize(true))).toBe(true);
  });
});
