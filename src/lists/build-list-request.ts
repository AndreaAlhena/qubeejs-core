import type { PaginatedCollection } from '../models/paginated-collection';
import type { HeaderBag } from '../types/header-bag.type';
import type { ListDefinition } from '../types/list-definition.type';
import type { ListParams } from '../types/list-params.type';
import type { ListRequest } from '../types/list-request.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { ParamsState } from '../types/params-state.type';
import type { RawResponse } from '../types/raw-response.type';

import { createQubee } from '../services/create-qubee';

/**
 * Turn list state into the request for its page.
 *
 * Each call builds on a fresh `createQubee()` instance: it sets the resource,
 * runs the list's `apply`, and applies the page **last**. `addFilter()`,
 * `addFilterOperator()`, `addSort()`, `setLimit()`, `setSearch()`,
 * `setParam()` and `setResource()` all reset the page to 1, so the page must
 * come after them to survive.
 *
 * Errors from `apply` or `generateUri()` — a capability the driver lacks, a
 * param collision, an empty resource — are programmer errors and propagate.
 *
 * ```ts
 * const request = buildListRequest(articleList, readListState(articleList, '?page=3'));
 * const response = await fetch(request.uri, { headers: request.headers ?? {} });
 * const page = request.paginate<Article>(await response.json());
 * ```
 *
 * @param list - The list, as `defineList()` returned it
 * @param state - The list state, as `readListState()` returned it
 * @returns The URI, the headers, and a parser bound to the same instance
 * @throws If `apply` asks for something the driver cannot express, or the resource is invalid
 */
export function buildListRequest<TParams extends ListParams>(
  list: ListDefinition<TParams>,
  state: ParamsState<TParams>
): ListRequest {
  const { builder, paginator } = createQubee(list.qubee);

  builder.setResource(list.resource);
  list.apply?.(builder, state);
  builder.setPage(state.page);

  return {
    headers: builder.paginationHeaders(),
    paginate: <T extends PaginatedObject>(
      response: RawResponse,
      headers?: HeaderBag
    ): PaginatedCollection<T> => paginator.paginate<T>(response, headers),
    uri: builder.generateUri(),
  };
}
