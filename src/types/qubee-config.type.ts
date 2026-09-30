import type { PaginationModeEnum } from '../enums/pagination-mode.enum';
import type { DriverDefinition } from './driver-definition.type';
import type { PaginationConfig } from './pagination-config.type';
import type { QueryBuilderConfig } from './query-builder-config.type';

/**
 * Options for {@link createQubee}.
 */
export type QubeeConfig = {
  /**
   * Prepended to every generated URI, as `QueryBuilder.setBaseUrl()` would —
   * `https://example.com/api` turns `/articles?…` into
   * `https://example.com/api/articles?…`. Omit it for root-relative URIs.
   * `reset()` clears it.
   */
  baseUrl?: string;

  /**
   * The driver to use, as its exported definition — `STRAPI_DRIVER`, say.
   *
   * A definition rather than an id, deliberately: it keeps `createQubee` from
   * reaching into `DRIVERS`, which would bundle all eighteen drivers into every
   * consumer. To choose at runtime, import the registry yourself and pass
   * `DRIVERS[id]`, so the cost is visible at your own import site.
   */
  driver: DriverDefinition;

  /**
   * Wire-level pagination mechanism. Only PostgREST honours it today; every
   * other driver ignores the setting.
   */
  pagination?: PaginationModeEnum;

  /**
   * Override the query parameter names the request strategy emits.
   */
  request?: QueryBuilderConfig;

  /**
   * Override where the response strategy looks for pagination metadata.
   */
  response?: PaginationConfig;
};
