import type { ListParam } from './list-param.type';
import type { Sort } from './sort.type';

/**
 * A {@link ListParam} holding sorts, as `sortParam()` builds it.
 *
 * `sortFields` lists the API fields the param accepts. `@qubeejs/react` reads
 * it to find a list's sort param and to type `toggleSort()`'s argument.
 *
 * @typeParam F - The API field names the param accepts
 */
export type SortParam<F extends string> = ListParam<readonly Sort[]> & {
  /**
   * The API field names the param accepts, in declaration order.
   */
  readonly sortFields: readonly F[];
};
