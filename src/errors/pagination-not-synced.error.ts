import { QubeeError } from './qubee.error';

/**
 * Thrown when a pagination helper that needs `state.lastPage` is called
 * before `Paginator.paginate()` has ever synced a value.
 *
 * Examples: `QueryBuilder.lastPage()`, `QueryBuilder.totalPages()`.
 *
 * Safe-for-templates predicates (`isLastPage`, `hasNextPage`, etc.) do not
 * throw and return conservative defaults instead.
 */
export class PaginationNotSyncedError extends QubeeError {
  /**
   * @param action - Short imperative describing what the caller was trying
   * to do (e.g. "navigate to last page", "read totalPages"). Surfaced in
   * the error message so the cause is obvious at the call site.
   */
  constructor(action: string) {
    super(
      'PAGINATION_NOT_SYNCED',
      `Cannot ${action}: no paginated response has been synced yet. Call Paginator.paginate() at least once first.`
    );
  }
}
