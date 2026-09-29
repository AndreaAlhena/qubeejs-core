import type { QueryBuilderOptions } from '../models/query-builder-options';
import type { QueryBuilderState } from '../types/query-builder-state.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';

/**
 * Strategy interface for building request URIs
 *
 * Each driver implements this interface to produce URIs
 * in the format expected by the corresponding backend.
 */
export interface IRequestStrategy {
  /**
   * Capability flags declared by this driver
   *
   * Read by `QueryBuilder` to gate feature methods (e.g. `addFilter`)
   * without hardcoding `DriverEnum` checks. Each strategy returns a
   * static, immutable capability map.
   */
  readonly capabilities: StrategyCapabilities;

  /**
   * Build a URI string from the given query builder state
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @returns The composed URI string
   */
  buildUri(state: QueryBuilderState, options: QueryBuilderOptions): string;

  /**
   * Compute HTTP request headers carrying pagination metadata
   *
   * Honoured only by drivers that support header-based pagination (the
   * PostgREST driver configured with `PaginationModeEnum.RANGE`). All
   * other drivers should return `null` — which is also the default when
   * a driver does not override this method.
   *
   * When the method returns a non-null object, this strategy's `buildUri`
   * is expected to have already omitted URL-level pagination params for
   * that request; the consumer reads the headers through
   * `QueryBuilder.paginationHeaders()` and merges them into the HTTP call
   * so the server knows the requested range.
   *
   * @param state - The current query builder state
   * @returns A map of header name → value, or `null` when not applicable
   */
  buildPaginationHeaders?(state: QueryBuilderState): Record<string, string> | null;

  /**
   * Assert that the given limit value is valid for this driver
   *
   * Validation is driver-scoped because the accepted range differs by
   * backend: nestjs-paginate treats `-1` as a "fetch all" sentinel, while
   * other backends (Laravel, Spatie, JSON:API) require a positive integer.
   *
   * @param limit - The limit value to validate
   * @throws {import('../errors/invalid-limit.error').InvalidLimitError} If the value is not accepted by the driver
   */
  validateLimit(limit: number): void;
}
