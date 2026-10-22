import type { IResponseStrategy } from '../interfaces/response-strategy.interface';
import type { ResponseOptions } from '../models/response-options';
import type { HeaderBag } from '../types/header-bag.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { RawResponse } from '../types/raw-response.type';

import { PaginatedCollection } from '../models/paginated-collection';
import { readHeader } from '../utils/read-header';
import { readPath } from '../utils/read-path';

/**
 * Internal shape holding the three values parsed out of a `Content-Range`
 * header. All three are optional because PostgREST may legitimately emit a
 * malformed header (or none at all, when the client didn't opt into counts
 * via `Prefer: count=exact`).
 */
type ContentRangeParts = {
  from?: number;
  to?: number;
  total?: number;
};

/**
 * Response strategy for the PostgREST driver
 *
 * PostgREST (and Supabase, which wraps it) returns a bare array body for
 * collection endpoints. Pagination metadata is carried in the
 * `Content-Range` HTTP response header, e.g. `0-9/50` meaning "items 0–9
 * out of 50 total". Consumers opt into totals by sending the
 * `Prefer: count=exact` request header.
 *
 * This strategy expects the consumer to pass the array body as `response`
 * (or a plain object with `readPath(response, options.data)` pointing at the array)
 * and the response headers via the optional `headers` bag. See
 * `Paginator.paginate()` for the call-site shape.
 *
 * The header places the rows but does not state the page size, and the
 * span of a short last page (`30-33/34` at limit 10) is not it. The page
 * size is therefore the requested `limit`, which `Paginator` passes; the
 * span stands in only when no limit is given, and is right on every page
 * but a short last one. An empty collection, whose header gives `*` for
 * the range and `0` for the total, reads as one page holding no rows.
 *
 * A server that caps rows below the limit (`db-max-rows`; Supabase's Max
 * Rows, 1000 by default) returns fewer rows than were asked for on every
 * page, and the next page's offset skips the rest. Keep the limit at or
 * below the cap.
 *
 * @see https://postgrest.org/en/stable/references/api/pagination_count.html
 */
export class PostgrestResponseStrategy implements IResponseStrategy {
  private static readonly _contentRangeHeader = 'Content-Range';
  private static readonly _contentRangeRegex = /^(?:(\d+)-(\d+)|\*)\/(\*|\d+)$/;

  /**
   * Extract `{from, to, total}` from a PostgREST `Content-Range` value
   *
   * Expected format: `<from>-<to>/<total|*>`, with `*` in place of the
   * range when the page holds no rows, as on an empty collection. Any other
   * shape returns an empty object; `*` as the total yields
   * `total: undefined`.
   *
   * @param value - Raw header value (possibly null/undefined)
   * @returns Parsed integers; missing fields indicate an unparseable header
   */
  private _parseContentRange(value: string | null | undefined): ContentRangeParts {
    if (!value) {
      return {};
    }

    const match = value.trim().match(PostgrestResponseStrategy._contentRangeRegex);

    if (!match) {
      return {};
    }

    const total = match[3] === '*' ? undefined : parseInt(match[3], 10);

    // `*` in place of the range: an empty page places no rows
    if (match[1] === undefined) {
      return { total };
    }

    return { from: parseInt(match[1], 10), to: parseInt(match[2], 10), total };
  }

  /**
   * Parse a PostgREST response into a typed PaginatedCollection
   *
   * @param response - The raw response. Either the array body directly, or
   * an object with the array at `readPath(response, options.data)`.
   * @param options - The response key configuration (only `options.data` is
   * consulted; all pagination metadata comes from the Content-Range header).
   * @param headers - Optional HTTP response headers. The `Content-Range`
   * header drives page/total derivation; omission is tolerated and yields
   * a collection with `undefined` bounds (auto-sync will leave
   * `isLastPageKnown` at `false`).
   * @param limit - The page size the request asked for. Without it, the
   * span of the range stands in, which misplaces a short last page.
   * @returns A typed PaginatedCollection instance
   */
  public paginate<T extends PaginatedObject>(
    response: RawResponse,
    options: ResponseOptions,
    headers?: HeaderBag,
    limit?: number
  ): PaginatedCollection<T> {
    // Body may be a bare array or an envelope with the array at options.data
    const data = (Array.isArray(response) ? response : readPath(response, options.data)) as T[];

    // Header-driven pagination metadata
    const contentRange = readHeader(headers, PostgrestResponseStrategy._contentRangeHeader);
    const { from, to, total } = this._parseContentRange(contentRange);

    // The requested limit is the page size; the span is, too, on every page but a short last one
    const span = from !== undefined && to !== undefined ? to - from + 1 : undefined;
    const perPage = limit !== undefined && limit > 0 ? limit : span;

    // Page is 1-based in the store; PostgREST reports 0-based indices. An empty collection is one page
    const page = perPage && from !== undefined ? Math.floor(from / perPage) + 1 : 1;
    const lastPage =
      total !== undefined && perPage ? Math.max(Math.ceil(total / perPage), 1) : undefined;

    // Library convention: from/to are 1-indexed and inclusive; PostgREST emits 0-indexed
    const fromOneIndexed = from !== undefined ? from + 1 : undefined;
    const toOneIndexed = to !== undefined ? to + 1 : undefined;

    // PostgREST does not emit page URLs, so prev/next/first/last URLs stay undefined
    return new PaginatedCollection<T>(
      data,
      page,
      fromOneIndexed,
      toOneIndexed,
      total,
      perPage,
      undefined,
      undefined,
      lastPage
    );
  }
}
