import type { QueryBuilderState } from '../types/query-builder-state.type';

/**
 * Percent-encode the caller-supplied values in a query builder state.
 *
 * Encodes filter values, operator-filter values and the search term — the
 * parts of a URI that carry end-user input. Everything a strategy adds
 * around them stays literal: bracketed keys (`filter[name]`), operator
 * syntax (`$eq:`, `eq.`, `in.(…)`), the `,` joining multiple values, and
 * developer-supplied names (fields, includes, sorts, select).
 *
 * Only **strings** are encoded. Numbers and booleans pass through with
 * their type intact, because several strategies branch on
 * `typeof value === 'boolean'` (the `NULL` operator) and OData and
 * PocketBase quote strings but not numbers.
 *
 * `encodeURIComponent` leaves `'` unencoded, so the quote escaping OData
 * (`'` → `''`) and PocketBase (`'` → `\'`) apply afterwards still works:
 * the server decodes the value first, then parses the expression.
 *
 * ```
 * addFilter('name', '%foo & bar%')  -> filter[name]=%25foo%20%26%20bar%25
 * addFilter('id', 'a,b', 'c')       -> filter[id]=a%2Cb,c
 * ```
 *
 * @param state - The state as held by the store
 * @returns A shallow copy with the value-bearing branches encoded; the input is not mutated
 */
export function encodeValues(state: QueryBuilderState): QueryBuilderState {
  const filters: QueryBuilderState['filters'] = {};

  for (const [field, values] of Object.entries(state.filters)) {
    filters[field] = values.map(encodeValue);
  }

  return {
    ...state,
    filters,
    operatorFilters: state.operatorFilters.map((filter) => ({
      ...filter,
      values: filter.values.map(encodeValue),
    })),
    search: encodeURIComponent(state.search),
  };
}

/**
 * Percent-encode a single value when it is a string.
 *
 * @param value - A filter value
 * @returns The encoded string, or the value unchanged when it is a number or boolean
 */
function encodeValue(value: boolean | number | string): boolean | number | string {
  return typeof value === 'string' ? encodeURIComponent(value) : value;
}
