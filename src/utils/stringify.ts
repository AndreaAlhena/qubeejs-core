/**
 * A value that can appear in a query-string payload.
 */
type QueryValue =
  boolean | number | string | QueryValue[] | null | undefined | { [key: string]: QueryValue };

/**
 * Serialise a nested object into bracket-notation query-string segments.
 *
 * Replaces the single `qs.stringify(payload, { encode: false })` call shape the
 * request strategies used — the only `qs` feature this library ever needed.
 *
 * Behaviour, matched against `qs@6` and pinned by `stringify.spec.ts`:
 *
 * ```
 * { a: 1, b: 'x' }                      -> a=1&b=x
 * { filters: { status: { $eq: 'p' } } } -> filters[status][$eq]=p
 * { populate: ['a', 'b'] }              -> populate[0]=a&populate[1]=b
 * { a: undefined }                      -> ''          (key skipped entirely)
 * { a: null }                           -> a=          (key kept, value empty)
 * { a: [] } / { a: {} }                 -> ''          (nothing to emit)
 * ```
 *
 * Nothing is percent-encoded here. Backends receiving these query strings
 * expect literal brackets and operators (`filters[status][$eq]`), and
 * `URLSearchParams` offers no way to opt out of encoding — which is why it
 * cannot serve as a substitute here. Values that carry user input arrive
 * already encoded: `AbstractRequestStrategy.buildUri()` runs the state
 * through `encodeValues()` before any strategy calls this.
 *
 * @param payload - The object to serialise
 * @returns Query-string segments joined with `&`, or an empty string
 */
export function stringify(payload: Record<string, QueryValue>): string {
  return walk(payload, '').join('&');
}

/**
 * Recursively flatten a value into `key=value` segments.
 *
 * @param value - The value being flattened
 * @param prefix - Bracket-notation path accumulated so far
 * @returns One segment per leaf
 */
function walk(value: QueryValue, prefix: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (value === null) {
    return [`${prefix}=`];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => walk(entry, `${prefix}[${index}]`));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      walk(entry, prefix === '' ? key : `${prefix}[${key}]`)
    );
  }

  return [`${prefix}=${String(value)}`];
}
