/**
 * Public API of `@qubeejs/core`.
 *
 * Named re-exports only — never `export *`. A barrel that re-exports blindly
 * cannot be reviewed, and an omission is invisible until someone reports it.
 *
 * Note on bundle size: `DRIVERS` reaches every driver by construction. A
 * consumer that knows its backend at build time should import that driver's
 * constant instead and let the other seventeen tree-shake.
 */

// Query builder configuration
export type { RawResponse } from './types/raw-response.type';
export type { QueryValue } from './types/query-value.type';
export type { QubeeErrorCode } from './types/qubee-error-code.type';
export type { Qubee } from './types/qubee.type';
export type { QubeeConfig } from './types/qubee-config.type';
export type { Config } from './types/config.type';
export type { DriverDefinition } from './types/driver-definition.type';
export type { DriverId } from './types/driver-id.type';
export type { Driver } from './types/driver.type';
export type { Embedded } from './types/embedded.type';
export type { Fields } from './types/fields.type';
export type { FilterOperator } from './types/filter-operator.type';
export type { Filters } from './types/filters.type';
export type { HeaderBag } from './types/header-bag.type';
export type { Normalized } from './types/normalized.type';
export type { OperatorFilter } from './types/operator-filter.type';
export type { PaginatedObject } from './types/paginated-object.type';
export type { PaginatedResult } from './types/paginated-result.type';
export type { PaginationConfig } from './types/pagination-config.type';
export type { PaginationMode } from './types/pagination-mode.type';
export type { Params } from './types/params.type';
export type { QueryBuilderConfig } from './types/query-builder-config.type';
export type { QueryBuilderState } from './types/query-builder-state.type';
export type { SortDirection } from './types/sort-direction.type';
export type { Sort } from './types/sort.type';
export type { StrategyCapabilities } from './types/strategy-capabilities.type';

// Enums
export { DriverEnum } from './enums/driver.enum';
export { FilterOperatorEnum } from './enums/filter-operator.enum';
export { PaginationModeEnum } from './enums/pagination-mode.enum';
export { SortEnum } from './enums/sort.enum';

// Strategy contracts
export type { IRequestStrategy } from './interfaces/request-strategy.interface';
export type { IResponseStrategy } from './interfaces/response-strategy.interface';

// Models
export { PaginatedCollection } from './models/paginated-collection';
export { QueryBuilderOptions } from './models/query-builder-options';
export {
  ApiPlatformResponseOptions,
  DirectusResponseOptions,
  DrfResponseOptions,
  FeathersResponseOptions,
  JsonApiResponseOptions,
  JsonServerResponseOptions,
  NestjsResponseOptions,
  NestjsxCrudResponseOptions,
  OdataResponseOptions,
  PayloadResponseOptions,
  PocketbaseResponseOptions,
  ResponseOptions,
  SieveResponseOptions,
  SpringResponseOptions,
  StrapiResponseOptions,
} from './models/response-options';

// Strategies — abstract bases (extend these to author a driver)
export { AbstractDotPathResponseStrategy } from './strategies/abstract-dot-path-response.strategy';
export { AbstractFlatResponseStrategy } from './strategies/abstract-flat-response.strategy';
export { AbstractRequestStrategy } from './strategies/abstract-request.strategy';
export { ApiPlatformRequestStrategy } from './strategies/api-platform-request.strategy';
export { ApiPlatformResponseStrategy } from './strategies/api-platform-response.strategy';
export { DirectusRequestStrategy } from './strategies/directus-request.strategy';
export { DirectusResponseStrategy } from './strategies/directus-response.strategy';
export { DrfRequestStrategy } from './strategies/drf-request.strategy';
export { DrfResponseStrategy } from './strategies/drf-response.strategy';
export { FeathersRequestStrategy } from './strategies/feathers-request.strategy';
export { FeathersResponseStrategy } from './strategies/feathers-response.strategy';
export { JsonApiRequestStrategy } from './strategies/json-api-request.strategy';
export { JsonApiResponseStrategy } from './strategies/json-api-response.strategy';
export { JsonServerRequestStrategy } from './strategies/json-server-request.strategy';
export { JsonServerResponseStrategy } from './strategies/json-server-response.strategy';
export { LaravelRequestStrategy } from './strategies/laravel-request.strategy';
export { LaravelResponseStrategy } from './strategies/laravel-response.strategy';
export { NestjsRequestStrategy } from './strategies/nestjs-request.strategy';
export { NestjsResponseStrategy } from './strategies/nestjs-response.strategy';
export { NestjsxCrudRequestStrategy } from './strategies/nestjsx-crud-request.strategy';
export { NestjsxCrudResponseStrategy } from './strategies/nestjsx-crud-response.strategy';
export { OdataRequestStrategy } from './strategies/odata-request.strategy';
export { OdataResponseStrategy } from './strategies/odata-response.strategy';
export { PayloadRequestStrategy } from './strategies/payload-request.strategy';
export { PayloadResponseStrategy } from './strategies/payload-response.strategy';
export { PocketbaseRequestStrategy } from './strategies/pocketbase-request.strategy';
export { PocketbaseResponseStrategy } from './strategies/pocketbase-response.strategy';
export { PostgrestRequestStrategy } from './strategies/postgrest-request.strategy';
export { PostgrestResponseStrategy } from './strategies/postgrest-response.strategy';
export { SieveRequestStrategy } from './strategies/sieve-request.strategy';
export { SieveResponseStrategy } from './strategies/sieve-response.strategy';
export { SpatieRequestStrategy } from './strategies/spatie-request.strategy';
export { SpatieResponseStrategy } from './strategies/spatie-response.strategy';
export { SpringRequestStrategy } from './strategies/spring-request.strategy';
export { SpringResponseStrategy } from './strategies/spring-response.strategy';
export { StrapiRequestStrategy } from './strategies/strapi-request.strategy';
export { StrapiResponseStrategy } from './strategies/strapi-response.strategy';
export { WordpressRequestStrategy } from './strategies/wordpress-request.strategy';
export { WordpressResponseStrategy } from './strategies/wordpress-response.strategy';

