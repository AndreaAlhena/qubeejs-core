/**
 * One page-URL parameter of a list: the key it is read from, the value used
 * when it is missing or unreadable, and how its value is read and written.
 *
 * `parse` and `serialize` use method syntax on purpose. Method parameters are
 * checked bivariantly, which lets a `ListParam<number>` stand where a
 * `ListParam<unknown>` is expected — that is how one list holds params of
 * different types.
 *
 * Any object of this shape is a param, so an app can write its own:
 *
 * ```ts
 * const sinceParam: ListParam<string | undefined> = {
 *   default: undefined,
 *   key: 'since',
 *   parse: (values) => (values.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(values[0]) ? values[0] : undefined),
 *   serialize: (value) => (value === undefined ? [] : [value]),
 * };
 * ```
 *
 * @typeParam T - The value the param holds in list state
 */
export type ListParam<T> = {
  /**
   * The value used when the key is absent, or when `parse` gives up.
   */
  readonly default: T;

  /**
   * The page-URL key, read and written verbatim.
   */
  readonly key: string;

  /**
   * Read the value from every value the URL holds for `key`, in order.
   *
   * Never called with an empty array. Returning `undefined` or `null` — or
   * throwing — falls back to `default`.
   *
   * @param values - The key's values, as `URLSearchParams.getAll()` returns them
   * @returns The value, or `undefined` to fall back
   */
  parse(values: readonly string[]): T | undefined;

  /**
   * The values to write for `key`.
   *
   * @param value - The value in list state
   * @returns `[]` to leave the key out; several values repeat the key
   */
  serialize(value: T): readonly string[];
};
