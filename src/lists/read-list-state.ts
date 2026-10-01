import type { ListDefinition } from '../types/list-definition.type';
import type { ListParam } from '../types/list-param.type';
import type { ListParams } from '../types/list-params.type';
import type { ParamsState } from '../types/params-state.type';
import type { SearchParamsInput } from '../types/search-params-input.type';

import { toSearchParams } from '../utils/to-search-params';

/**
 * Read a page's query into list state.
 *
 * Never throws. For each param, a key that is absent — or whose value the
 * param cannot read, or that a single-value param finds given twice — takes
 * the param's default. A custom param whose `parse` throws or returns `null`
 * is treated the same way. Keys the list does not own are ignored.
 *
 * ```ts
 * readListState(articleList, '?q=react&sort=title');
 * // { page: 1, q: 'react', status: undefined, sort: [{ field: 'title', order: SortEnum.ASC }] }
 * ```
 *
 * @param list - The list, as `defineList()` returned it
 * @param search - The page's query, in any shape a router gives it
 * @returns The list state
 */
export function readListState<TParams extends ListParams>(
  list: ListDefinition<TParams>,
  search: SearchParamsInput
): ParamsState<TParams> {
  const query = toSearchParams(search);
  const params: Readonly<Record<string, ListParam<unknown>>> = list.params;
  const state: Record<string, unknown> = {};

  Object.entries(params).forEach(([name, param]) => {
    state[name] = readParam(param, query.getAll(param.key));
  });

  return state as ParamsState<TParams>;
}

/**
 * Read one param, falling back to its default whenever it cannot.
 *
 * @param param - The param
 * @param values - Every value the URL holds for its key
 * @returns The value, or the param's default
 */
function readParam<T>(param: ListParam<T>, values: readonly string[]): T {
  if (!values.length) {
    return param.default;
  }

  try {
    return param.parse(values) ?? param.default;
  } catch {
    return param.default;
  }
}
