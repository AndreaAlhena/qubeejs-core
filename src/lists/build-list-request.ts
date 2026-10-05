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
 * runs the list's `apply` with the state and the input, and applies the page
 * **last**. `addFilter()`, `addFilterOperator()`, `addSort()`, `setLimit()`,
 * `setSearch()`, `setParam()` and `setResource()` all reset the page to 1, so
 * the page must come after them to survive.
 *
 * A page the store would reject — zero, negative or fractional, as a hand-edited
 * URL can carry when the page param sets no `min` — falls back to the list's default page.
 *
 * Errors from `apply` or `generateUri()` — a capability the driver lacks, a
 * param collision, an empty resource — are programmer errors and propagate.
 *
 * ```ts
 * const request = buildListRequest(articleList, readListState(articleList, '?page=3'));
 * const response = await fetch(request.uri, { headers: request.headers ?? {} });
 * const page = request.paginate<Article>(await response.json(), response.headers);
 * ```
 *
 * A list that declares an input takes it as a third argument; one that
 * declares none refuses it:
 *
 * ```ts
 * buildListRequest(taskList, readListState(taskList, search), { projectId: '42' });
 * ```
 *
 * @param list - The list, as `defineList()` returned it
 * @param state - The list state, as `readListState()` returned it
 * @param input - What the list's request needs besides URL state, for a list that declares an
 * input. The input never reaches the URL; `[uri, headers]` stays a complete cache key
 * @returns The URI, the headers, and a parser bound to the same instance
 * @throws If `apply` asks for something the driver cannot express, or the resource is invalid
 */
export function buildListRequest<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
>(
  list: ListDefinition<TParams, TInput>,
  state: ParamsState<TParams>,
  // `NoInfer`: without it, a call that leaves the input out infers `never` from the empty
  // tuple, and compiles.
  ...input: [NoInfer<TInput>] extends [never] ? [] : [input: NoInfer<TInput>]
): ListRequest {
  const { builder, paginator } = createQubee(list.qubee);

  builder.setResource(list.resource);
  // `input` is `[]` or `[input]`, a tuple TypeScript cannot resolve while `TInput` is generic. Its
  // first item is the input, or `undefined` for a list that declares none.
  list.apply?.(builder, state, input[0]);
  builder.setPage(
    Number.isInteger(state.page) && state.page >= 1 ? state.page : list.params.page.default
  );

  return {
    headers: builder.paginationHeaders(),
    paginate: <T extends PaginatedObject>(
      response: RawResponse,
      headers?: HeaderBag
    ): PaginatedCollection<T> => paginator.paginate<T>(response, headers),
    uri: builder.generateUri(),
  };
}
