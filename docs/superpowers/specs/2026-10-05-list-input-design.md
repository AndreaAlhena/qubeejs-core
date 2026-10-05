# Design: a typed input for list requests

- **Issue:** [#35](https://github.com/AndreaAlhena/qubeejs-core/issues/35)
- **Depends on:** [#34](https://github.com/AndreaAlhena/qubeejs-core/issues/34), for the
  nested-resource docs only
- **SemVer impact:** minor (1.4.0)
- **Date:** 2026-10-05
- **Status:** design approved section by section; this written spec is under review

## Intent

Since 1.3, a list's request can depend only on its query string. `apply(builder, state)` gets what
`readListState()` read, `resource` is a fixed string, and `buildListRequest(list, state)` takes
nothing else. Real lists need more:

1. **Path params:** `/projects/42/tasks?status=open` is "the tasks of project 42", and `42` lives
   in the route path.
2. **Lookups:** the URL holds a slug, and the API filters by an id the app resolves first.
3. **Request-scoped data:** a tenant or organisation from the session, or the current user.

Today's options are both poor: re-implement `buildListRequest` (and get the page-last rule right),
or declare a definition per value (which breaks the declare-once identity adapters rely on).
`useQubeeList` in `@qubeejs/react` has no way to take such a value at all.

**Who it is for:** `@qubeejs/react`, whose next release candidate passes one value straight
through `useQubeeList`, and any app that calls the core list functions directly.

**Success:** `buildListRequest(taskList, state, { projectId })` builds the right URI, an adapter
can type and forward the input, and every existing list, test and doc example behaves exactly as
before.

## Decisions

| Topic | Decision |
| --- | --- |
| Name | `input`. `context` already means React contexts in `@qubeejs/react` (`qubeeContext`, `useQubeeContext`) and diagnostics in core (`QubeeError.context`). |
| Declaration | Inferred from the annotation on `apply`'s third parameter. No new runtime API. |
| Allowed types | Any type except `null` and `undefined` (`TInput extends NonNullable<unknown>`). `@qubeejs/react` uses `null` for "input not ready yet", and `undefined` reads as "no input passed". A bare `string` is allowed. Docs prefer an object, without enforcing it. A `null` annotation on `apply` is refused where the list is declared. A `string \| undefined` annotation is accepted and gives an input of `string`: the optional parameter absorbs `undefined`, so the input type still excludes it. |
| Parameter | `apply`'s third parameter is optional (`input?: TInput`). A required one would break every existing two-argument `apply` call ("Expected 3 arguments, but got 2"), including code that re-implemented `buildListRequest` to work around 1.3, making the change breaking. Optional is also accurate: `apply` receives `undefined` through the loose type. |
| Required | A declared input is always required, even when every field is optional (pass `{}`). |
| Refused | Passing an input to a list that declares none is a compile error. |
| Resource | Stays a plain string: the default resource, which `apply` may replace with `setResource()`. |
| Validation | None at runtime. The URL is untrusted, so params parse defensively. The input is the app's own value, so the types are the contract. |
| Erasure | A list held as `ListDefinition<ListParams>` loses the requirement: `buildListRequest(list, state)` compiles and `apply` receives `undefined`. This is deliberate, because `readListState` and `buildListHref` must accept every list. It is pinned by tests and documented, with no runtime guard (an `apply.length` check would be a heuristic). Generic code forwards the input with the cast-free pattern under "Forwarding from generic code". |
| Scope | Request-only. `readListState`, `buildListHref`, `ListState`, `ListRequest` and every param are unchanged. |

## API

```ts
export type ListDefinition<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
> = {
  apply?(builder: QueryBuilder, state: ParamsState<TParams>, input?: TInput): void;
  readonly params: TParams;
  readonly qubee: QubeeConfig;
  readonly resource: string;
};

export function defineList<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
>(definition: ListDefinition<TParams, TInput>): ListDefinition<TParams, TInput>;

export function buildListRequest<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
>(
  list: ListDefinition<TParams, TInput>,
  state: ParamsState<TParams>,
  ...input: [NoInfer<TInput>] extends [never] ? [] : [input: NoInfer<TInput>]
): ListRequest;

export type ListInput<TList> =
  TList extends ListDefinition<ListParams, infer TInput> ? TInput : never;
```

`ListInput` lives in `src/types/list-input.type.ts` and is exported from `src/index.ts`.

- **The `never` default** keeps every existing list, every two-argument `apply` and
  `buildListRequest(list, state)` unchanged. With method bivariance, `ListDefinition<ListParams>`
  still accepts every list, and `ListState<TList>` still infers. A `void` or `undefined` default
  would break that assignability.
- **The parameter is optional** (`input?: TInput`), so two-argument `apply` calls keep compiling.
  An unannotated third parameter is typed `undefined`: using it, or passing an input to
  `buildListRequest`, fails to compile.
- **`NoInfer` is required.** Without it, `buildListRequest(taskList, state)` compiles, because
  TypeScript infers `TInput` as `never` from the empty rest parameter.
- **`NonNullable<unknown>`, not `{}`**, which the linter rejects.
- **Adapters** test for a list without an input with `[ListInput<T>] extends [never]`. Core
  exports no tuple helper for this: `@qubeejs/react` also accepts `null`, so its tuple differs.

### Forwarding from generic code

Inside a generic adapter, the list's type is erased, and `buildListRequest` refuses a third
argument for a list held as `ListDefinition<ListParams>` ("Expected 2 arguments, but got 3").
Generic code forwards the input without casts by holding the list twice, once as
`ListDefinition<ListParams>` and once widened to `ListDefinition<ListParams, NonNullable<unknown>>`
(every list is assignable to both), and branching on whether it received an input. The loose copy
is needed for the no-input branch: called on the generic `TList` itself, `buildListRequest` does
not infer "no input" and asks for a third argument.

```ts
// `search` is the current query, wherever the adapter reads it from.
function buildRequestFor<TList extends ListDefinition<ListParams>>(
  list: TList,
  search: SearchParamsInput,
  ...args: [ListInput<TList>] extends [never] ? [] : [input: ListInput<TList> | null]
): ListRequest | null {
  const loose: ListDefinition<ListParams> = list;
  const wide: ListDefinition<ListParams, NonNullable<unknown>> = list;
  const [input] = args;

  if (input === null) {
    return null; // the input is not ready yet
  }

  const state = readListState(loose, search);

  return input === undefined
    ? buildListRequest(loose, state)
    : buildListRequest(wide, state, input);
}
```

The branch is exact: a list with an input never receives `undefined` (it is excluded from the
input type), and a list without one always does. Callers stay fully checked:
`buildRequestFor(taskList, search)` and `buildRequestFor(plainList, search, { x: 1 })` are both
compile errors. The JSDoc of `ListInput` and the
guide's "Generic code" item show this pattern.

Usage:

```ts
const taskList = defineList({
  apply: (builder, { status }, { projectId }: { projectId: string }) => {
    builder.addFilter('project', projectId);

    if (status) {
      builder.addFilter('status', status);
    }
  },
  params: {
    page: integerParam('page', { default: 1, min: 1 }),
    status: enumParam('status', TaskStatusEnum),
  },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'tasks',
});

buildListRequest(taskList, readListState(taskList, search), { projectId });
```

## Runtime behaviour

`buildListRequest` keeps its order; only step 3 changes:

1. Create a fresh `createQubee(list.qubee)` instance.
2. `setResource(list.resource)`, the default resource.
3. `list.apply?.(builder, state, input)`.
4. `setPage(...)` **last**, so `apply` can call `setResource()`, `addFilter()` and the other
   methods that reset the page.
5. Return `{ headers, paginate, uri }`.

The body needs one internal cast where the rest tuple meets `apply`'s parameter, because TypeScript
cannot spread a conditional tuple it has not resolved yet. The cast gets a comment explaining that.

- Errors `apply` throws with the input (a capability the driver lacks, an invalid resource)
  propagate as programmer errors, as today.
- `defineList()` is unchanged: it neither stores nor freezes the input.
- **The input never reaches the URL.** `readListState` and `buildListHref` never see it.
  `[request.uri, request.headers]` stays a complete cache key: `apply` only gets the builder, the
  builder's only outputs are the URI and the headers, and the response parser comes from
  `list.qubee`.

### Nested resources

`apply` can call ``builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`)``. Core
joins the resource verbatim (`${baseUrl}/${resource}`) and encodes nothing, so path segments from
data must be encoded by the caller. Until #34 ships, a leading `/` on the resource, a trailing `/`
on the base URL, or sparse fieldsets on JSON:API and Spatie break nested resources. The guide
documents them only once #34 has merged.

## Tests

The repo's existing pattern: `expectTypeOf` and `@ts-expect-error` inside `.spec.ts` files. Vitest
runs them; `npm run typecheck` enforces the type assertions.

**Runtime, in `src/lists/build-list-request.spec.ts`**

- `apply` receives the input as its third argument, and a filter built from it appears in the URI.
- When `apply` replaces the resource with one built from the input (`projects/42/tasks`), the URI
  uses that path and the requested page survives. Strapi, with no slashes at the join, so the test
  does not depend on #34.
- Through `ListDefinition<ListParams>`, `apply` receives `undefined`.
- The existing tests for lists without an input stay as they are.

**Runtime, in `src/lists/read-list-state.spec.ts` and `src/lists/build-list-href.spec.ts`:** a
list with an input works unchanged, and the input never shows up in the href.

**Types, in a new `src/types/list-definition.type.spec.ts`**

- The input type is inferred from the annotation on `apply`.
- A list with an input is assignable to `ListDefinition<ListParams>`.
- `ListState<TList>` infers for a list with an input.
- A `null` annotation on `apply` is refused where the list is declared, and
  `ListDefinition<ListParams, string | null>` and `ListDefinition<ListParams, string | undefined>`
  are refused as types.
- A two-argument `apply` call compiles.

**Types, in a new `src/types/list-input.type.spec.ts`**

- `ListInput` gives the declared type, including a bare `string`, and `string` for a
  `string | undefined` annotation.
- It is `never` for a list without an input.
- It is `never` through `ListDefinition<ListParams>` (erasure pinned).

**Types, in `src/lists/build-list-request.spec.ts`**

- Leaving out a declared input is an error, even when every field is optional.
- So is passing an input to a list that declares none, or passing the wrong shape.
- Through `ListDefinition<ListParams>`, the call compiles without the input (erasure pinned).
- Through `ListDefinition<ListParams>`, a third argument is refused.
- The forwarding pattern from "Forwarding from generic code" compiles without casts and forwards
  the input at runtime. Its callers are checked: it requires a declared input, accepts `null`, and
  refuses an input for a list that declares none.

**Gates:** `npm test`, `npm run typecheck` and `npm run lint` pass, and coverage stays at or above
its thresholds. The kebab-case conventions test fails on Windows for unrelated reasons; it is
reported, not fixed here.

## Docs

**`guide/lists.mdx`: a new section, "Lists that need more than the URL",** after "Building the
request". No framework-specific examples: the Next recipe belongs in `@qubeejs/react`'s docs.

1. **Path param first.** For the page `/projects/42/tasks?status=open`, `taskList` with the filter
   form, then
   `buildListRequest(taskList, readListState(taskList, search), { projectId })`, where `projectId`
   and `search` are whatever the router gives.
2. **Declaring it:** annotate `apply`'s third parameter. Without the annotation, the input is
   typed `undefined`, so both using it and passing it fail at compile time.
3. **Shape:** prefer an object, so adding a value later doesn't break call sites. A bare value is
   allowed; `null` and `undefined` are not.
4. **Lookups:** resolve the slug's id before calling, because core does no I/O. Then a short note
   on request-scoped data, like a tenant from the session.
5. **What doesn't change:** links never carry the input, and `[uri, headers]` is still a complete
   cache key.
6. **Nested resources:** `resource` is the default `apply` may replace with `setResource()`, and
   path segments from data must be passed through `encodeURIComponent`. Written once #34 has
   merged.
7. **Generic code:** a list held as `ListDefinition<ListParams>` loses the input requirement, so
   that code must carry the input itself, typed with `ListInput<TList>`, and forward it with the
   pattern from "Forwarding from generic code".

The **"Declaring a list"** bullets gain one line each: `apply` takes the input as a third argument,
and `resource` is the default `apply` may replace.

**JSDoc**, which regenerates the API pages:

- `defineList`: a sentence and a second example with an input.
- `buildListRequest`: `@param input` and an example.
- `ListDefinition`: `@typeParam TInput`, the third parameter of `apply`, `resource` as the default,
  and the erasure note.
- `ListInput`: new, with the erasure note.

**README:** the "Lists in the page URL" snippet gets
`buildListRequest(taskList, state, { projectId })`, with a comment noting that the input is what
the URL doesn't hold.

**CHANGELOG:** an entry under `[Unreleased]` → `Added`, referencing #35. #34 gets its own entry
under `Fixed`.

## Order and release

1. #34 (patch): its own branch, merged to `develop` first.
2. #35 (minor): this design, including the nested-resource docs.
3. A release issue for 1.4.0. Merging to `master`, tagging and publishing are the maintainer's call.

## Out of scope

Fetching, async inputs, anything in `@qubeejs/react`, and any change to how params read or write
the URL.

## Verified before writing

A TypeScript 6.0.3 spike, outside the repo, under `--strict --noUnusedParameters`, confirmed,
with the optional parameter:

- the input is inferred from the annotation, and a bare `string` works;
- a declared input is required, including an all-optional one;
- an input passed to a list without one, or of the wrong shape, is refused;
- `null` is refused where the list is declared, and reported on the `apply` line;
- `null` and `undefined` are refused as type arguments, and a `string | undefined` annotation
  gives an input of `string`;
- two-argument `apply` calls compile (with a required parameter they did not);
- `ListDefinition<ListParams>` assignability and `ListState<TList>` inference hold;
- `readListState` and `buildListHref` accept a list with an input, with unchanged signatures;
- without `NoInfer`, a missing input compiles;
- through `ListDefinition<ListParams>`, the requirement is erased and `ListInput` is `never`;
- through `ListDefinition<ListParams>`, a third argument is refused;
- the forwarding pattern compiles without casts once the no-input branch uses the loose copy, and
  its callers are checked.
