import type { ListParam } from '../types/list-param.type';
import type { StringParamOptions } from '../types/string-param-options.type';

/**
 * A param holding free text — a search term.
 *
 * Reads one value; an empty value, or a key given twice, falls back to the
 * default. Writes nothing for an empty string, so clearing a search box
 * removes the key. Surrounding spaces are kept unless `trim` is set.
 *
 * @param key - The page-URL key
 * @param options - The default, and whether to trim
 * @returns The param
 * @example
 * stringParam('q');                      // ListParam<string | undefined>
 * stringParam('view', { default: 'grid' }); // ListParam<string>
 */
export function stringParam(
  key: string,
  options: StringParamOptions & { default: string }
): ListParam<string>;
/**
 * A param holding free text, `undefined` when absent or empty.
 *
 * @param key - The page-URL key
 * @param options - Whether to trim
 * @returns The param
 */
export function stringParam(
  key: string,
  options?: StringParamOptions & { default?: undefined }
): ListParam<string | undefined>;
export function stringParam(
  key: string,
  options: StringParamOptions = {}
): ListParam<string | undefined> {
  const { default: fallback, trim = false } = options;

  return {
    default: fallback,
    key,
    parse: (values): string | undefined => {
      if (values.length !== 1) {
        return undefined;
      }

      const value = trim ? values[0].trim() : values[0];

      return value === '' ? undefined : value;
    },
    serialize: (value) => (value ? [value] : []),
  };
}
