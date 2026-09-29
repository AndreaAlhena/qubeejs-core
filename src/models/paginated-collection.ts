import type { Normalized } from '../types/normalized.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { PaginatedResult } from '../types/paginated-result.type';

import { KeyNotFoundError } from '../errors/key-not-found.error';

/**
 * One page of rows plus the pagination metadata the backend reported.
 *
 * Built by a response strategy — usually through `Paginator.paginate()` —
 * rather than by hand. Metadata a backend does not report is `undefined`.
 * Call `toPlain()` for a plain-object copy.
 */
export class PaginatedCollection<T extends PaginatedObject> {
  /**
   * @param data - The rows on this page
   * @param page - The current page number, 1-based
   * @param from - Position of the first row on this page within the whole result set, 1-based
   * @param to - Position of the last row on this page within the whole result set, 1-based
   * @param total - Number of rows in the whole result set
   * @param perPage - Number of rows per page
   * @param prevPageUrl - URL of the previous page, when the backend reports links
   * @param nextPageUrl - URL of the next page, when the backend reports links
   * @param lastPage - Number of the last page
   * @param firstPageUrl - URL of the first page, when the backend reports links
   * @param lastPageUrl - URL of the last page, when the backend reports links
   */
  constructor(
    public data: T[],
    public readonly page: number,
    public readonly from?: number,
    public readonly to?: number,
    public readonly total?: number,
    public readonly perPage?: number,
    public readonly prevPageUrl?: string,
    public readonly nextPageUrl?: string,
    public readonly lastPage?: number,
    public readonly firstPageUrl?: string,
    public readonly lastPageUrl?: string
  ) {
    //
  }

  /**
   * Normalize the collection to a paginated list of ids for state-managed applications.
   *
   * This method returns a single key object, where the key is the page number and the associated value is
   * an array of ids. Each id is fetched by the collection items, looking up for the "id" key. If an id is supplied
   * to this method, it will be used instead of the default "id" key.
   *
   * Please note that in case the key doesn't exist in the collection's item, a KeyNotFoundError is thrown
   *
   * @param k A key to use instead of the default "id": this will be searched inside each element of the collection
   * @returns []
   * @throws KeyNotFoundItem
   */
  public normalize(selector?: ((item: T) => number | string) | string): Normalized {
    const key = typeof selector === 'string' && selector !== '' ? selector : undefined;

    const read = (item: T): number | string => {
      if (typeof selector === 'function') {
        return selector(item);
      }

      const source = key !== undefined && key in item ? key : 'id';
      const value = Object.hasOwn(item, source)
        ? (item as Record<string, unknown>)[source]
        : undefined;

      if (typeof value !== 'number' && typeof value !== 'string') {
        throw new KeyNotFoundError(key ?? 'id');
      }

      return value;
    };

    return { [this.page]: this.data.map(read) } as Normalized;
  }

  /**
   * Copy the page into a plain object that survives serialisation.
   *
   * React Server Components refuse to pass class instances to Client
   * Components, and `JSON.stringify` drops `undefined` values; the result
   * avoids both. Every pagination field is present, `null` when the backend
   * did not report it. `data` is a new array holding the same rows, which
   * are passed through unchanged, so the result is JSON-safe exactly when
   * they are. The collection itself is not modified.
   *
   * ```ts
   * const page = paginator.paginate<Article>(body).toPlain();
   * // { data: [...], page: 2, total: 57, nextPageUrl: null, ... }
   * ```
   *
   * @returns The rows and every pagination field as a plain object
   */
  public toPlain(): PaginatedResult<T> {
    return {
      data: [...this.data],
      firstPageUrl: this.firstPageUrl ?? null,
      from: this.from ?? null,
      lastPage: this.lastPage ?? null,
      lastPageUrl: this.lastPageUrl ?? null,
      nextPageUrl: this.nextPageUrl ?? null,
      page: this.page,
      perPage: this.perPage ?? null,
      prevPageUrl: this.prevPageUrl ?? null,
      to: this.to ?? null,
      total: this.total ?? null,
    };
  }
}
