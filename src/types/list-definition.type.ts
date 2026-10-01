import type { QueryBuilder } from '../services/query-builder';
import type { ListParams } from './list-params.type';
import type { ParamsState } from './params-state.type';
import type { QubeeConfig } from './qubee-config.type';

/**
 * A list: the API resource it reads, the qubee configuration its requests
 * are built with, the page-URL params its state is made of, and how that
 * state becomes builder calls. Declare one with `defineList()`.
 *
 * @typeParam TParams - The list's params
 */
export type ListDefinition<TParams extends ListParams> = {
  /**
   * Turn list state into builder calls — filters, sorts, a limit.
   *
   * Runs on a fresh builder whose resource is already set. The page is
   * applied after it returns, so calls that reset the page to 1 are harmless
   * here. Method syntax, so every definition stays assignable to
   * `ListDefinition<ListParams>` in generic code.
   *
   * @param builder - A fresh builder for `resource`
   * @param state - The list state to apply
   */
  apply?(builder: QueryBuilder, state: ParamsState<TParams>): void;

  /**
   * The params, keyed by the name each has in list state. They appear in
   * links in this order.
   */
  readonly params: TParams;

  /**
   * The configuration each request is built with — driver, base URL, key
   * overrides — as `createQubee()` takes it.
   */
  readonly qubee: QubeeConfig;

  /**
   * The API resource, as `QueryBuilder.setResource()` takes it.
   */
  readonly resource: string;
};
