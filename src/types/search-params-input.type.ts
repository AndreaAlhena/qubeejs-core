/**
 * A page URL's query, in any of the shapes routers hand it over:
 *
 * - `URLSearchParams` — React Router's `useSearchParams()`, and Next's
 *   `useSearchParams()`, whose `ReadonlyURLSearchParams` extends it
 * - a query string, with or without its leading `?`
 * - the record a Next page receives as `searchParams`, where a repeated key
 *   holds an array
 */
export type SearchParamsInput =
  URLSearchParams | string | Readonly<Record<string, string | readonly string[] | undefined>>;
