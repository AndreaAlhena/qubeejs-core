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
 * The input is read from `apply`'s third parameter, not from the list's type
 * arguments, so it does not depend on how the list's type is written:
 * `typeof list`, an alias such as `type LooseList = ListDefinition<ListParams>`,
 * an intersection and an object type written by hand all read the same. A
 * list with no `apply`, or whose `apply` takes two parameters or an input of
 * `never`, declares none.
 *
 * @typeParam TList - The list's type, however it is written
 */
export type ListInput<TList> = TList extends { apply?: infer TApply }
  ? NonNullable<TApply> extends (builder: never, state: never, ...rest: infer TRest) => unknown
    ? // Through the rest tuple, a missing third parameter reads as `undefined`, where an `infer`
      // on the parameter itself would fall back to its constraint. `NonNullable` drops the
      // `undefined` an optional parameter adds.
      TRest extends [unknown?, ...unknown[]]
      ? NonNullable<TRest[0]>
      : never
    : never
  : never;
