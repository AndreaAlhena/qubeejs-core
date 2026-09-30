import type { ListParamOptions } from '../types/list-param-options.type';
import type { ListParam } from '../types/list-param.type';

/**
 * A param holding several strings — the tags or statuses of a multi-select.
 *
 * Reads every value of the key, each split on the separator, so both
 * `?tag=a,b` and `?tag=a&tag=b` hold `['a', 'b']`. Empty items, duplicates and
 * items outside `values` are dropped; when none is left, the default applies.
 * Writes the items as one value, joined with the separator. Defaults to `[]`.
 *
 * @param key - The page-URL key
 * @param options - The accepted items, the default and the separator
 * @returns The param
 * @example
 * listParam('tags');                                   // ListParam<readonly string[]>
 * listParam('status', { values: ArticleStatusEnum }); // ListParam<readonly ArticleStatusEnum[]>
 */
export function listParam<const T extends string = string>(
  key: string,
  options: ListParamOptions<T> = {}
): ListParam<readonly T[]> {
  const { separator = ',', values } = options;
  const accepted: readonly string[] | undefined =
    values === undefined ? undefined : Object.values(values);
  const isItem = (item: string): item is T =>
    item !== '' && (accepted === undefined || accepted.includes(item));

  return {
    default: options.default ?? [],
    key,
    parse: (raw): readonly T[] | undefined => {
      const items = [...new Set(raw.flatMap((value) => value.split(separator)).filter(isItem))];

      return items.length ? items : undefined;
    },
    serialize: (value) => (value.length ? [value.join(separator)] : []),
  };
}
