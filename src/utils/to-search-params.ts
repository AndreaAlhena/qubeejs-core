import type { SearchParamsInput } from '../types/search-params-input.type';

/**
 * Copy any {@link SearchParamsInput} into a new `URLSearchParams`.
 *
 * Always a copy, so the result can be changed without touching the router's
 * own object. A record's array values become repeated keys, in order;
 * `undefined` values are left out. A `URLSearchParams` is recognised by its
 * `getAll` method rather than by `instanceof`, so one built in another realm —
 * a test DOM, an iframe — is copied too.
 *
 * @param input - The query, as the router gave it
 * @returns A new `URLSearchParams` holding the same pairs
 * @example
 * toSearchParams('?q=react&page=2').get('page'); // '2'
 * toSearchParams({ tag: ['a', 'b'] }).getAll('tag'); // ['a', 'b']
 */
export function toSearchParams(input: SearchParamsInput): URLSearchParams {
  if (typeof input === 'string' || isSearchParams(input)) {
    return new URLSearchParams(input);
  }

  const params = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    (typeof value === 'string' ? [value] : value).forEach((item) => params.append(key, item));
  });

  return params;
}

/**
 * Tell a `URLSearchParams`, from any realm, from a params record.
 *
 * A record's values are strings, arrays or `undefined` — never functions — so
 * a callable `getAll` is proof enough.
 *
 * @param input - A query that is not a string
 * @returns Whether `input` is a `URLSearchParams`
 */
function isSearchParams(input: SearchParamsInput): input is URLSearchParams {
  return typeof (input as { getAll?: unknown }).getAll === 'function';
}
