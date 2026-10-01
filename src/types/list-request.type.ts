import type { PaginatedCollection } from '../models/paginated-collection';
import type { HeaderBag } from './header-bag.type';
import type { PaginatedObject } from './paginated-object.type';
import type { RawResponse } from './raw-response.type';

/**
 * Everything needed to fetch one page of a list and read the answer, as
 * `buildListRequest()` builds it. The app performs the I/O.
 *
 * `[uri, headers]` is a complete cache key — TanStack Query's `queryKey`,
 * SWR's `key`.
 */
export type ListRequest = {
  /**
   * Headers the driver wants on the request — PostgREST's `Range` in RANGE
   * mode — or `null`.
   */
  readonly headers: Readonly<Record<string, string>> | null;

  /**
   * Parse a response body with the paginator of the instance that built `uri`.
   *
   * @param response - The body, as the backend returned it
   * @param headers - The response headers, for drivers that page over them
   * @returns The rows and the page metadata
   */
  paginate<T extends PaginatedObject>(
    response: RawResponse,
    headers?: HeaderBag
  ): PaginatedCollection<T>;

  /**
   * The API URI, starting with the base URL when the list's qubee config has one.
   */
  readonly uri: string;
};