// Services
export { QueryBuilder } from './services/query-builder';
export { createQubee } from './services/create-qubee';
export { Paginator } from './services/paginator';
export { QubeeStore } from './services/qubee-store';

// Drivers
export { API_PLATFORM_DRIVER } from './drivers/api-platform.driver';
export { DIRECTUS_DRIVER } from './drivers/directus.driver';
export { DRF_DRIVER } from './drivers/drf.driver';
export { DRIVERS } from './drivers/driver-registry';
export { FEATHERS_DRIVER } from './drivers/feathers.driver';
export { JSON_API_DRIVER } from './drivers/json-api.driver';
export { JSON_SERVER_DRIVER } from './drivers/json-server.driver';
export { LARAVEL_DRIVER } from './drivers/laravel.driver';
export { NESTJS_DRIVER } from './drivers/nestjs.driver';
export { NESTJSX_CRUD_DRIVER } from './drivers/nestjsx-crud.driver';
export { ODATA_DRIVER } from './drivers/odata.driver';
export { PAYLOAD_DRIVER } from './drivers/payload.driver';
export { POCKETBASE_DRIVER } from './drivers/pocketbase.driver';
export { POSTGREST_DRIVER } from './drivers/postgrest.driver';
export { SIEVE_DRIVER } from './drivers/sieve.driver';
export { SPATIE_DRIVER } from './drivers/spatie.driver';
export { SPRING_DRIVER } from './drivers/spring.driver';
export { STRAPI_DRIVER } from './drivers/strapi.driver';
export { WORDPRESS_DRIVER } from './drivers/wordpress.driver';

// Errors
export { QubeeError } from './errors/qubee.error';
export { UnsupportedCapabilityError } from './errors/unsupported-capability.error';
export { InvalidFilterOperatorValueError } from './errors/invalid-filter-operator-value.error';
export { InvalidLimitError } from './errors/invalid-limit.error';
export { InvalidPageNumberError } from './errors/invalid-page-number.error';
export { InvalidResourceNameError } from './errors/invalid-resource-name.error';
export { KeyNotFoundError } from './errors/key-not-found.error';
export { PaginationNotSyncedError } from './errors/pagination-not-synced.error';
export { ParamCollisionError } from './errors/param-collision.error';
export { UnselectableModelError } from './errors/unselectable-model.error';
export { UnsupportedEmbeddedError } from './errors/unsupported-embedded.error';
export { UnsupportedFieldSelectionError } from './errors/unsupported-field-selection.error';
export { UnsupportedFilterOperatorError } from './errors/unsupported-filter-operator.error';
export { UnsupportedFilterError } from './errors/unsupported-filter.error';
export { UnsupportedIncludesError } from './errors/unsupported-includes.error';
export { UnsupportedSearchError } from './errors/unsupported-search.error';
export { UnsupportedSelectError } from './errors/unsupported-select.error';
export { UnsupportedSortError } from './errors/unsupported-sort.error';

// Utilities
export { readHeader } from './utils/read-header';
export { readNumber, readPath, readRows, readString } from './utils/read-path';
export { stringify } from './utils/stringify';

// Lists — page URL ⇄ typed state ⇄ API request
export type { BooleanParamOptions } from './types/boolean-param-options.type';
export type { EnumParamOptions } from './types/enum-param-options.type';
export type { EnumValues } from './types/enum-values.type';
export type { IntegerParamOptions } from './types/integer-param-options.type';
export type { ListDefinition } from './types/list-definition.type';
export type { ListParam } from './types/list-param.type';
export type { ListParamOptions } from './types/list-param-options.type';
export type { ListParams } from './types/list-params.type';
export type { ListState } from './types/list-state.type';
export type { ParamsState } from './types/params-state.type';
export type { SearchParamsInput } from './types/search-params-input.type';
export type { SortParam } from './types/sort-param.type';
export type { SortParamOptions } from './types/sort-param-options.type';
export type { StringParamOptions } from './types/string-param-options.type';
export { booleanParam } from './params/boolean-param';
export { enumParam } from './params/enum-param';
export { integerParam } from './params/integer-param';
export { listParam } from './params/list-param';
export { sortParam } from './params/sort-param';
export { stringParam } from './params/string-param';
export { toSearchParams } from './utils/to-search-params';
