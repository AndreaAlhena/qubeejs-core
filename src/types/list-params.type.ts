import type { ListParam } from './list-param.type';

/**
 * The params of a list, keyed by the name each has in list state.
 *
 * `page` is required, and must hold a number with a default: a list returns
 * to it when anything else changes, and applies it last when it builds a
 * request.
 */
export type ListParams = { readonly page: ListParam<number> } & Readonly<
  Record<string, ListParam<unknown>>
>;
