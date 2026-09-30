import type { EnumValues } from './enum-values.type';

/**
 * Options for `listParam()`.
 *
 * @typeParam T - The accepted items
 */
export type ListParamOptions<T extends string> = {
  /**
   * The items used when the key is absent or holds no accepted item. `[]`
   * when left out.
   */
  default?: readonly NoInfer<T>[];

  /**
   * Splits one value into items, and joins items into one value. `,` when
   * left out.
   */
  separator?: string;

  /**
   * The items accepted. Any non-empty string when left out.
   */
  values?: EnumValues<T>;
};
