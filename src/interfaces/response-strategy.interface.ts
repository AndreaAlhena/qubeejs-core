import type { PaginatedCollection } from '../models/paginated-collection';
import type { ResponseOptions } from '../models/response-options';
import type { HeaderBag } from '../types/header-bag.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { RawResponse } from '../types/raw-response.type';

/**
 * Strategy interface for parsing paginated API responses
 *
 * Each driver implements this interface to parse responses
 * from the corresponding backend format into a PaginatedCollection.
 */
export interface IResponseStrategy {
  /**
   * Parse a raw API response into a typed PaginatedCollection
   *
   * @param response - The raw API response object (body). For drivers that
   * emit a bare array body (e.g. PostgREST), pass the array here.
   * @param options - The response key name configuration
   * @param headers - Optional HTTP response headers. Drivers that carry
   * pagination metadata in headers (PostgREST's `Content-Range`) read from
   * this bag; body-only drivers ignore it. Accepts anything with a `.get()`
   * accessor (`HttpHeaders`, `Headers`) or a plain `Record<string, string>`.
   * @param limit - Optional page size the request asked for; `Paginator.paginate()`
   * passes the store's `limit`. Drivers whose response places the rows but does not
   * state the page size (PostgREST's `Content-Range`) need it to place a short last
   * page; the rest ignore it.
   * @returns A typed PaginatedCollection instance
   */
  paginate<T extends PaginatedObject>(
    response: RawResponse,
    options: ResponseOptions,
    headers?: HeaderBag,
    limit?: number
  ): PaginatedCollection<T>;
}
