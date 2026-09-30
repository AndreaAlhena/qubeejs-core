import type { ListDefinition } from '../types/list-definition.type';
import type { ListParam } from '../types/list-param.type';
import type { ListParams } from '../types/list-params.type';

import { DuplicateListParamError } from '../errors/duplicate-list-param.error';

/**
 * Declare a list: the API resource it reads, the qubee configuration its
 * requests are built with, the page-URL params its state is made of, and how
 * that state becomes builder calls.
 *
 * Declare each list once, as a module-level constant that server and client
 * code both import. It holds functions, so it cannot travel as serialised
 * data — as a prop from a React Server Component, say. Params appear in links
 * in the order they are declared.
 *
 * ```ts
 * export const articleList = defineList({
 *   apply: (builder, { q, sort }) => {
 *     builder.setLimit(20);
 *     sort.forEach(({ field, order }) => builder.addSort(field, order));
 *
 *     if (q) {
 *       builder.addFilter('title', q);
 *     }
 *   },
 *   params: {
 *     page: integerParam('page', { default: 1, min: 1 }),
 *     q: stringParam('q'),
 *     sort: sortParam('sort', { fields: ['publishedAt', 'title'] }),
 *   },
 *   qubee: { driver: STRAPI_DRIVER },
 *   resource: 'articles',
 * });
 * ```
 *
 * @param definition - The list
 * @returns A frozen shallow copy of the list, with its params map frozen too —
 * the input stays unfrozen, and so does the driver, a shared constant such as
 * `STRAPI_DRIVER`
 * @throws {DuplicateListParamError} If two params share a key, or a key is empty
 */
export function defineList<TParams extends ListParams>(
  definition: ListDefinition<TParams>
): ListDefinition<TParams> {
  const params: Readonly<Record<string, ListParam<unknown>>> = definition.params;
  const owners = new Map<string, string[]>();

  Object.entries(params).forEach(([name, param]) => {
    owners.set(param.key, [...(owners.get(param.key) ?? []), name]);
  });

  owners.forEach((names, key) => {
    if (key === '' || names.length > 1) {
      throw new DuplicateListParamError(key, names);
    }
  });

  return Object.freeze({ ...definition, params: Object.freeze({ ...definition.params }) });
}
