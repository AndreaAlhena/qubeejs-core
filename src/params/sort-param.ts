import type { SortParamOptions } from '../types/sort-param-options.type';
import type { SortParam } from '../types/sort-param.type';
import type { Sort } from '../types/sort.type';

import { SortEnum } from '../enums/sort.enum';

/**
 * A param holding sorts — `?sort=-publishedAt,title`.
 *
 * Reads one value of comma-separated tokens; a leading `-` sorts descending.
 * A token outside `fields`, a field sorted twice, or a key given twice falls
 * back to the default. State always holds API field names, even when
 * `fields` renames them for the URL. Defaults to no sort. Clearing the sort in a link (`[]`) leaves the key
 * out, which reads back as the default — give it an empty default if users
 * must be able to clear it.
 *
 * The result carries `sortFields`, which `@qubeejs/react` reads to type
 * `toggleSort()`.
 *
 * @param key - The page-URL key
 * @param options - The accepted fields, optionally renamed, and the default
 * @returns The param
 * @example
 * sortParam('sort', { fields: ['publishedAt', 'title'] });
 * sortParam('sort', { fields: { newest: 'publishedAt' } }); // ?sort=-newest
 */
export function sortParam<const F extends string>(
  key: string,
  options: SortParamOptions<F>
): SortParam<F> {
  const { fields } = options;
  const tokens = new Map<string, F>(
    isFieldList(fields) ? fields.map((field) => [field, field]) : Object.entries(fields)
  );
  const fieldTokens = new Map<string, string>([...tokens].map(([token, field]) => [field, token]));

  return {
    default: options.default ?? [],
    key,
    parse: (values): Sort[] | undefined => {
      if (values.length !== 1) {
        return undefined;
      }

      const sorts: Sort[] = [];

      for (const token of values[0].split(',')) {
        const isDescending = token.startsWith('-');
        const field = tokens.get(isDescending ? token.slice(1) : token);

        if (field === undefined || sorts.some((sort) => sort.field === field)) {
          return undefined;
        }

        sorts.push({ field, order: isDescending ? SortEnum.DESC : SortEnum.ASC });
      }

      return sorts;
    },
    serialize: (value) =>
      value.length
        ? [
            value
              .map(
                ({ field, order }) =>
                  `${order === SortEnum.DESC ? '-' : ''}${fieldTokens.get(field) ?? field}`
              )
              .join(','),
          ]
        : [],
    sortFields: [...new Set(tokens.values())],
  };
}

/**
 * Tell a list of fields from a record of URL tokens to fields.
 *
 * @param fields - The accepted fields, as `sortParam()` received them
 * @returns Whether `fields` is a list
 */
function isFieldList<F extends string>(
  fields: readonly F[] | Readonly<Record<string, F>>
): fields is readonly F[] {
  return Array.isArray(fields);
}
