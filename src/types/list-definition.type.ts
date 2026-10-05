import type { QueryBuilder } from '../services/query-builder';
import type { ListParams } from './list-params.type';
import type { ParamsState } from './params-state.type';
import type { QubeeConfig } from './qubee-config.type';

/**
 * A list: the API resource it reads, the qubee configuration its requests
 * are built with, the page-URL params its state is made of, and how that
 * state becomes builder calls. Declare one with `defineList()`.
 *
 * A list whose request needs more than the URL — a path param, an id looked
 * up from a slug, a tenant from the session — declares an input by annotating
 * `apply`'s third parameter, and `buildListRequest()` then requires it.
 *
 * Every list `defineList()` returns, with or without an input, is assignable
 * to `ListDefinition<ListParams>`, which is what lets generic code accept any
 * list. Through that type the input requirement is erased:
 * `buildListRequest(list, state)` compiles without it, and `apply` receives
 * `undefined`. Generic code carries the input itself, typed with
 * `ListInput<TList>`; see `ListInput` for the pattern that forwards it.
 *
 * A list written by hand whose `apply` requires its input is not: its input
 * cannot be `undefined`. `readListState()`, `buildListHref()` and
 * `buildListRequest()` take it all the same, and `ListState` reads its state.
 *
 * @typeParam TParams - The list's params
 * @typeParam TInput - What the request needs besides URL state; `never` for a
 * list that needs nothing else. `null` and `undefined` are not allowed
 */
export type ListDefinition<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
> = {
  /**
   * Turn list state into builder calls — filters, sorts, a limit.
   *
   * Runs on a fresh builder whose resource is already set. The page is
   * applied after it returns, so calls that reset the page to 1 are harmless
   * here, `setResource()` included. Method syntax, so every definition stays
   * assignable to `ListDefinition<ListParams>` in generic code.
   *
   * @param builder - A fresh builder for `resource`
   * @param state - The list state to apply
   * @param input - What the request needs besides URL state, as
   * `buildListRequest()` received it. Annotate it to declare the list's input.
   * Optional, so that two-argument calls keep compiling; it is `undefined` for
   * a list that declares none, and through `ListDefinition<ListParams>`
   */
  apply?(builder: QueryBuilder, state: ParamsState<TParams>, input?: TInput): void;

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
   * The API resource, as `QueryBuilder.setResource()` takes it: the default,
   * which `apply` may replace. It is not encoded, so encode any path segment
   * that comes from data.
   */
  readonly resource: string;
};
