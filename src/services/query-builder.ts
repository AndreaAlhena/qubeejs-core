// Enums
import type { FilterOperatorEnum } from '../enums/filter-operator.enum';
import type { SortEnum } from '../enums/sort.enum';
// Contracts
import type { IRequestStrategy } from '../interfaces/request-strategy.interface';
// Types
import type { Driver } from '../types/driver.type';
import type { Fields } from '../types/fields.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';
// Services
import type { QubeeStore } from './qubee-store';

// Errors
import { InvalidPageNumberError } from '../errors/invalid-page-number.error';
import { PaginationNotSyncedError } from '../errors/pagination-not-synced.error';
import { UnsupportedEmbeddedError } from '../errors/unsupported-embedded.error';
import { UnsupportedFieldSelectionError } from '../errors/unsupported-field-selection.error';
import { UnsupportedFilterOperatorError } from '../errors/unsupported-filter-operator.error';
import { UnsupportedFilterError } from '../errors/unsupported-filter.error';
import { UnsupportedIncludesError } from '../errors/unsupported-includes.error';
import { UnsupportedSearchError } from '../errors/unsupported-search.error';
import { UnsupportedSelectError } from '../errors/unsupported-select.error';
import { UnsupportedSortError } from '../errors/unsupported-sort.error';
// Models
import { QueryBuilderOptions } from '../models/query-builder-options';

/**
 * Fluent, capability-checked builder for one driver's query URIs.
 *
 * Every mutator writes to the {@link QubeeStore} it was given and returns
 * `this`, so a whole query is one chain; `generateUri()` turns the current
 * state into a URI through the driver's request strategy. A method the
 * driver cannot express throws at the call site instead of emitting a
 * parameter the backend would ignore.
 */
export class QueryBuilder {
  /**
   * The active driver, recorded solely so capability errors can name it.
   */
  private readonly _driver?: Driver;

  /**
   * Resolved query parameter key name options
   */
  private readonly _options: QueryBuilderOptions;

  /**
   * The request strategy that builds URIs for the active driver
   */
  private readonly _requestStrategy: IRequestStrategy;

  /**
   * The state container backing this builder.
   */
  private readonly _store: QubeeStore;

  /**
   * @param store - State container holding the query being built
   * @param requestStrategy - Driver strategy that turns state into a URI
   * @param options - Query parameter key names for the active driver
   * @param driver - Active driver id, used to name it in capability errors
   */
  constructor(
    store: QubeeStore,
    requestStrategy: IRequestStrategy,
    options: QueryBuilderOptions = new QueryBuilderOptions({}),
    driver?: Driver
  ) {
    this._driver = driver;
    this._options = options;
    this._requestStrategy = requestStrategy;
    this._store = store;
  }

  /**
   * Assert that the active strategy declares support for a capability
   *
   * Reads from `IRequestStrategy.capabilities` rather than the driver
   * enum so adding a new driver only requires declaring its capability
   * map — this method does not change.
   *
   * @param flag - The capability key to check
   * @param error - The error to throw if the capability is unsupported
   * @throws The provided error if the active strategy lacks the capability
   */
  private _assertCapability(flag: keyof StrategyCapabilities, error: Error): void {
    if (!this._requestStrategy.capabilities[flag]) {
      throw error;
    }
  }

  /**
   * Add an embedded resource to the select statement (PostgREST only)
   *
   * Splices `relation(col1,col2)` into the single `select=` query
   * parameter alongside flat columns from `addSelect`. Omit the columns
   * to project all of them (`relation(*)`):
   *
   * ```
   * qb.addEmbedded('author', 'id', 'name')
   *   .addEmbedded('comments')
   *   .addSelect('title');
   * // → select=title,author(id,name),comments(*)
   * ```
   *
   * Calling repeatedly with the same relation merge-dedups the columns.
   * Does not reset the page (column shape change, not record-set change).
   *
   * @param {string} relation - The related table / foreign-key name as PostgREST sees it
   * @param {string[]} columns - Optional column projection; omit for `relation(*)`
   * @returns {this}
   * @throws {UnsupportedEmbeddedError} If the active driver does not support embedded resources
   */
  public addEmbedded(relation: string, ...columns: string[]): this {
    this._assertCapability('embedded', new UnsupportedEmbeddedError(this._driver));

    this._store.addEmbedded({ [relation]: columns });

    return this;
  }

