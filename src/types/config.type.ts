import type { Driver } from './driver.type';
import type { PaginationConfig } from './pagination-config.type';
import type { PaginationMode } from './pagination-mode.type';
import type { QueryBuilderConfig } from './query-builder-config.type';

/**
 * Driver configuration that names the driver by its id
 *
 * The id-based counterpart of {@link QubeeConfig}, for configuration that
 * arrives as a string: resolve the driver with `DRIVERS[config.driver]`.
 * Allows configuring the pagination driver and customizing both request
 * query parameter keys and response field keys.
 *
 * @example
 * ```typescript
 * const config: Config = {
 *   driver: DriverEnum.NESTJS,
 *   request: { filters: 'filter', sort: 'sortBy' },
 *   response: { data: 'data' }
 * };
 * ```
 */
export type Config = {
  /** The pagination driver to use */
  driver: Driver;
  /**
   * Wire-level pagination mechanism. Defaults to `PaginationModeEnum.QUERY`
   * when omitted. Currently honoured only by the PostgREST driver; other
   * drivers ignore it.
   */
  pagination?: PaginationMode;
  /** Custom key names for request query parameters */
  request?: QueryBuilderConfig;
  /** Custom key names for response field mapping */
  response?: PaginationConfig;
};
