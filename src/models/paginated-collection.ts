import type { Normalized } from '../types/normalized.type';
import type { PaginatedObject } from '../types/paginated-object.type';

import { KeyNotFoundError } from '../errors/key-not-found.error';

export class PaginatedCollection<T extends PaginatedObject> {
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
}