  /**
   * Add fields to the select statement for the given model (JSON:API and Spatie only)
   *
   * @param model - Model that holds the fields
   * @param fields - Fields to select
   * @returns {this}
   * @throws {UnsupportedFieldSelectionError} If the active driver does not support per-model field selection
   */
  public addFields(model: string, fields: string[]): this {
    this._assertCapability('fields', new UnsupportedFieldSelectionError(this._driver));

    if (!fields.length) {
      return this;
    }

    this._store.addFields({ [model]: fields });

    return this;
  }

  /**
   * Add a filter with the given value(s) (JSON:API, NestJS, PostgREST, and Spatie)
   *
   * Produces: `filter[field]=value` (JSON:API / Spatie) or `filter.field=value` (NestJS)
   *
   * @param {string} field - Name of the field to filter
   * @param {(string | number | boolean)[]} values - The needle(s)
   * @returns {this}
   * @throws {UnsupportedFilterError} If the active driver does not support filters
   */
  public addFilter(field: string, ...values: (string | number | boolean)[]): this {
    this._assertCapability('filters', new UnsupportedFilterError(this._driver));

    if (!values.length) {
      return this;
    }

    this._store.addFilters({
      [field]: values,
    });
    this._store.page = 1;

    return this;
  }

  /**
   * Add a filter with an explicit operator (NestJS and PostgREST)
   *
   * Produces: `filter.field=$operator:value`
   *
   * @param {string} field - Name of the field to filter
   * @param {FilterOperatorEnum} operator - The filter operator to apply
   * @param {(string | number | boolean)[]} values - The value(s) for the filter
   * @returns {this}
   * @throws {UnsupportedFilterOperatorError} If the active driver does not support filter operators
   */
  public addFilterOperator(
    field: string,
    operator: FilterOperatorEnum,
    ...values: (string | number | boolean)[]
  ): this {
    this._assertCapability('operatorFilters', new UnsupportedFilterOperatorError(this._driver));

    if (!values.length) {
      return this;
    }

    this._store.addOperatorFilters([{ field, operator, values }]);
    this._store.page = 1;

    return this;
  }

  /**
   * Add related entities to include in the request (JSON:API and Spatie only)
   *
   * @param {string[]} models - Models to include
   * @returns {this}
   * @throws {UnsupportedIncludesError} If the active driver does not support includes
   */
  public addIncludes(...models: string[]): this {
    this._assertCapability('includes', new UnsupportedIncludesError(this._driver));

    if (!models.length) {
      return this;
    }

    this._store.addIncludes(models);

    return this;
  }

  /**
   * Add flat field selection (NestJS and PostgREST)
   *
   * Produces: `select=col1,col2`
   *
   * @param {string[]} fields - Fields to select
   * @returns {this}
   * @throws {UnsupportedSelectError} If the active driver does not support flat field selection
   */
  public addSelect(...fields: string[]): this {
    this._assertCapability('select', new UnsupportedSelectError(this._driver));

    if (!fields.length) {
      return this;
    }

    this._store.addSelect(fields);

    return this;
  }

  /**
   * Add a field with a sort criteria (JSON:API, NestJS, PostgREST, and Spatie)
   *
   * @param field - Field to use for sorting
   * @param {SortEnum} order - A value from the SortEnum enumeration
   * @returns {this}
   * @throws {UnsupportedSortError} If the active driver does not support sorts
   */
  public addSort(field: string, order: SortEnum): this {
    this._assertCapability('sort', new UnsupportedSortError(this._driver));

    this._store.addSort({
      field,
      order,
    });
    this._store.page = 1;

    return this;
  }

  /**
   * Get the current page number
   *
   * @remarks Always safe to call. Thin accessor over the internal state's `page` field.
   * @returns The current page number
   */
  public currentPage(): number {
    return this._store.getSnapshot().page;
  }

