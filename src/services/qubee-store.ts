import type { Embedded } from '../types/embedded.type';
import type { Fields } from '../types/fields.type';
import type { Filters } from '../types/filters.type';
import type { OperatorFilter } from '../types/operator-filter.type';
import type { QueryBuilderState } from '../types/query-builder-state.type';
import type { Sort } from '../types/sort.type';

import { InvalidPageNumberError } from '../errors/invalid-page-number.error';
import { InvalidResourceNameError } from '../errors/invalid-resource-name.error';

const INITIAL_STATE: QueryBuilderState = {
  baseUrl: '',
  embedded: {},
  fields: {},
  filters: {},
  includes: [],
  isLastPageKnown: false,
  lastPage: 1,
  limit: 15,
  operatorFilters: [],
  page: 1,
  resource: '',
  search: '',
  select: [],
  sorts: [],
};

export class QubeeStore {
  /**
   * Subscribers notified after every write, in insertion order.
   */
  private readonly _listeners = new Set<() => void>();

  /**
   * The live state. Never handed out directly — readers get `_snapshot`.
   */
  private _state: QueryBuilderState = this._clone(INITIAL_STATE);

  /**
   * Cached defensive copy of `_state`, rebuilt only when `_state` changes.
   *
   * Identity stability matters: `useSyncExternalStore` re-renders whenever
   * `getSnapshot()` returns a new reference, so returning a fresh clone per
   * call would loop forever. This mirrors what Angular's `computed` gave us.
   */
  private _snapshot: QueryBuilderState = this._freeze(this._clone(this._state));

  /**
   * Deep-copy a value so state can never be mutated through a handed-out reference.
   *
   * `structuredClone` replaces ng-qubee's `JSON.parse(JSON.stringify())`: it is
   * native at the ES2022 target, handles cycles, and does not silently drop
   * `undefined` values.
   *
   * @param value - The value to copy
   * @returns An independent deep copy
   */
  private _clone<T>(value: T): T {
    return structuredClone(value);
  }

  /**
   * Recursively freeze a value.
   *
   * The snapshot must satisfy two things at once: a stable identity between
   * writes (so `useSyncExternalStore` does not loop), and immunity from caller
   * mutation. Returning the same object satisfies the first and breaks the
   * second — unless the object cannot be written to. Freezing makes tampering
   * throw in strict mode instead of silently corrupting later reads.
   *
   * @param value - The value to freeze in place
   * @returns The same value, deeply frozen
   */
  private _freeze<T>(value: T): T {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
      return value;
    }

    Object.values(value as Record<string, unknown>).forEach((entry) => this._freeze(entry));

