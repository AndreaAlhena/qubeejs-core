import type { QueryBuilderOptions } from '../models/query-builder-options';
import type { OperatorFilter } from '../types/operator-filter.type';
import type { QueryBuilderState } from '../types/query-builder-state.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';

import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { SortEnum } from '../enums/sort.enum';
import { InvalidFilterOperatorValueError } from '../errors/invalid-filter-operator-value.error';
import { UnsupportedFilterOperatorError } from '../errors/unsupported-filter-operator.error';
import { AbstractRequestStrategy } from './abstract-request.strategy';

/**
 * A single value on the right-hand side of a Ransack condition
 */
type RansackValue = string | number | boolean;

/**
 * Request strategy for the Ransack (Rails) driver
 *
 * Generates URIs in [Ransack's search-matcher format](https://activerecord-hackery.github.io/ransack/getting-started/search-matches/),
 * every condition nested under the `q` search key as `q[<attribute>_<predicate>]`:
 * - Filters: `q[field_eq]=value`; several values become repeated
 *   `q[field_in][]=a&q[field_in][]=b` keys, because Ransack never splits a
 *   comma-separated string (`q[field_in]=a,b` matches the literal `'a,b'`)
 * - Operator filters: `q[field_<predicate>]=value`, translated from
 *   `FilterOperatorEnum` — `GTE`→`_gteq`, `LTE`→`_lteq`, `NOT`→`_not_eq` /
 *   `_not_in[]`, `ILIKE`→`_i_cont`, `SW`→`_start`, `BTW`→`_gteq` + `_lteq`,
 *   `NULL`→`_null=1` / `_not_null=1`
 * - Sorts: `q[s][]=field+asc&q[s][]=field+desc`, the array form Rails'
 *   `sort_link` emits; a comma-joined `q[s]` string is not parsed as two sorts
 * - Pagination: `page` + `limit`, the defaults of Pagy. Ransack itself does
 *   not paginate; for Kaminari set `request: { limit: 'per_page' }`
 *
 * Ransack has no field selection, includes or global search. A search
 * across columns is a combinator attribute name instead:
 * `title_or_body` with `ILIKE` emits `q[title_or_body_i_cont]=term`.
 *
 * `CONTAINS` maps to `_cont`, which Ransack 6.0 made case-sensitive on
 * PostgreSQL; use `ILIKE` (`_i_cont`, built in since Ransack 2.4) to ignore
 * case. An attribute with no predicate suffix is silently ignored by
 * Ransack, which is why a simple filter always carries `_eq`.
 *
 * @see https://activerecord-hackery.github.io/ransack/getting-started/search-matches/
 * @see https://activerecord-hackery.github.io/ransack/getting-started/sorting/
 */
export class RansackRequestStrategy extends AbstractRequestStrategy {
  /**
   * Ransack's search key. Configurable on the server (`config.search_key`),
   * but `q` is what every controller passes (`Model.ransack(params[:q])`),
   * so it is fixed here the way Strapi's keys are.
   */
  private static readonly _searchKey = 'q';

  /** The sort key inside the search hash; Ransack also accepts `sorts` */
  private static readonly _sortKey = 's';

  /**
   * Filters, operator filters and sorts — no select, fields, includes,
   * embedded resources or global search, none of which Ransack has
   */
  public readonly capabilities: StrategyCapabilities = {
    embedded: false,
    fields: false,
    filters: true,
    includes: false,
    operatorFilters: true,
    search: false,
    select: false,
    sort: true,
  };

  /**
   * Append one condition per simple filter
   *
   * One value folds to `_eq`, several to repeated `_in[]` keys. A filter
   * with no values emits nothing.
   *
   * @param state - The current query builder state
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendFilters(state: QueryBuilderState, out: string[]): void {
    Object.entries(state.filters).forEach(([field, values]) => {
      if (!values.length) {
        return;
      }

      out.push(
        ...(values.length === 1
          ? [this._condition(field, 'eq', values[0])]
          : this._listCondition(field, 'in', values))
      );
    });
  }

  /**
   * Append the conditions of every operator filter, in insertion order
   *
   * @param state - The current query builder state
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendOperatorFilters(state: QueryBuilderState, out: string[]): void {
    state.operatorFilters.forEach((filter) => {
      out.push(...this._operatorConditions(filter));
    });
  }

  /**
   * Append one `q[s][]=field+direction` entry per sort
   *
   * The space between field and direction is written as `+`, which Rack
   * decodes back to the space Ransack splits on.
   *
   * @param state - The current query builder state
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendSorts(state: QueryBuilderState, out: string[]): void {
    state.sorts.forEach((sort) => {
      const direction = sort.order === SortEnum.DESC ? 'desc' : 'asc';

      out.push(
        `${RansackRequestStrategy._searchKey}[${RansackRequestStrategy._sortKey}][]=${sort.field}+${direction}`
      );
    });
  }

  /**
   * Format one scalar condition, `q[field_predicate]=value`
   *
   * @param field - The attribute name, combinators included (`title_or_body`)
   * @param predicate - The Ransack predicate suffix, without its underscore
   * @param value - The already-encoded value
   * @returns The query-string segment
   */
  private _condition(field: string, predicate: string, value: RansackValue): string {
    return `${RansackRequestStrategy._searchKey}[${field}_${predicate}]=${String(value)}`;
  }