  /**
   * Remove embedded resources from the current query builder state (PostgREST only)
   *
   * Removes the whole relation entry, columns included.
   *
   * @param {string[]} relations - Relation names to remove
   * @returns {this}
   * @throws {UnsupportedEmbeddedError} If the active driver does not support embedded resources
   */
  public deleteEmbedded(...relations: string[]): this {
    this._assertCapability('embedded', new UnsupportedEmbeddedError(this._driver));

    if (!relations.length) {
      return this;
    }

    this._store.deleteEmbedded(...relations);

    return this;
  }

  /**
   * Delete selected fields for the given models in the current query builder state (JSON:API and Spatie only)
   *
   * ```
   * builder.deleteFields({
   *   users: ['email', 'password'],
   *   address: ['zipcode']
   * });
   * ```
   *
   * @param {Fields} fields - Object mapping model names to field arrays to remove
   * @returns {this}
   * @throws {UnsupportedFieldSelectionError} If the active driver does not support per-model field selection
   */
  public deleteFields(fields: Fields): this {
    this._assertCapability('fields', new UnsupportedFieldSelectionError(this._driver));
    this._store.deleteFields(fields);

    return this;
  }

  /**
   * Delete selected fields for the given model in the current query builder state (JSON:API and Spatie only)
   *
   * ```
   * builder.deleteFieldsByModel('users', 'email', 'password');
   * ```
   *
   * @param model - Model that holds the fields
   * @param {string[]} fields - Fields to delete from the state
   * @returns {this}
   * @throws {UnsupportedFieldSelectionError} If the active driver does not support per-model field selection
   */
  public deleteFieldsByModel(model: string, ...fields: string[]): this {
    this._assertCapability('fields', new UnsupportedFieldSelectionError(this._driver));

    if (!fields.length) {
      return this;
    }

    this._store.deleteFields({
      [model]: fields,
    });

    return this;
  }

  /**
   * Remove given filters from the query builder state (JSON:API, NestJS, PostgREST, and Spatie)
   *
   * @param {string[]} filters - Filters to remove
   * @returns {this}
   * @throws {UnsupportedFilterError} If the active driver does not support filters
   */
  public deleteFilters(...filters: string[]): this {
    this._assertCapability('filters', new UnsupportedFilterError(this._driver));

    if (!filters.length) {
      return this;
    }

    this._store.deleteFilters(...filters);
    this._store.page = 1;

    return this;
  }

  /**
   * Remove selected related models from the query builder state (JSON:API and Spatie only)
   *
   * @param {string[]} includes - Models to remove
   * @returns {this}
   * @throws {UnsupportedIncludesError} If the active driver does not support includes
   */
  public deleteIncludes(...includes: string[]): this {
    this._assertCapability('includes', new UnsupportedIncludesError(this._driver));

    if (!includes.length) {
      return this;
    }

    this._store.deleteIncludes(...includes);

    return this;
  }

  /**
   * Remove operator filters by field name (NestJS and PostgREST)
   *
   * @param {string[]} fields - Field names of operator filters to remove
   * @returns {this}
   * @throws {UnsupportedFilterOperatorError} If the active driver does not support filter operators
   */
  public deleteOperatorFilters(...fields: string[]): this {
    this._assertCapability('operatorFilters', new UnsupportedFilterOperatorError(this._driver));

    if (!fields.length) {
      return this;
    }

    this._store.deleteOperatorFilters(...fields);
    this._store.page = 1;

    return this;
  }

  /**
   * Remove search term from the query builder state (NestJS only)
   *
   * @returns {this}
   * @throws {UnsupportedSearchError} If the active driver does not support search
   */
  public deleteSearch(): this {
    this._assertCapability('search', new UnsupportedSearchError(this._driver));
    this._store.deleteSearch();
    this._store.page = 1;

    return this;
  }

  /**
   * Remove flat field selections from the query builder state (NestJS and PostgREST)
   *
   * @param {string[]} fields - Fields to remove from selection
   * @returns {this}
   * @throws {UnsupportedSelectError} If the active driver does not support flat field selection
   */
  public deleteSelect(...fields: string[]): this {
    this._assertCapability('select', new UnsupportedSelectError(this._driver));

    if (!fields.length) {
      return this;
    }

    this._store.deleteSelect(...fields);

    return this;
  }

