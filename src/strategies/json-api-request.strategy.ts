import type { QueryBuilderOptions } from '../models/query-builder-options';
import type { QueryBuilderState } from '../types/query-builder-state.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';

import { SortEnum } from '../enums/sort.enum';
import { UnselectableModelError } from '../errors/unselectable-model.error';
import { getResourceType } from '../utils/get-resource-type';
import { stringify } from '../utils/stringify';
import { AbstractRequestStrategy } from './abstract-request.strategy';

/**
 * Request strategy for the JSON:API driver
 *
 * Generates URIs in the JSON:API format:
 * - Fields: `fields[articles]=title,body&fields[people]=name`
 * - Filters: `filter[status]=active`
 * - Includes: `include=author,comments.author`
 * - Pagination: `page[number]=1&page[size]=15`
 * - Sort: `sort=-created_at,name` (- prefix = DESC)
 *
 * @see https://jsonapi.org/format/
 */
export class JsonApiRequestStrategy extends AbstractRequestStrategy {
  /**
   * Filters, sorts, includes, per-model fields — same shape as Spatie
   * but with bracket-style pagination
   */
  public readonly capabilities: StrategyCapabilities = {
    embedded: false,
    fields: true,
    filters: true,
    includes: true,
    operatorFilters: false,
    search: false,
    select: false,
    sort: true,
  };

  /**
   * Append per-type field selection in bracket notation
   *
   * Validates that each field type is the resource's own or an include. A
   * nested resource (`users/42/followers`) names no type the path can tell,
   * so its fields go out as given and the server checks them.
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   * @throws Error if the resource's type is missing from the fields object
   * @throws UnselectableModelError if a field type is not the resource's or in includes
   */
  private _appendFields(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    if (!Object.keys(state.fields).length) {
      return;
    }

    const resourceType = getResourceType(state.resource);

    if (resourceType !== undefined && !(resourceType in state.fields)) {
      throw new Error(`Key ${resourceType} is missing in the fields object`);
    }

    const grouped: Record<string, string> = {};

    for (const type in state.fields) {
      if (!Object.hasOwn(state.fields, type)) {
        continue;
      }

      if (resourceType !== undefined && type !== resourceType && !state.includes.includes(type)) {
        throw new UnselectableModelError(type);
      }

      grouped[`${options.fields}[${type}]`] = state.fields[type].join(',');
    }

    out.push(stringify(grouped));
  }

  /**
   * Append filter parameters in bracket notation: `filter[key]=value`
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendFilters(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    const keys = Object.keys(state.filters);

    if (!keys.length) {
      return;
    }

    const wrapper = {
      [options.filters]: keys.reduce((acc: Record<string, string>, key: string) => {
        return Object.assign(acc, { [key]: state.filters[key].join(',') });
      }, {}),
    };

    out.push(stringify(wrapper));
  }

  /**
   * Append include parameter as `include=author,comments.author`
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendIncludes(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    if (!state.includes.length) {
      return;
    }

    out.push(`${options.includes}=${state.includes.join(',')}`);
  }

  /**
   * Append JSON:API bracket pagination as `page[number]=1&page[size]=15`
   *
   * `stringify()` already returns the two segments joined with `&`, so we
   * push the whole string as one accumulator entry — `_join` will glue
   * it onto the rest with the same separator.
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendPagination(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    const pagination = stringify({ [options.page]: { number: state.page, size: state.limit } });

    out.push(pagination);
  }

  /**
   * Append sort parameter as `sort=-field1,field2` (`-` prefix = DESC)
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendSort(state: QueryBuilderState, options: QueryBuilderOptions, out: string[]): void {
    if (!state.sorts.length) {
      return;
    }

    const pairs = state.sorts.map(
      (sort) => `${sort.order === SortEnum.DESC ? '-' : ''}${sort.field}`
    );

    out.push(`${options.sort}=${pairs.join(',')}`);
  }

  /**
   * Emit JSON:API-format query-string segments in canonical order:
   * include → fields → filters → pagination → sort
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @returns Ordered query-string fragments
   */
  protected parts(state: QueryBuilderState, options: QueryBuilderOptions): string[] {
    const out: string[] = [];

    this._appendIncludes(state, options, out);
    this._appendFields(state, options, out);
    this._appendFilters(state, options, out);
    this._appendPagination(state, options, out);
    this._appendSort(state, options, out);

    return out;
  }
}
