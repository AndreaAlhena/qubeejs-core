import type { IntegerParamOptions } from '../types/integer-param-options.type';
import type { ListParam } from '../types/list-param.type';

const INTEGER = /^-?\d+$/;

/**
 * A param holding a whole number — a page, a page size, a year.
 *
 * Reads one value made of an optional `-` and digits, within `min`–`max` and
 * JavaScript's safe-integer range. Anything else — `1.5`, `1e3`, `+2`, ` 2`,
 * a key given twice — falls back to the default.
 *
 * @param key - The page-URL key
 * @param options - The default and the accepted range
 * @returns The param
 * @example
 * integerParam('page', { default: 1, min: 1 }); // ListParam<number>
 * integerParam('year', { max: 2100 });          // ListParam<number | undefined>
 */
export function integerParam(
  key: string,
  options: IntegerParamOptions & { default: number }
): ListParam<number>;
/**
 * A param holding a whole number, `undefined` when absent or unreadable.
 *
 * @param key - The page-URL key
 * @param options - The accepted range
 * @returns The param
 */
export function integerParam(
  key: string,
  options?: IntegerParamOptions & { default?: undefined }
): ListParam<number | undefined>;
export function integerParam(
  key: string,
  options: IntegerParamOptions = {}
): ListParam<number | undefined> {
  const { default: fallback, max, min } = options;

  return {
    default: fallback,
    key,
    parse: (values): number | undefined => {
      const [raw] = values;

      if (values.length !== 1 || !INTEGER.test(raw)) {
        return undefined;
      }

      const value = Number(raw);

      return Number.isSafeInteger(value) &&
        (min === undefined || value >= min) &&
        (max === undefined || value <= max)
        ? value
        : undefined;
    },
    serialize: (value) => (value === undefined ? [] : [String(value)]),
  };
}
