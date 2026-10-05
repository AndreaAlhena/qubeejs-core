import type { ListDefinition } from '../types/list-definition.type';
import type { ListLocation } from '../types/list-location.type';
import type { ListParam } from '../types/list-param.type';
import type { ListParams } from '../types/list-params.type';
import type { ParamsState } from '../types/params-state.type';

import { toSearchParams } from '../utils/to-search-params';
import { readListState } from './read-list-state';

/**
 * Build a link to the list with some of its state changed.
 *
 * - A key set to `undefined` in `changes` goes back to its default.
 * - The page returns to its default when any other param's value actually
 *   changes — a page number means nothing in a different list — unless
 *   `changes` names `page` itself. Setting a param to the value it already
 *   holds keeps the page.
 * - Values equal to their default stay out of the URL, and an unreadable value
 *   in the current URL is dropped.
 * - Keys the list does not own are kept, ahead of the list's own, which follow
 *   in declaration order. The hash is dropped.
 * - Commas are left unescaped, so sorts read `sort=-publishedAt,title`.
 *   Never compare raw query strings. `toSearchParams(…).toString()` evens out
 *   encoding (`,` against `%2C`) but not key order; to test whether the URL
 *   already shows a state, compare `buildListHref(list, location, changes)`
 *   with `buildListHref(list, location)`, the current URL in canonical form.
 *
 * ```ts
 * buildListHref(articleList, { pathname: '/articles', search: '?page=3' }, { q: 'react' });
 * // '/articles?q=react'
 * ```
 *
 * @param list - The list, as `defineList()` returned it
 * @param location - The page's path and current query
 * @param changes - The state to change; keys left out keep their current value
 * @returns The path, with its query when there is one
 */
export function buildListHref<TParams extends ListParams>(
  // Any input, which never reaches a link: a list written by hand whose `apply` requires its
  // input is not assignable to `ListDefinition<TParams>`, whose input is `never`.
  list: ListDefinition<TParams, NonNullable<unknown>>,
  location: ListLocation,
  changes: Partial<ParamsState<TParams>> = {}
): string {
  const params: Readonly<Record<string, ListParam<unknown>>> = list.params;
  const current: Readonly<Record<string, unknown>> = readListState(list, location.search);
  const requested: Readonly<Record<string, unknown>> = changes;
  const next: Record<string, unknown> = {};

  Object.entries(params).forEach(([name, param]) => {
    next[name] = Object.hasOwn(requested, name)
      ? (requested[name] ?? param.default)
      : current[name];
  });

  const isAnotherList = Object.entries(params).some(
    ([name, param]) =>
      name !== 'page' && !isSame(param.serialize(next[name]), param.serialize(current[name]))
  );

  if (isAnotherList && !Object.hasOwn(requested, 'page')) {
    next['page'] = params['page'].default;
  }

  const query = toSearchParams(location.search);

  Object.values(params).forEach((param) => query.delete(param.key));
  Object.entries(params).forEach(([name, param]) => {
    const values = param.serialize(next[name]);

    if (isSame(values, param.serialize(param.default))) {
      return;
    }

    values.forEach((value) => query.append(param.key, value));
  });

  const search = query.toString().replaceAll('%2C', ',');

  return search ? `${location.pathname}?${search}` : location.pathname;
}

/**
 * Whether two serialised values hold the same items, in the same order.
 *
 * @param left - One serialised value
 * @param right - The other
 * @returns Whether they are the same
 */
function isSame(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
