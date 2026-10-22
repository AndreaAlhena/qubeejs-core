import type { IResponseStrategy } from '../interfaces/response-strategy.interface';
import type { PaginatedCollection } from '../models/paginated-collection';
import type { HeaderBag } from '../types/header-bag.type';
import type { PaginatedObject } from '../types/paginated-object.type';
import type { RawResponse } from '../types/raw-response.type';
import type { QubeeStore } from './qubee-store';

import { ResponseOptions } from '../models/response-options';

/**
 * Parses a backend response into a {@link PaginatedCollection} and syncs the
 * result back into the store.
 *
 * This is the half of the library that closes the loop: {@link QueryBuilder}
 * produces a URI, the consumer fetches it, and `paginate()` turns the body
 * into rows plus page metadata — recording the page and last page so that
 * `hasNextPage()`, `lastPage()` and `totalPages()` stop throwing
 * `PaginationNotSyncedError`.
 *
 * It performs no I/O of its own. Fetch however you like and hand the body back.
 */
export class Paginator {
  /**
   * Resolved response key names for the active driver.
   */
  private readonly _options: ResponseOptions;

  /**
   * The driver strategy that understands this backend's envelope.
   */
  private readonly _responseStrategy: IResponseStrategy;

  /**
   * The store kept in sync with each parsed response.
   */
  private readonly _store: QubeeStore;

  /**
   * @param store - The store to sync page metadata into
   * @param responseStrategy - Driver strategy that parses the response envelope
   * @param options - Response key names for the active driver
   */
  constructor(
    store: QubeeStore,
    responseStrategy: IResponseStrategy,
    options: ResponseOptions = new ResponseOptions({})
  ) {
    this._options = options;
    this._responseStrategy = responseStrategy;
    this._store = store;
  }

  /**
   * Parse a response body and sync its pagination state into the store.
   *
   * `lastPage` is only synced when the backend actually reported a usable
   * value — a driver that cannot know the total (a bare cursor API, say)
   * leaves the store's `isLastPageKnown` flag false rather than guessing.
   *
   * The store's `limit` goes to the strategy as the requested page size, so
   * a driver that reports only row positions (PostgREST) places a short last
   * page on the page that was asked for rather than one sized by its rows.
   *
   * @param response - The raw response body, as returned by the backend
   * @param headers - Response headers, for drivers that paginate over them
   * @returns The parsed rows and page metadata
   */
  public paginate<T extends PaginatedObject>(
    response: RawResponse,
    headers?: HeaderBag
  ): PaginatedCollection<T> {
    const collection = this._responseStrategy.paginate<T>(
      response,
      this._options,
      headers,
      this._store.getSnapshot().limit
    );

    this._store.page = collection.page;

    if (
      typeof collection.lastPage === 'number' &&
      Number.isInteger(collection.lastPage) &&
      collection.lastPage > 0
    ) {
      this._store.syncLastPage(collection.lastPage);
    }

    return collection;
  }
}