    return Object.freeze(value);
  }

  /**
   * Apply a reducer to the current state.
   *
   * Reducers are pure: they receive the current state and return the next one,
   * never mutating their argument.
   *
   * @param reducer - Produces the next state from the current one
   */
  private _update(reducer: (state: QueryBuilderState) => QueryBuilderState): void {
    this._write(reducer(this._state));
  }

  /**
   * Validates that the page number is a positive integer
   *
   * @param {number} page - The page number to validate
   * @throws {InvalidPageNumberError} If page is not a positive integer
   * @private
   */
  private _validatePageNumber(page: number): void {
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidPageNumberError(page);
    }
  }

  /**
   * Validates that the resource name is a non-empty string
   *
   * @param {string} resource - The resource name to validate
   * @throws {InvalidResourceNameError} If resource is not a non-empty string
   * @private
   */
  private _validateResourceName(resource: string): void {
    if (!resource || typeof resource !== 'string' || resource.trim().length === 0) {
      throw new InvalidResourceNameError(resource);
    }
  }

  /**
   * Replace the state, refresh the snapshot, and notify listeners.
   *
   * @param next - The new state
   */
  private _write(next: QueryBuilderState): void {
    this._state = next;
    this._snapshot = this._freeze(this._clone(next));
    this._listeners.forEach((listener) => listener());
  }

  /**
   * Add embedded-resource selections to the request (PostgREST only)
   * Automatically prevents duplicate columns for each relation
   *
   * An empty column array means "all columns" (`relation(*)`); merging an
   * empty array into a relation that already has explicit columns keeps
   * the explicit columns.
   *
   * @param {Embedded} embedded - Object mapping relation names to arrays of columns to project
   * @return {void}
   * @example
   * store.addEmbedded({ author: ['id', 'name'] });
   * store.addEmbedded({ comments: [] });
   */
  public addEmbedded(embedded: Embedded): void {
    this._update((nest) => {
      const mergedEmbedded = { ...nest.embedded };

      Object.keys(embedded).forEach((relation) => {
        const existingColumns = mergedEmbedded[relation] || [];
        const newColumns = embedded[relation];

        // Use Set to prevent duplicates
        const uniqueColumns = Array.from(new Set([...existingColumns, ...newColumns]));
        mergedEmbedded[relation] = uniqueColumns;
      });

      return {
        ...nest,
        embedded: mergedEmbedded,
      };
    });
  }

  /**
   * Add selectable fields for the given model to the request
   * Automatically prevents duplicate fields for each model
   *
   * @param {Fields} fields - Object mapping model names to arrays of field names
   * @return {void}
   * @example
   * store.addFields({ users: ['id', 'email', 'username'] });
   * store.addFields({ posts: ['title', 'content'] });
   */
  public addFields(fields: Fields): void {
    this._update((nest) => {
      const mergedFields = { ...nest.fields };

      Object.keys(fields).forEach((model) => {
        const existingFields = mergedFields[model] || [];
        const newFields = fields[model];

        // Use Set to prevent duplicates
        const uniqueFields = Array.from(new Set([...existingFields, ...newFields]));
        mergedFields[model] = uniqueFields;
      });

      return {
        ...nest,
        fields: mergedFields,
      };
    });
  }

  /**
   * Add filters to the request
   * Automatically prevents duplicate filter values for each filter key
   *
   * @param {Filters} filters - Object mapping filter keys to arrays of values
   * @return {void}
   * @example
   * store.addFilters({ id: [1, 2, 3] });
   * store.addFilters({ status: ['active', 'pending'] });
   */
  public addFilters(filters: Filters): void {
    this._update((nest) => {
      const mergedFilters = { ...nest.filters };

      Object.keys(filters).forEach((key) => {
        const existingValues = mergedFilters[key] || [];
        const newValues = filters[key];

        // Use Set to prevent duplicates
        const uniqueValues = Array.from(new Set([...existingValues, ...newValues]));
        mergedFilters[key] = uniqueValues;
      });

      return {
        ...nest,
        filters: mergedFilters,
      };
    });
  }

  /**
   * Add resources to include with the request
   * Automatically prevents duplicate includes
   *
   * @param {string[]} includes - Array of resource names to include in the response
   * @return {void}
   * @example
   * store.addIncludes(['profile', 'posts']);
   * store.addIncludes(['comments']);
   */
  public addIncludes(includes: string[]): void {
    this._update((nest) => {
      // Use Set to prevent duplicates
      const uniqueIncludes = Array.from(new Set([...nest.includes, ...includes]));

      return {
        ...nest,
        includes: uniqueIncludes,
      };
    });
  }

  /**
   * Add filters with explicit operators (NestJS only)
   * Automatically prevents duplicate operator filters for the same field + operator combination
   *
   * @param {OperatorFilter[]} filters - Array of operator filter configurations
   * @return {void}
   * @example
   * import { FilterOperatorEnum } from '@qubeejs/core';
   * store.addOperatorFilters([{ field: 'age', operator: FilterOperatorEnum.GTE, values: [18] }]);
   */
  public addOperatorFilters(filters: OperatorFilter[]): void {
    this._update((nest) => {
      const merged = [...nest.operatorFilters];

      filters.forEach((newFilter) => {
        const existingIdx = merged.findIndex(
          (f) => f.field === newFilter.field && f.operator === newFilter.operator
        );

        if (existingIdx > -1) {
          const existingValues = merged[existingIdx].values;
          merged[existingIdx] = {
            ...merged[existingIdx],
            values: Array.from(new Set([...existingValues, ...newFilter.values])),
          };
        } else {
          merged.push({ ...newFilter });
        }
      });

      return {
        ...nest,
        operatorFilters: merged,
      };
    });
  }

  /**
   * Add flat field selection columns (NestJS only)
   * Automatically prevents duplicate select fields
   *
   * @param {string[]} fields - Array of column names to select
   * @return {void}
   * @example
   * store.addSelect(['id', 'name', 'email']);
   */
  public addSelect(fields: string[]): void {
    this._update((nest) => {
      const uniqueSelect = Array.from(new Set([...nest.select, ...fields]));

      return {
        ...nest,
        select: uniqueSelect,
      };
    });
  }

  /**
   * Add a field that should be used for sorting data
   *
   * @param {Sort} sort - Sort configuration with field name and order (ASC/DESC)
   * @return {void}
   * @example
   * import { SortEnum } from '@qubeejs/core';
   * store.addSort({ field: 'created_at', order: SortEnum.DESC });
   * store.addSort({ field: 'name', order: SortEnum.ASC });
   */
  public addSort(sort: Sort): void {
    this._update((nest) => ({
      ...nest,
      sorts: [...nest.sorts, sort],
    }));
  }

  /**
   * Set the base URL for the API
   *
   * @param {string} baseUrl - The base URL to prepend to generated URIs
   * @example
   * store.baseUrl = 'https://api.example.com';
   */
  set baseUrl(baseUrl: string) {
    this._update((nest) => ({
      ...nest,
      baseUrl,
    }));
  }

  /**
   * Remove embedded-resource relations from the state (PostgREST only)
   *
   * Removes the whole relation entry, columns included.
   *
   * @param {...string[]} relations - Relation names to remove
   * @return {void}
   * @example
   * store.deleteEmbedded('author');
   * store.deleteEmbedded('comments', 'tags');
   */
  public deleteEmbedded(...relations: string[]): void {
    this._update((nest) => {
      const embedded = this._clone(nest.embedded);

      relations.forEach((relation) => delete embedded[relation]);

      return { ...nest, embedded };
    });
  }

  /**
   * Remove fields for the given model
   * Uses deep cloning to prevent mutations to the original state
   *
   * @param {Fields} fields - Object mapping model names to arrays of field names to remove
   * @return {void}
   * @example
   * store.deleteFields({ users: ['email'] });
   * store.deleteFields({ posts: ['content', 'body'] });
   */
  public deleteFields(fields: Fields): void {
    this._update((nest) => {
      const next = this._clone(nest.fields);

      Object.keys(fields).forEach((model) => {
        if (!(model in next)) {
          return;
        }

        next[model] = next[model].filter((field) => !fields[model].includes(field));
      });

      return { ...nest, fields: next };
    });
  }

  /**
   * Remove filters from the request
   * Uses deep cloning to prevent mutations to the original state
   *
   * @param {...string[]} filters - Filter keys to remove
   * @return {void}
   * @example
   * store.deleteFilters('id');
   * store.deleteFilters('status', 'type');
   */
  public deleteFilters(...filters: string[]): void {
    this._update((nest) => {
      const next = this._clone(nest.filters);

      filters.forEach((key) => delete next[key]);

      return { ...nest, filters: next };
    });
  }

  /**
   * Remove includes from the request
   *
   * @param {...string[]} includes - Include names to remove
   * @return {void}
   * @example
   * store.deleteIncludes('profile');
   * store.deleteIncludes('posts', 'comments');
   */
  public deleteIncludes(...includes: string[]): void {
    this._update((nest) => ({
      ...nest,
      includes: nest.includes.filter((v) => !includes.includes(v)),
    }));
  }

  /**
   * Remove operator filters by field name (NestJS only)
   *
   * @param {...string[]} fields - Field names of operator filters to remove
   * @return {void}
   * @example
   * store.deleteOperatorFilters('age');
   * store.deleteOperatorFilters('price', 'quantity');
   */
  public deleteOperatorFilters(...fields: string[]): void {
    this._update((nest) => ({
      ...nest,
      operatorFilters: nest.operatorFilters.filter((f) => !fields.includes(f.field)),
    }));
  }

  /**
   * Remove the search term from the state (NestJS only)
   *
   * @return {void}
   * @example
   * store.deleteSearch();
   */
  public deleteSearch(): void {
    this._update((nest) => ({
      ...nest,
      search: '',
    }));
  }

  /**
   * Remove flat field selections from the state (NestJS only)
   *
   * @param {...string[]} fields - Field names to remove from selection
   * @return {void}
   * @example
   * store.deleteSelect('email');
   * store.deleteSelect('name', 'email');
   */
  public deleteSelect(...fields: string[]): void {
    this._update((nest) => ({
      ...nest,
      select: nest.select.filter((f) => !fields.includes(f)),
    }));
  }

  /**
   * Remove sorts from the request by field name
   *
   * @param {...string[]} sorts - Field names of sorts to remove
   * @return {void}
   * @example
   * store.deleteSorts('created_at');
   * store.deleteSorts('name', 'created_at');
   */
  public deleteSorts(...sorts: string[]): void {
    this._update((nest) => {
      // Removes the FIRST match per name only — a field sorted twice keeps its
      // second entry. Preserved deliberately from ng-qubee.
      const next = [...nest.sorts];

      sorts.forEach((field) => {
        const at = next.findIndex((sort) => sort.field === field);

        if (at > -1) {
          next.splice(at, 1);
        }
      });

      return { ...nest, sorts: next };
    });
  }

  /**
   * Read the current state.
   *
   * The returned object is a defensive copy whose identity is stable until the
   * next write, which is exactly the contract `useSyncExternalStore` expects.
   *
   * @returns The current query builder state
   */
  public getSnapshot(): QueryBuilderState {
    return this._snapshot;
  }

  /**
   * Set the limit for paginated results
   *
   * This setter performs a raw state write. Validation of the value is the
   * responsibility of the active request strategy and is enforced upstream
   * by `QueryBuilder.setLimit()`, because the accepted range depends on
   * the driver (e.g. nestjs-paginate accepts `-1` for "fetch all").
   *
   * @param {number} limit - The number of items per page
   * @example
   * store.limit = 25;
   */
  set limit(limit: number) {
    this._update((nest) => ({
      ...nest,
      limit,
    }));
  }

  /**
   * Set the page number for pagination
   * Must be a positive integer greater than 0
   *
   * @param {number} page - The page number to fetch
   * @throws {InvalidPageNumberError} If page is not a positive integer
   * @example
   * store.page = 2;
   */
  set page(page: number) {
    this._validatePageNumber(page);
    this._update((nest) => ({
      ...nest,
      page,
    }));
  }

  /**
   * Reset the query builder state to initial values
   * Clears all fields, filters, includes, sorts, and resets pagination
   *
   * @return {void}
   * @example
   * store.reset();
   */
  public reset(): void {
    this._write(this._clone(INITIAL_STATE));
  }

  /**
   * Set the resource name for the query
   * Must be a non-empty string
   *
   * @param {string} resource - The API resource name (e.g., 'users', 'posts')
   * @throws {InvalidResourceNameError} If resource is not a non-empty string
   * @example
   * store.resource = 'users';
   */
  set resource(resource: string) {
    this._validateResourceName(resource);
    this._update((nest) => ({
      ...nest,
      resource,
    }));
  }

  /**
   * Set the full-text search term (NestJS only)
   *
   * @param {string} search - The search term
   * @return {void}
   * @example
   * store.setSearch('john doe');
   */
  public setSearch(search: string): void {
    this._update((nest) => ({
      ...nest,
      search,
    }));
  }
  /**
   * Register a listener invoked after every state change.
   *
   * @param listener - Called after each write; receives no arguments and should
   * read the new state via {@link getSnapshot}
   * @returns A function that removes the listener
   */
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Atomically record the `lastPage` value from a paginated response and
   * flip `isLastPageKnown` to `true`
   *
   * Called exclusively by `Paginator.paginate()` as part of the
   * auto-sync contract; not intended to be invoked by consumers directly.
   * Keeping the two fields under a single write guarantees they cannot
   * drift out of sync.
   *
   * @param {number} lastPage - The last page number parsed from the most recent paginated response
   * @return {void}
   */
  public syncLastPage(lastPage: number): void {
    this._update((nest) => ({
      ...nest,
      isLastPageKnown: true,
      lastPage,
    }));
  }
}
