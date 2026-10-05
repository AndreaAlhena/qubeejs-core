import type { ListDefinition } from './list-definition.type';
import type { ListParams } from './list-params.type';

/**
 * The input a list declares: what its request needs besides URL state.
 *
 * ```ts
 * type TaskListInput = ListInput<typeof taskList>; // { projectId: string }
 * ```
 *
 * `never` for a list that declares none, so `[ListInput<TList>] extends [never]`
 * tells the two apart. It is also `never` for `ListDefinition<ListParams>`:
 * through that type the requirement is erased, and `buildListRequest()`
 * refuses a third argument. Generic code that holds a list that way carries
 * the input itself, and forwards it by holding the list twice, loose and
 * widened:
 *
 * ```ts
 * function buildRequestFor<TList extends ListDefinition<ListParams>>(
 *   list: TList,
 *   search: SearchParamsInput,
 *   ...args: [ListInput<TList>] extends [never] ? [] : [input: ListInput<TList>]
 * ): ListRequest {
 *   const loose: ListDefinition<ListParams> = list;
 *   const wide: ListDefinition<ListParams, NonNullable<unknown>> = list;
 *   const [input] = args;
 *   const state = readListState(loose, search);
 *
 *   return input === undefined ? buildListRequest(loose, state) : buildListRequest(wide, state, input);
 * }
 * ```
 *
 * A list with an input never receives `undefined`, and a list without one
 * always does, so the branch is exact. The no-input branch needs the loose
 * copy: called on the generic `TList`, `buildListRequest()` asks for a third
 * argument.
 *
 * A list written by hand with no `apply` at all declares no input either: with
 * nothing to infer from, `TInput` would otherwise fall back to its
 * constraint, and generic code would ask that list for an input.
 *
 * @typeParam TList - The list, as `defineList()` returned it
 */
export type ListInput<TList> =
  TList extends ListDefinition<ListParams, infer TInput>
    ? 'apply' extends keyof TList
      ? TInput
      : never
    : never;
