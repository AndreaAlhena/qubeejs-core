import type { SearchParamsInput } from './search-params-input.type';

/**
 * Where a list is shown: the page's path and its current query.
 */
export type ListLocation = {
  /**
   * The page's path, without query or hash — `/articles`.
   */
  readonly pathname: string;

  /**
   * The page's current query, in any shape a router gives it.
   */
  readonly search: SearchParamsInput;
};
