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
 * A single value on the right-hand side of a fastapi-filter condition
 */
type FastapiValue = string | number | boolean;

/**
 * Request strategy for the FastAPI driver
 *
 * Generates URIs for a FastAPI endpoint that filters with
 * [fastapi-filter](https://github.com/arthurio/fastapi-filter) (its
 * SQLAlchemy backend) and paginates with
 * [fastapi-pagination](https://github.com/uriyyo/fastapi-pagination)'s
 * `Page`:
 * - Filters: `field=value`; several values become one comma-separated
 *   `field__in=a,b`, the only list form fastapi-filter reads (a repeated
 *   param keeps its last value)
 * - Operator filters: `field__<operator>=value`, translated from
 *   `FilterOperatorEnum` — `NOT`→`__neq` / `__not_in`, `CONTAINS`→`__like`,
 *   `ILIKE`→`__ilike`, `SW`→`__like` anchored at the start,
 *   `BTW`→`__gte` + `__lte`, `NULL`→`__isnull=true|false`
 * - Ordering: `order_by=-field1,field2` (`-` prefix = DESC)
 * - Search: `search=term`, an OR of `ilike` across the backend's
 *   `search_model_fields`
 * - Pagination: `page` + `size`, the defaults of fastapi-pagination's `Page`
 *
 * fastapi-filter expects the client to send `like`/`ilike` wildcards, so
 * `CONTAINS` and `ILIKE` wrap the value in `%…%` and `SW` appends one `%`,
 * sent percent-encoded as `%25`. A `%` or `_` inside the value itself is a
 * wildcard too: fastapi-filter has no escape.
 *
 * `order_by` and `size` are the libraries' own names and are fixed here,
 * the way DRF's `ordering` and `page_size` are; `page` and `search` follow
 * `QueryBuilderOptions`.
 *
 * @see https://fastapi-filter.netlify.app/
 * @see https://uriyyo-fastapi-pagination.netlify.app/
 */
export class FastapiRequestStrategy extends AbstractRequestStrategy {
  /** fastapi-filter's ordering field, `Filter.Constants.ordering_field_name` */
  private static readonly _orderByKey = 'order_by';

  /** fastapi-pagination's page-size query parameter on `Page` */
  private static readonly _sizeKey = 'size';

  /** The SQL `LIKE` wildcard `%`, percent-encoded so it reaches the server intact */
  private static readonly _wildcard = '%25';

  /**
   * Filters, operator filters, sorts and global search — no select, fields,
   * includes or embedded resources, none of which fastapi-filter has
   */
  public readonly capabilities: StrategyCapabilities = {
    embedded: false,
    fields: false,
    filters: true,
    includes: false,
    operatorFilters: true,
    search: true,
    select: false,
    sort: true,
  };

  /**
   * Append one condition per simple filter
   *
   * One value is a bare equality, several fold to one comma-separated
   * `__in`. A filter with no values emits nothing.
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
        values.length === 1
          ? this._condition(field, '', values[0])
          : this._condition(field, 'in', values.join(','))
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
   * Append `order_by=-field1,field2`
   *
   * Ascending fields carry no prefix: fastapi-filter also accepts `+`, but
   * a raw `+` in a query string decodes to a space. fastapi-filter answers
   * a field named twice with a 422, so a repeated field is sent once, with
   * its first sort; in SQL the later key could never change the order.
   *
   * @param state - The current query builder state
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendOrderBy(state: QueryBuilderState, out: string[]): void {
    if (!state.sorts.length) {
      return;
    }

    const fields = state.sorts
      .filter((sort, index) => state.sorts.findIndex((s) => s.field === sort.field) === index)
      .map((sort) => `${sort.order === SortEnum.DESC ? '-' : ''}${sort.field}`);

    out.push(`${FastapiRequestStrategy._orderByKey}=${fields.join(',')}`);
  }

  /**
   * Append `search=term` when a search term is set
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendSearch(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    if (!state.search) {
      return;
    }

    out.push(`${options.search}=${state.search}`);
  }

  /**
   * Format one condition, `field__operator=value`, or `field=value` for
   * fastapi-filter's implicit equality
   *
   * @param field - The model attribute, a related one prefixed (`author__name`)
   * @param operator - The fastapi-filter operator suffix, or `''` for equality
   * @param value - The already-encoded value
   * @returns The query-string segment
   */
  private _condition(field: string, operator: string, value: FastapiValue): string {
    return `${operator ? `${field}__${operator}` : field}=${String(value)}`;
  }

