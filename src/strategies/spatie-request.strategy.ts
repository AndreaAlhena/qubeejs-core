import type { QueryBuilderOptions } from '../models/query-builder-options';
import type { QueryBuilderState } from '../types/query-builder-state.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';

import { SortEnum } from '../enums/sort.enum';
import { UnselectableModelError } from '../errors/unselectable-model.error';
import { getResourceType } from '../utils/get-resource-type';
import { stringify } from '../utils/stringify';
import { AbstractRequestStrategy } from './abstract-request.strategy';

/**
 * Request strategy for the Spatie Query Builder driver
 *
 * Generates URIs in the Spatie format:
 * - Fields: `fields[model]=col1,col2`
 * - Filters: `filter[field]=value`
 * - Includes: `include=model1,model2`
 * - Sorts: `sort=-field1,field2` (- prefix = DESC)
 * - Pagination: `limit=N&page=N`
 *
 * @see https://spatie.be/docs/laravel-query-builder
 */
export class SpatieRequestStrategy extends AbstractRequestStrategy {
  /**
   * Filters, sorts, includes, per-model fields — no operators, no flat
   * select, no global search
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
   * Append per-model field selection in bracket notation
   *
   * Validates that each field model is the resource's own or an include. A
   * nested resource (`users/42/followers`) names no model the path can tell,
   * so its fields go out as given and the server checks them.
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   * @throws Error if the resource's model is missing from the fields object
   * @throws UnselectableModelError if a field model is not the resource's or in includes
   */
  private _appendFields(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    if (!Object.keys(state.fields).length) {
      return;
    }

    const resourceModel = getResourceType(state.resource);

    if (resourceModel !== undefined && !(resourceModel in state.fields)) {
      throw new Error(`Key ${resourceModel} is missing in the fields object`);
    }

    const grouped: Record<string, string> = {};

    for (const model in state.fields) {
      if (!Object.hasOwn(state.fields, model)) {
        continue;
      }

      if (
        resourceModel !== undefined &&
        model !== resourceModel &&
        !state.includes.includes(model)
      ) {
        throw new UnselectableModelError(model);
      }

      grouped[`${options.fields}[${model}]`] = state.fields[model].join(',');
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
   * Append include parameter as `include=model1,model2`
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
   * Append the limit parameter
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendLimit(
    state: QueryBuilderState,
    options: QueryBuilderOptions,
    out: string[]
  ): void {
    out.push(`${options.limit}=${state.limit}`);
  }

  /**
   * Append the page parameter
   *
   * @param state - The current query builder state
   * @param options - The query parameter key name configuration
   * @param out - The accumulator the caller joins into the URI
   */
  private _appendPage(state: QueryBuilderState, options: QueryBuilderOptions, out: string[]): void {
    out.push(`${options.page}=${state.page}`);
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
   * Emit Spatie-format query-string segments in canonical order:
   * include → fields → filters → limit → page → sort
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
    this._appendLimit(state, options, out);
    this._appendPage(state, options, out);
    this._appendSort(state, options, out);

    return out;
  }
}
