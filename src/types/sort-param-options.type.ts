import type { SortEnum } from '../enums/sort.enum';

/**
 * Options for `sortParam()`.
 *
 * @typeParam F - The API field names the param accepts
 */
export type SortParamOptions<F extends string> = {
  /**
   * The sorts used when the key is absent or unreadable. `[]` when left out.
   * Every field must be one of `fields`.
   */
  default?: readonly { readonly field: NoInfer<F>; readonly order: SortEnum }[];

  /**
   * The API fields the param accepts: a list, where each URL token is the
   * field itself, or a record from URL token to field —
   * `{ newest: 'publishedAt' }`.
   */
  fields: readonly F[] | Readonly<Record<string, F>>;
};
