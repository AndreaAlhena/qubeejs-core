import type { EnumParamOptions } from '../types/enum-param-options.type';
import type { EnumValues } from '../types/enum-values.type';
import type { ListParam } from '../types/list-param.type';

/**
 * A param holding one of a fixed set of strings — a status, a view.
 *
 * `values` is a string enum object or a tuple. Reads one value that is one of
 * them, exactly; anything else, or a key given twice, falls back to the
 * default.
 *
 * @param key - The page-URL key
 * @param values - The accepted values
 * @param options - The default
 * @returns The param
 * @example
 * enumParam('status', ArticleStatusEnum);                     // ListParam<ArticleStatusEnum | undefined>
 * enumParam('view', ['grid', 'table'], { default: 'grid' });  // ListParam<'grid' | 'table'>
 */
export function enumParam<const T extends string>(
  key: string,
  values: EnumValues<T>,
  options: EnumParamOptions<NoInfer<T>> & { default: NoInfer<T> }
): ListParam<T>;
/**
 * A param holding one of a fixed set of strings, `undefined` when absent or
 * anything else.
 *
 * @param key - The page-URL key
 * @param values - The accepted values
 * @param options - No default
 * @returns The param
 */
export function enumParam<const T extends string>(
  key: string,
  values: EnumValues<T>,
  options?: EnumParamOptions<NoInfer<T>> & { default?: undefined }
): ListParam<T | undefined>;
export function enumParam<const T extends string>(
  key: string,
  values: EnumValues<T>,
  options: EnumParamOptions<T> = {}
): ListParam<T | undefined> {
  const accepted: readonly string[] = Object.values(values);
  const isMember = (value: string): value is T => accepted.includes(value);

  return {
    default: options.default,
    key,
    parse: (raw) => (raw.length === 1 && isMember(raw[0]) ? raw[0] : undefined),
    serialize: (value) => (value === undefined ? [] : [value]),
  };
}