  /**
   * Remove sort rules from the query builder state (JSON:API, NestJS, PostgREST, and Spatie)
   *
   * @param sorts - Fields used for sorting to remove
   * @returns {this}
   * @throws {UnsupportedSortError} If the active driver does not support sorts
   */
  public deleteSorts(...sorts: string[]): this {
    this._assertCapability('sort', new UnsupportedSortError(this._driver));
    this._store.deleteSorts(...sorts);
    this._store.page = 1;

    return this;
  }

  /**
   * Navigate to the first page (page 1)
   *
   * @remarks Never throws. Idempotent when already on page 1.
   * @returns {this}
   */
  public firstPage(): this {
    this._store.page = 1;

    return this;
  }

  /**
   * Build the URI for the current state using the active driver.
   *
   * Synchronous: URI construction performs no I/O. ng-qubee wrapped this in an
   * Observable purely for Angular ergonomics, and converted the throw below
   * into a stream error; adapters can re-wrap it however their framework
   * prefers. Subscribe to the store to be told when the result would change.
   *
   * @returns The generated URI
   * @throws If the resource is unset, or the state is invalid for this driver
   */
  public generateUri(): string {
    return this._requestStrategy.buildUri(this._store.getSnapshot(), this._options);
  }

  /**
   * Navigate directly to the specified page
   *
   * Validates integer/positive via the existing `setPage` path, and
   * additionally rejects values that exceed `state.lastPage` when
   * pagination bounds are known.
   *
   * @param n - Target page number
   * @returns {this}
   * @throws {InvalidPageNumberError} If `n` is not a positive integer, or if `n > state.lastPage` when `state.isLastPageKnown` is true
   */
  public goToPage(n: number): this {
    const state = this._store.getSnapshot();

    if (state.isLastPageKnown && n > state.lastPage) {
      throw new InvalidPageNumberError(n);
    }

    this._store.page = n;

    return this;
  }

  /**
   * Check whether a next page exists
   *
   * @remarks Template-safe. Returns `true` when pagination bounds are unknown (conservative default — keeps a "Next" button enabled before the first `paginate()` call).
   * @returns `true` if `state.page < state.lastPage` when bounds are known, or `true` when bounds are unknown
   */
  public hasNextPage(): boolean {
    const state = this._store.getSnapshot();

    return !state.isLastPageKnown || state.page < state.lastPage;
  }

  /**
   * Check whether a previous page exists
   *
   * @remarks Always safe. Does not require a synced paginated response.
   * @returns `true` if `state.page > 1`
   */
  public hasPreviousPage(): boolean {
    return this._store.getSnapshot().page > 1;
  }

  /**
   * Check whether the current page is the first page
   *
   * @remarks Always safe. Does not require a synced paginated response.
   * @returns `true` if `state.page === 1`
   */
  public isFirstPage(): boolean {
    return this._store.getSnapshot().page === 1;
  }

  /**
   * Check whether the current page is the last page
   *
   * @remarks Template-safe. Returns `false` when pagination bounds are unknown (no paginated response has been synced yet) — keeps "Next" navigation unblocked until the first `paginate()` call syncs.
   * @returns `true` only when `state.isLastPageKnown` and `state.page === state.lastPage`
   */
  public isLastPage(): boolean {
    const state = this._store.getSnapshot();

    return state.isLastPageKnown && state.page === state.lastPage;
  }

  /**
   * Navigate to the last page known from the most recent paginated response
   *
   * @remarks Requires at least one `Paginator.paginate()` call to have synced `state.lastPage`. Before that, the bound is unknown and this method throws.
   * @returns {this}
   * @throws {PaginationNotSyncedError} If `state.isLastPageKnown` is false (no paginated response has been synced yet)
   */
  public lastPage(): this {
    const state = this._store.getSnapshot();

    if (!state.isLastPageKnown) {
      throw new PaginationNotSyncedError('navigate to last page');
    }

    this._store.page = state.lastPage;

    return this;
  }

