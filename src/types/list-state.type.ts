import type { ListDefinition } from './list-definition.type';
import type { ListParams } from './list-params.type';
import type { ParamsState } from './params-state.type';

/**
 * The state of a list, read from its definition:
 *
 * ```ts
 * type ArticleListState = ListState<typeof articleList>;
 * ```
 *
 * @typeParam TList - The list, as `defineList()` returned it
 */
export type ListState<TList> =
  TList extends ListDefinition<infer TParams extends ListParams> ? ParamsState<TParams> : never;
