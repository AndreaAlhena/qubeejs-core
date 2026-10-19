import type { IResponseStrategy } from '../interfaces/response-strategy.interface';
import type { ResponseOptions } from '../models/response-options';
import type { HeaderBag } from '../types/header-bag.type';
import type { LinkRelations } from '../types/link-relations.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { RawResponse } from '../types/raw-response.type';

import { PaginatedCollection } from '../models/paginated-collection';
import { parseLinkHeader } from '../utils/parse-link-header';
import { readHeader } from '../utils/read-header';
import { readRows } from '../utils/read-path';

/**
 * Response strategy for the Ransack (Rails) driver
 *
 * Ransack only filters and sorts; the response is shaped by the pagination
 * gem, which sends a bare-array body and the metadata in headers. Both
 * common gems are read without configuration:
 *
 * | | Pagy (`headers_hash`) | Kaminari + api-pagination |
 * | --- | --- | --- |
 * | total | `total-count` | `total` |
 * | page size | `page-limit` | `per-page` |
 * | current page | `current-page` | `page` (off by default) |
 * | last page | `total-pages` | `link` `rel="last"`, else total ÷ page size |
 *
 * The Pagy names come from `RansackResponseOptions` and can be renamed
 * through `PaginationConfig`; a configured name is read first, then
 * api-pagination's. Navigation URLs come from the `link` header (`first`,
 * `prev` — also `rel="previous"`, Pagy before 43.7 — `next`, `last`).
 *
 * Whatever no header names is derived:
 * - `currentPage`: the `prev` link's `page` param + 1, else the `next`
 *   link's − 1, else **1**
 * - `perPage`: the row count, whenever a `next` link proves the page full
 * - `lastPage`: the `last` link's `page` param, else total ÷ page size
 *   rounded up (never below 1)
 * - `from`/`to`: from the page and page size, or counted back from the
 *   total on the last page; `undefined` on an empty page
 *
 * Header names are written lower-case, as Rack 3 and HTTP/2 send them. A
 * bag with a `get()` accessor (the DOM `Headers`, Angular's `HttpHeaders`)
 * matches any casing; a plain object must use the casing of its keys.
 * Cross-origin, the browser exposes these headers only when the server
 * lists them in `Access-Control-Expose-Headers`.
 *
 * @see https://github.com/ddnexus/pagy/blob/master/docs/toolbox/helpers/headers_hash.md
 * @see https://github.com/davidcelis/api-pagination
 */
export class RansackResponseStrategy implements IResponseStrategy {
  private static readonly _linkHeader = 'link';
  private static readonly _pageHeader = 'page';
  private static readonly _pageParamRegex = /[?&]page=(\d+)/;
  private static readonly _perPageHeader = 'per-page';
  private static readonly _totalHeader = 'total';

  /**
   * Read the first of the named headers that holds a count
   *
   * Empty names are skipped, so a header disabled with `''` is never
   * looked up (the DOM `Headers.get('')` throws).
   *
   * @param headers - The response headers (possibly undefined)
   * @param names - Header names, in order of preference
   * @returns The first parseable count, or undefined
   */
  private _count(headers: HeaderBag | undefined, ...names: string[]): number | undefined {
    for (const name of names) {
      const count = name ? this._parseCount(readHeader(headers, name)) : undefined;

      if (count !== undefined) {
        return count;
      }
    }

    return undefined;
  }

  /**
   * Derive the current page when no header names it
   *
   * @param links - The parsed `link` header
   * @returns The 1-indexed current page
   */
  private _deriveCurrentPage(links: LinkRelations): number {
    const prevPage = this._pageParam(links.prev);

    if (prevPage !== undefined) {
      return prevPage + 1;
    }

    const nextPage = this._pageParam(links.next);

    return nextPage === undefined ? 1 : Math.max(nextPage - 1, 1);
  }

  /**
   * Derive `from`, the 1-indexed position of the first row on this page
   *
   * @param count - The number of rows on this page
   * @param page - The current page
   * @param next - The `rel="next"` URL, if present
   * @param perPage - The page size, if known
   * @param total - The total row count, if known
   * @returns The position, or undefined on an empty page or without enough to go on
   */
  private _deriveFrom(
    count: number,
    page: number,
    next?: string,
    perPage?: number,
    total?: number
  ): number | undefined {
    if (!count) {
      return undefined;
    }

    if (perPage) {
      return (page - 1) * perPage + 1;
    }

    if (next === undefined && total !== undefined) {
      return total - count + 1;
    }

    return undefined;
  }

  /**
   * Derive the last page when no header names it
   *
   * @param links - The parsed `link` header
   * @param perPage - The page size, if known
   * @param total - The total row count, if known
   * @returns The last page, or undefined without a `last` link or a total and page size
   */
  private _deriveLastPage(
    links: LinkRelations,
    perPage?: number,
    total?: number
  ): number | undefined {
    const lastLinkPage = this._pageParam(links.last);

    if (lastLinkPage !== undefined) {
      return lastLinkPage;
    }

    return total !== undefined && perPage ? Math.max(Math.ceil(total / perPage), 1) : undefined;
  }

  /**
   * Extract the `page` query param from a navigation URL
   *
   * @param url - The URL to inspect (possibly undefined)
   * @returns The page number, or undefined (Pagy's `first` link carries none)
   */
  private _pageParam(url?: string): number | undefined {
    const match = url?.match(RansackResponseStrategy._pageParamRegex);

    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Parse a non-negative integer count header value
   *
   * @param value - Raw header value (possibly null)
   * @returns The parsed count, or undefined when absent or unparseable
   */
  private _parseCount(value: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = parseInt(value.trim(), 10);

    return Number.isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse a Rails response paginated by Pagy or Kaminari into a typed
   * PaginatedCollection
   *
   * @param response - The raw response: the bare array, or an object with
   * the array at `options.data`
   * @param options - The response configuration; `currentPage`, `lastPage`,
   * `perPage` and `total` name headers, `data` a body path
   * @param headers - The HTTP response headers; omission is tolerated and
   * yields a collection with `undefined` bounds
   * @returns A typed PaginatedCollection instance
   */
  public paginate<T extends PaginatedObject>(
    response: RawResponse,
    options: ResponseOptions,
    headers?: HeaderBag
  ): PaginatedCollection<T> {
    const data = readRows<T>(response, options.data);
    const links = parseLinkHeader(readHeader(headers, RansackResponseStrategy._linkHeader));

    const total = this._count(headers, options.total, RansackResponseStrategy._totalHeader);
    const page =
      this._count(headers, options.currentPage, RansackResponseStrategy._pageHeader) ??
      this._deriveCurrentPage(links);
    const perPage =
      this._count(headers, options.perPage, RansackResponseStrategy._perPageHeader) ??
      (links.next !== undefined && data.length ? data.length : undefined);
    const lastPage =
      this._count(headers, options.lastPage) ?? this._deriveLastPage(links, perPage, total);

    const from = this._deriveFrom(data.length, page, links.next, perPage, total);
    const to = from === undefined ? undefined : from + data.length - 1;

    return new PaginatedCollection(
      data,
      page,
      from,
      to,
      total,
      perPage,
      links.prev,
      links.next,
      lastPage,
      links.first,
      links.last
    );
  }
}