  /**
   * Navigate to the next page
   *
   * @remarks Never throws. Idempotent at the known last page (no-op). Pair with `hasNextPage()` for a disable-state binding.
   * @returns {this}
   */
  public nextPage(): this {
    const state = this._store.getSnapshot();

    if (state.isLastPageKnown && state.page >= state.lastPage) {
      return this;
    }

    this._store.page = state.page + 1;

    return this;
  }

  /**
   * HTTP request headers the active driver wants the consumer to apply
   *
   * Returns `null` for drivers that pass all pagination metadata on the
   * URL (Laravel, Spatie, JSON:API, NestJS, and PostgREST in its default
   * QUERY mode). Returns a map of header name → value when the active
   * driver uses HTTP headers instead — today, only the PostgREST driver
   * configured with `PaginationModeEnum.RANGE`, which yields
   * `{ 'Range-Unit': 'items', 'Range': 'from-to' }`.
   *
   * @returns Map of headers to apply to the HTTP request, or `null` when not needed
   */
  public paginationHeaders(): Record<string, string> | null {
    if (typeof this._requestStrategy.buildPaginationHeaders !== 'function') {
      return null;
    }

    return this._requestStrategy.buildPaginationHeaders(this._store.getSnapshot());
  }

  /**
   * Navigate to the previous page
   *
   * @remarks Never throws. Idempotent at page 1 (floored). Pair with `hasPreviousPage()` for a disable-state binding.
   * @returns {this}
   */
  public previousPage(): this {
    const state = this._store.getSnapshot();

    if (state.page <= 1) {
      return this;
    }

    this._store.page = state.page - 1;

    return this;
  }

  /**
   * Clear the current state and reset the Query Builder to a fresh, clean condition
   *
   * @returns {this}
   */
  public reset(): this {
    this._store.reset();

    return this;
  }

  /**
   * Set the base URL to use for composing the address
   *
   * @param {string} baseUrl - The base URL
   * @returns {this}
   */
  public setBaseUrl(baseUrl: string): this {
    this._store.baseUrl = baseUrl;

    return this;
  }

  /**
   * Set the items per page number
   *
   * Validation is delegated to the active request strategy because the
   * accepted range is driver-specific: nestjs-paginate additionally accepts
   * `-1` as a "fetch all" sentinel, while Laravel, Spatie, and JSON:API
   * require a positive integer.
   *
   * @param limit - Number of items per page (or `-1` to fetch all, NestJS only)
   * @returns {this}
   * @throws {import('../errors/invalid-limit.error').InvalidLimitError} If the value is not accepted by the active driver
   */
  public setLimit(limit: number): this {
    this._requestStrategy.validateLimit(limit);
    this._store.limit = limit;
    this._store.page = 1;

    return this;
  }

  /**
   * Set the page that the backend will use to paginate the result set
   *
   * @param page - Page number
   * @returns {this}
   */
  public setPage(page: number): this {
    this._store.page = page;

    return this;
  }

  /**
   * Set the API resource to run the query against
   *
   * @param {string} resource - Resource name (e.g. 'users' produces /users)
   * @returns {this}
   */
  public setResource(resource: string): this {
    this._store.resource = resource;
    this._store.page = 1;

    return this;
  }

  /**
   * Set the search term for full-text search (NestJS only)
   *
   * Produces: `search=term`
   *
   * @param {string} search - The search term
   * @returns {this}
   * @throws {UnsupportedSearchError} If the active driver does not support search
   */
  public setSearch(search: string): this {
    this._assertCapability('search', new UnsupportedSearchError(this._driver));
    this._store.setSearch(search);
    this._store.page = 1;

    return this;
  }

  /**
   * Get the total number of pages reported by the most recent paginated response
   *
   * @remarks Throws when called before any `paginate()` has synced a value. For a non-throwing read in a template, read `store.getSnapshot().isLastPageKnown` first as a guard.
   * @returns The last page number
   * @throws {PaginationNotSyncedError} If `state.isLastPageKnown` is false (no paginated response has been synced yet)
   */
  public totalPages(): number {
    const state = this._store.getSnapshot();

    if (!state.isLastPageKnown) {
      throw new PaginationNotSyncedError('read totalPages');
    }

    return state.lastPage;
  }
}
