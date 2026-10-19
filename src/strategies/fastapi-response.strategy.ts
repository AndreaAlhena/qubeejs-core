import type { IResponseStrategy } from '../interfaces/response-strategy.interface';
import type { ResponseOptions } from '../models/response-options';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { RawResponse } from '../types/raw-response.type';

import { PaginatedCollection } from '../models/paginated-collection';
import { readNumber, readRows, readString } from '../utils/read-path';

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
 * `prev`, `next` and `last` are read with the same defaults.
 *
 * fastapi-pagination sends `null` for what it does not know: `total` and
 * `pages` under `UseIncludeTotal(False)`, and `prev`/`next` at either end
 * of `links`. Every field is read by type, so a `null` comes out as
 * `undefined`, the collection's "not known". Without a total,
 * fastapi-pagination also points `links.last` at page 1 whatever the page
 * count, so that link is dropped rather than passed on.
 *
 * `from`/`to` are derived from the rows actually returned: `page` × `size`
 * places the first row and the row count the last, so a short last page
 * ends at its last row with or without a total, and an empty page (no
 * results, or a page past the end) has neither. An empty result reports
 * `pages: 0`; the last page is clamped to 1 so `Paginator` still syncs it
 * and a stale page count from an earlier, wider query does not survive.
 *
 * @see https://uriyyo-fastapi-pagination.netlify.app/
 */
export class FastapiResponseStrategy implements IResponseStrategy {
  /**
   * Parse a fastapi-pagination `Page` body into a PaginatedCollection
   *
   * @param response - The raw API response body
   * @param options - The response key name configuration; `from` and `to`
   * are derived rather than read
   * @returns A typed PaginatedCollection instance
   */
  public paginate<T extends PaginatedObject>(
    response: RawResponse,
    options: ResponseOptions
  ): PaginatedCollection<T> {
    const data = readRows<T>(response, options.data);
    const page = readNumber(response, options.currentPage) ?? 1;
    const perPage = readNumber(response, options.perPage);
    const total = readNumber(response, options.total);
    const pages = readNumber(response, options.lastPage);
    const from = data.length && perPage ? (page - 1) * perPage + 1 : undefined;

    return new PaginatedCollection(
      data,
      page,
      from,
      from === undefined ? undefined : from + data.length - 1,
      total,
      perPage,
      readString(response, options.prevPageUrl),
      readString(response, options.nextPageUrl),
      pages === undefined ? undefined : Math.max(pages, 1),
      readString(response, options.firstPageUrl),
      total === undefined ? undefined : readString(response, options.lastPageUrl)
    );
  }
}
