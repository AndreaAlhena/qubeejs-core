import type { ListParam } from './list-param.type';
import type { ListParams } from './list-params.type';

/**
 * The state a set of params describes: one value per param, typed by it.
 *
 * `page` is restated as `number` so that code generic over the params can
 * still read it as one.
 *
 * @typeParam TParams - The list's params
 */
export type ParamsState<TParams extends ListParams> = {
  readonly [K in keyof TParams]: TParams[K] extends ListParam<infer T> ? T : never;
} & { readonly page: number };
