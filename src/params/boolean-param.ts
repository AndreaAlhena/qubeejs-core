import type { BooleanParamOptions } from '../types/boolean-param-options.type';
import type { ListParam } from '../types/list-param.type';

const FALSE_VALUES: readonly string[] = ['false', '0'];

const TRUE_VALUES: readonly string[] = ['true', '1'];

/**
 * A param holding a flag — "show archived".
 *
 * Reads `true` or `1` as `true`, `false` or `0` as `false`; anything else, or
 * a key given twice, falls back to the default. Writes `'true'` or `'false'`.
 *
 * @param key - The page-URL key
 * @param options - The default
 * @returns The param
 * @example
 * booleanParam('archived', { default: false }); // ListParam<boolean>
 */
export function booleanParam(
  key: string,
  options: BooleanParamOptions & { default: boolean }
): ListParam<boolean>;
/**
 * A param holding a flag, `undefined` when absent or unreadable.
 *
 * @param key - The page-URL key
 * @param options - No default
 * @returns The param
 */
export function booleanParam(
  key: string,
  options?: BooleanParamOptions & { default?: undefined }
): ListParam<boolean | undefined>;
export function booleanParam(
  key: string,
  options: BooleanParamOptions = {}
): ListParam<boolean | undefined> {
  return {
    default: options.default,
    key,
    parse: (values): boolean | undefined => {
      if (values.length !== 1) {
        return undefined;
      }

      if (TRUE_VALUES.includes(values[0])) {
        return true;
      }

      return FALSE_VALUES.includes(values[0]) ? false : undefined;
    },
    serialize: (value) => (value === undefined ? [] : [String(value)]),
  };
}