  /**
   * Translate a `FilterOperatorEnum` operator filter into fastapi-filter
   * conditions
   *
   * The mapping is library-canonical → fastapi-filter operator:
   * - `EQ` → no suffix; `GT`/`GTE`/`LT`/`LTE` → `__gt`/`__gte`/`__lt`/`__lte`
   * - `IN` → comma-separated `__in`
   * - `NOT` → `__neq` (one value) / comma-separated `__not_in` (several);
   *   fastapi-filter's own `__not` renders `IS NOT`, which is not inequality
   * - `CONTAINS` → `__like=%v%`, `ILIKE` → `__ilike=%v%`, `SW` → `__like=v%`
   * - `BTW` → `__gte` + `__lte`, two conditions (arity-checked)
   * - `NULL` → `__isnull=true` / `__isnull=false` (arity- and type-checked)
   *
   * PostgREST's full-text-search operators have no fastapi-filter operator
   * and throw `UnsupportedFilterOperatorError`.
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
    const wildcard = FastapiRequestStrategy._wildcard;

    switch (operator) {
      case FilterOperatorEnum.EQ:
        return [this._condition(field, '', first)];
      case FilterOperatorEnum.GT:
        return [this._condition(field, 'gt', first)];
      case FilterOperatorEnum.GTE:
        return [this._condition(field, 'gte', first)];
      case FilterOperatorEnum.LT:
        return [this._condition(field, 'lt', first)];
      case FilterOperatorEnum.LTE:
        return [this._condition(field, 'lte', first)];
      case FilterOperatorEnum.CONTAINS:
        return [this._condition(field, 'like', `${wildcard}${String(first)}${wildcard}`)];
      case FilterOperatorEnum.ILIKE:
        return [this._condition(field, 'ilike', `${wildcard}${String(first)}${wildcard}`)];
      case FilterOperatorEnum.SW:
        return [this._condition(field, 'like', `${String(first)}${wildcard}`)];
      case FilterOperatorEnum.IN:
        return [this._condition(field, 'in', values.join(','))];

      case FilterOperatorEnum.NOT:
        return [
          values.length === 1
            ? this._condition(field, 'neq', first)
            : this._condition(field, 'not_in', values.join(',')),
        ];

      case FilterOperatorEnum.BTW: {
        if (values.length !== 2) {
          throw new InvalidFilterOperatorValueError(
            operator,
            'BTW requires exactly 2 values (min, max)'
          );
        }

        return [this._condition(field, 'gte', first), this._condition(field, 'lte', values[1])];
      }

      case FilterOperatorEnum.NULL: {
        if (values.length !== 1 || typeof first !== 'boolean') {
          throw new InvalidFilterOperatorValueError(
            operator,
            'NULL requires exactly 1 boolean value (true → IS NULL, false → IS NOT NULL)'
          );
        }

        return [this._condition(field, 'isnull', first)];
      }

      case FilterOperatorEnum.FTS:
      case FilterOperatorEnum.PHFTS:
      case FilterOperatorEnum.PLFTS:
      case FilterOperatorEnum.WFTS:
        throw new UnsupportedFilterOperatorError();
    }
  }

  /**
   * Emit FastAPI-format query-string segments in canonical order:
   * filters → operator filters → order_by → search → page → size
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration; `page`
   * and `search` are read, while `order_by` and `size` are fixed
   * @returns Ordered query-string fragments
   */
  protected parts(state: QueryBuilderState, options: QueryBuilderOptions): string[] {
    const out: string[] = [];

    this._appendFilters(state, out);
    this._appendOperatorFilters(state, out);
    this._appendOrderBy(state, out);
    this._appendSearch(state, options, out);
    out.push(`${options.page}=${state.page}`, `${FastapiRequestStrategy._sizeKey}=${state.limit}`);

    return out;
  }
}