  /**
   * Format an array condition as one `q[field_predicate][]=value` segment
   * per value, the form Rails parses into an array
   *
   * @param field - The attribute name
   * @param predicate - The Ransack predicate suffix, without its underscore
   * @param values - The already-encoded values
   * @returns One query-string segment per value
   */
  private _listCondition(field: string, predicate: string, values: RansackValue[]): string[] {
    return values.map(
      (value) => `${RansackRequestStrategy._searchKey}[${field}_${predicate}][]=${String(value)}`
    );
  }

  /**
   * Translate a `FilterOperatorEnum` operator filter into Ransack conditions
   *
   * The mapping is library-canonical → Ransack predicate:
   * - `EQ`/`GT`/`LT` → `_eq`/`_gt`/`_lt`; `GTE`/`LTE` → `_gteq`/`_lteq`
   * - `CONTAINS` → `_cont`, `ILIKE` → `_i_cont`, `SW` → `_start`
   * - `IN` → repeated `_in[]`
   * - `NOT` → `_not_eq` (one value) / repeated `_not_in[]` (several)
   * - `BTW` → `_gteq` + `_lteq`, two conditions (arity-checked)
   * - `NULL` → `_null=1` (value `true`) / `_not_null=1` (value `false`).
   *   Ransack reads `_null=0` as IS NOT NULL too, but `1` on the positive
   *   predicate is the unambiguous spelling.
   *
   * PostgREST's full-text-search operators have no Ransack predicate and
   * throw `UnsupportedFilterOperatorError`.
   *
   * @param filter - The operator filter to translate
   * @returns The condition segments, in emission order
   * @throws {InvalidFilterOperatorValueError} If `BTW` does not receive
   * exactly two values, or `NULL` does not receive exactly one boolean
   * @throws {UnsupportedFilterOperatorError} If the operator is a
   * PostgREST-only FTS variant
   */
  private _operatorConditions(filter: OperatorFilter): string[] {
    const { field, operator, values } = filter;
    const first = values[0];

    switch (operator) {
      case FilterOperatorEnum.EQ:
        return [this._condition(field, 'eq', first)];
      case FilterOperatorEnum.GT:
        return [this._condition(field, 'gt', first)];
      case FilterOperatorEnum.GTE:
        return [this._condition(field, 'gteq', first)];
      case FilterOperatorEnum.LT:
        return [this._condition(field, 'lt', first)];
      case FilterOperatorEnum.LTE:
        return [this._condition(field, 'lteq', first)];
      case FilterOperatorEnum.CONTAINS:
        return [this._condition(field, 'cont', first)];
      case FilterOperatorEnum.ILIKE:
        return [this._condition(field, 'i_cont', first)];
      case FilterOperatorEnum.SW:
        return [this._condition(field, 'start', first)];
      case FilterOperatorEnum.IN:
        return this._listCondition(field, 'in', values);

      case FilterOperatorEnum.NOT:
        return values.length === 1
          ? [this._condition(field, 'not_eq', first)]
          : this._listCondition(field, 'not_in', values);

      case FilterOperatorEnum.BTW: {
        if (values.length !== 2) {
          throw new InvalidFilterOperatorValueError(
            operator,
            'BTW requires exactly 2 values (min, max)'
          );
        }

        return [this._condition(field, 'gteq', first), this._condition(field, 'lteq', values[1])];
      }

      case FilterOperatorEnum.NULL: {
        if (values.length !== 1 || typeof first !== 'boolean') {
          throw new InvalidFilterOperatorValueError(
            operator,
            'NULL requires exactly 1 boolean value (true → IS NULL, false → IS NOT NULL)'
          );
        }

        return [this._condition(field, first ? 'null' : 'not_null', 1)];
      }

      case FilterOperatorEnum.FTS:
      case FilterOperatorEnum.PHFTS:
      case FilterOperatorEnum.PLFTS:
      case FilterOperatorEnum.WFTS:
        throw new UnsupportedFilterOperatorError();
    }
  }

  /**
   * Emit Ransack-format query-string segments in canonical order:
   * filters → operator filters → sorts → page → limit
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration; only
   * `page` and `limit` are read, since the `q` hash is fixed by Ransack
   * @returns Ordered query-string fragments
   */
  protected parts(state: QueryBuilderState, options: QueryBuilderOptions): string[] {
    const out: string[] = [];

    this._appendFilters(state, out);
    this._appendOperatorFilters(state, out);
    this._appendSorts(state, out);
    out.push(`${options.page}=${state.page}`, `${options.limit}=${state.limit}`);

    return out;
  }
}
