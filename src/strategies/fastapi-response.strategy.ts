import type { RawResponse } from '../types/raw-response.type';

import { AbstractDotPathResponseStrategy } from './abstract-dot-path-response.strategy';

/**
 * Response strategy for the FastAPI driver
 *
 * Parses the body of fastapi-pagination's `Page`:
 * ```json
 * {
 *   "items": [{ "id": 11, "title": "Hello" }],
 *   "total": 95,
 *   "page": 2,
 *   "size": 10,
 *   "pages": 10
 * }
 * ```
 *
 * Default key paths are configured in `FastapiResponseOptions`. A plain
 * `Page` has no navigation links, so the URLs resolve to `undefined`;
 * `fastapi_pagination.links.Page` adds a `links` block whose `first`,
 * `prev`, `next` and `last` are read with the same defaults. `from`/`to`
 * are computed from `page` × `size`.
 *
 * fastapi-pagination sends `null` for what it does not know: `total` and
 * `pages` under `UseIncludeTotal(False)`, and `prev`/`next` at either end
 * of `links`. Those resolve to `undefined` here, the collection's "not
 * known", instead of leaking `null` into fields typed `number` or `string`.
 *
 * @see https://uriyyo-fastapi-pagination.netlify.app/
 */
export class FastapiResponseStrategy extends AbstractDotPathResponseStrategy {
  /**
   * Resolve a dot-notation path, reading `null` as absent
   *
   * @param response - The raw API response object
   * @param path - The dot-notation path
   * @returns The value at the path, or `undefined` when it is missing or `null`
   */
  protected override resolve(response: RawResponse, path: string): unknown {
    return super.resolve(response, path) ?? undefined;
  }
}
