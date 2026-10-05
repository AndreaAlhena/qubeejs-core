# List Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a list declare a typed input, what its request needs besides URL state, which
`buildListRequest(list, state, input)` passes to `apply` as a third argument.

**Architecture:** `ListDefinition` gains a second type parameter, `TInput`, defaulted to `never`.
Its type is inferred from the annotation on `apply`'s third parameter. `buildListRequest` takes the
input through a conditional rest parameter (`[]` or `[input]`, wrapped in `NoInfer`) and passes it
to `apply`. Nothing else changes at runtime. A new exported type, `ListInput<TList>`, reads a
list's input for adapters.

**Tech Stack:** TypeScript 6.0.3 (strict, `noUnusedLocals`, `noUnusedParameters`), Vitest
(`expectTypeOf`), ESLint with `eslint-plugin-perfectionist`, Prettier, Astro Starlight docs.

**Spec:** `docs/superpowers/specs/2026-10-05-list-input-design.md`. Read it before starting.

## Precondition

**#34 is merged into `develop`.** Task 0 rebases `feature/35` onto it. The nested-resources docs
in Task 3 rely on #34's slash handling. Do not start without it.

## Global Constraints

- Coding standards: `CODING-STANDARDS.md` is the source of truth. `private` members take a leading
  `_`; nothing else does, except unused parameters (`_builder`, `_state`), as in
  `src/models/response-options.spec.ts`.
- No `any`. Write `NonNullable<unknown>`, never `{}`: `@typescript-eslint/no-empty-object-type`
  rejects `{}`.
- Ordering is auto-fixed: run `npm run lint:fix`, don't reorder by hand.
- Commits: Conventional Commits, lowercase, imperative, scoped, referencing `(#35)`. **No AI
  credits and no co-author trailers.** Every commit uses the repo's identity:
  `git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" commit …`
- Branch: `feature/35`. Merge with `git merge --no-ff` into `develop`. Merging to `master`, tagging
  and publishing are the maintainer's call, not this plan's.
- SemVer impact: **minor** (1.4.0).
- Every `@ts-expect-error` gets a reason, as in `src/lists/define-list.spec.ts`:
  `// @ts-expect-error — <reason>`. It must sit directly above the one line that errors, and that
  line must have no other possible error. Never put it above a line declaring an unused variable.
- Known Windows-only failures, not caused by this work. Report them, don't fix them:
  `test/conventions.spec.ts > uses kebab-case filenames`; `prettier --check` flagging every CRLF
  file (use `--end-of-line auto`).
- Uncommitted `package-lock.json` changes belong to the maintainer: never stage them.

## Review Focus

1. **The same list called with different inputs.** Each call builds on a fresh instance, so an
   input never leaks into the next request. Pinned in Task 2 ("should not leak an input into the
   next request").
2. **An input used as a filter value with reserved characters** (`a&b c`). It is encoded like any
   other filter value: `filters[project][$eq]=a%26b%20c`. Pinned in Task 2.
3. **A resource segment the caller already encoded.** Core must not encode it again:
   `projects/a%2Fb%20c/tasks` stays as it is. Pinned in Task 2.
4. **Trying to put the input into a link.** `buildListHref(taskList, location, { projectId })` is
   a compile error, because the input is not a param. Pinned in Task 1.
5. **The input's name appearing in the query string** (`?projectId=99`). `readListState` ignores
   it, so the URL can never supply or override the input. Pinned in Task 1.

---

### Task 0: Rebase onto develop

**Files:** none.

- [ ] **Step 1: Confirm #34 is merged and the branch is local-only**

Run: `git fetch origin && git log --oneline origin/develop | grep "(#34)" | head -3 && git status --short && git log --oneline develop..feature/35`
Expected: at least one `(#34)` commit; no staged changes of your own; on `feature/35`, only the
spec and plan commits (`docs(spec): …` and `docs(plan): …`, all `(#35)`).

- [ ] **Step 2: Rebase**

```bash
git switch feature/35
git rebase develop
```

Expected: a clean rebase. `feature/35` has never been pushed, so rewriting it is safe.

---

### Task 1: Declare an input on a list

**Files:**
- Create: `test/fixtures/task-list.ts`
- Create: `src/types/list-input.type.ts`
- Create: `src/types/list-input.type.spec.ts`
- Create: `src/types/list-definition.type.spec.ts`
- Modify: `src/types/list-definition.type.ts` (whole file)
- Modify: `src/lists/define-list.ts:8-48` (JSDoc and signature)
- Modify: `src/index.ts:170-176` (lists type exports)
- Modify: `src/lists/read-list-state.spec.ts` (append tests)
- Modify: `src/lists/build-list-href.spec.ts` (append tests)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ListDefinition<TParams extends ListParams, TInput extends NonNullable<unknown> = never>`, with
    `apply?(builder: QueryBuilder, state: ParamsState<TParams>, input?: TInput): void` (optional,
    so existing two-argument calls, including `build-list-request.ts` until Task 2, keep compiling)
  - `defineList<TParams extends ListParams, TInput extends NonNullable<unknown> = never>(definition: ListDefinition<TParams, TInput>): ListDefinition<TParams, TInput>`
  - `ListInput<TList>`, exported from `src/index.ts`
  - The fixture `taskList`, `ListDefinition<{ page; status }, { projectId: string }>`, exported
    from `test/fixtures/task-list.ts`

- [ ] **Step 1: Create the fixture**

`test/fixtures/task-list.ts`:

```ts
import { STRAPI_DRIVER } from '../../src/drivers/strapi.driver';
import { defineList } from '../../src/lists/define-list';
import { enumParam } from '../../src/params/enum-param';
import { integerParam } from '../../src/params/integer-param';

/**
 * A list whose request needs more than the URL: the tasks of one project, filterable by status.
 * The project lives in the route path, so the list takes it as its input.
 */
export const taskList = defineList({
  apply: (builder, { status }, { projectId }: { projectId: string }) => {
    builder.addFilter('project', projectId);

    if (status) {
      builder.addFilter('status', status);
    }
  },
  params: {
    page: integerParam('page', { default: 1, min: 1 }),
    status: enumParam('status', ['open', 'done']),
  },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'tasks',
});
```

- [ ] **Step 2: Write the failing type tests**

`src/types/list-input.type.spec.ts`:

```ts
import type { ListDefinition } from './list-definition.type';
import type { ListInput } from './list-input.type';
import type { ListParams } from './list-params.type';

import { articleList } from '../../test/fixtures/article-list';
import { taskList } from '../../test/fixtures/task-list';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { defineList } from '../lists/define-list';
import { integerParam } from '../params/integer-param';

describe('ListInput', () => {
  it('should read the input a list declares, from the annotation on apply', () => {
    expectTypeOf<ListInput<typeof taskList>>().toEqualTypeOf<{ projectId: string }>();
  });

  it('should read a bare value', () => {
    const list = defineList({
      apply: (builder, _state, projectId: string) => {
        builder.addFilter('project', projectId);
      },
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'tasks',
    });

    expectTypeOf<ListInput<typeof list>>().toEqualTypeOf<string>();
  });

  it('should drop undefined from an annotation, so the input never includes it', () => {
    const list = defineList({
      apply: (builder, _state, projectId: string | undefined) => {
        if (projectId) {
          builder.addFilter('project', projectId);
        }
      },
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'tasks',
    });

    expectTypeOf<ListInput<typeof list>>().toEqualTypeOf<string>();
  });

  it('should be never for a list that declares none', () => {
    expectTypeOf<ListInput<typeof articleList>>().toBeNever();
  });

  it('should be never through ListDefinition<ListParams>, where the requirement is erased', () => {
    expectTypeOf<ListInput<ListDefinition<ListParams>>>().toBeNever();
  });
});
```

`src/types/list-definition.type.spec.ts`:

```ts
import type { ListDefinition } from './list-definition.type';
import type { ListParams } from './list-params.type';
import type { ListState } from './list-state.type';

import { articleList } from '../../test/fixtures/article-list';
import { taskList } from '../../test/fixtures/task-list';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { defineList } from '../lists/define-list';
import { readListState } from '../lists/read-list-state';
import { integerParam } from '../params/integer-param';
import { createQubee } from '../services/create-qubee';

describe('ListDefinition', () => {
  it('should keep every list assignable to ListDefinition<ListParams>', () => {
    expectTypeOf(articleList).toExtend<ListDefinition<ListParams>>();
    expectTypeOf(taskList).toExtend<ListDefinition<ListParams>>();
  });

  it('should infer the state of a list with an input', () => {
    expectTypeOf<ListState<typeof taskList>['page']>().toEqualTypeOf<number>();
    expectTypeOf<ListState<typeof taskList>['status']>().toEqualTypeOf<
      'done' | 'open' | undefined
    >();
  });

  it('should refuse null and undefined as an input', () => {
    // @ts-expect-error — null is left for adapters to mean "input not ready yet"
    expectTypeOf<ListDefinition<ListParams, string | null>>();
    // @ts-expect-error — undefined reads as "no input passed"
    expectTypeOf<ListDefinition<ListParams, string | undefined>>();
  });

  it('should refuse a null annotation where the list is declared', () => {
    expect(() =>
      defineList({
        // @ts-expect-error — null is left for adapters to mean "input not ready yet"
        apply: (builder, _state, projectId: string | null) => {
          builder.addFilter('project', String(projectId));
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      })
    ).not.toThrow();
  });

  it('should keep a two-argument apply call compiling', () => {
    // Code that re-implemented buildListRequest to work around 1.3 calls apply with two
    // arguments. The input parameter is optional so that it keeps compiling.
    const { builder } = createQubee({ driver: STRAPI_DRIVER });

    builder.setResource('articles');

    expect(() => articleList.apply?.(builder, readListState(articleList, '?q=react'))).not.toThrow();
  });
});
```

The `@ts-expect-error` for the `null` annotation sits above `apply:`, because TypeScript reports
the error on that line, as `define-list.spec.ts` does above `params:`.

- [ ] **Step 3: Run the type check to verify it fails**

Run: `npm run typecheck`
Expected: FAIL. `Cannot find module './list-input.type'`; a type-argument count error on every
`ListDefinition<ListParams, …>`; the fixture's three-parameter `apply` refused against the
two-parameter one; and "Unused '@ts-expect-error' directive" for the `null` annotation test.

- [ ] **Step 4: Rewrite `src/types/list-definition.type.ts`**

```ts
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
 * Every list, with or without an input, is assignable to
 * `ListDefinition<ListParams>`, which is what lets generic code accept any
 * list. Through that type the input requirement is erased:
 * `buildListRequest(list, state)` compiles without it, and `apply` receives
 * `undefined`. Generic code carries the input itself, typed with
 * `ListInput<TList>`; see `ListInput` for the pattern that forwards it.
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
```

- [ ] **Step 5: Create `src/types/list-input.type.ts`**

```ts
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
 * @typeParam TList - The list, as `defineList()` returned it
 */
export type ListInput<TList> =
  TList extends ListDefinition<ListParams, infer TInput> ? TInput : never;
```

- [ ] **Step 6: Update `defineList` in `src/lists/define-list.ts`**

The JSDoc keeps everything it has. Insert this paragraph and example right after the code fence
that closes the existing `articleList` example, and before the `@param definition` line:

```ts
 *
 * A list whose request needs more than the URL declares an input by
 * annotating `apply`'s third parameter, and `buildListRequest()` then
 * requires it:
 *
 * ```ts
 * export const taskList = defineList({
 *   apply: (builder, { status }, { projectId }: { projectId: string }) => {
 *     builder.addFilter('project', projectId);
 *
 *     if (status) {
 *       builder.addFilter('status', status);
 *     }
 *   },
 *   params: {
 *     page: integerParam('page', { default: 1, min: 1 }),
 *     status: enumParam('status', ['open', 'done']),
 *   },
 *   qubee: { driver: STRAPI_DRIVER },
 *   resource: 'tasks',
 * });
 * ```
```

Replace the signature (lines 44-46):

```ts
export function defineList<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
>(definition: ListDefinition<TParams, TInput>): ListDefinition<TParams, TInput> {
```

The body is unchanged.

- [ ] **Step 7: Export `ListInput` from `src/index.ts`**

In the `// Lists — page URL ⇄ typed state ⇄ API request` block, after
`export type { ListDefinition } from './types/list-definition.type';`:

```ts
export type { ListInput } from './types/list-input.type';
```

- [ ] **Step 8: Add the read and href regression tests**

Append inside `describe('readListState', …)` in `src/lists/read-list-state.spec.ts` (add
`import { taskList } from '../../test/fixtures/task-list';` with the other fixture imports):

```ts
  it('should read a list with an input like any other', () => {
    expect(readListState(taskList, '?status=open&page=2')).toEqual({ page: 2, status: 'open' });
  });

  it('should never read the input from the query', () => {
    expect(readListState(taskList, '?projectId=99')).toEqual({ page: 1, status: undefined });
  });
```

Append inside `describe('buildListHref', …)` in `src/lists/build-list-href.spec.ts` (add
`import { taskList } from '../../test/fixtures/task-list';`):

```ts
  describe('a list with an input', () => {
    const tasksAt = (search: SearchParamsInput): ListLocation => ({
      pathname: '/projects/42/tasks',
      search,
    });

    it('should write only params, never the input', () => {
      expect(buildListHref(taskList, tasksAt('?page=3'), { status: 'open' })).toBe(
        '/projects/42/tasks?status=open'
      );
    });

    it('should refuse the input as a change', () => {
      // @ts-expect-error — the input is not a param, so it cannot go into a link
      expect(buildListHref(taskList, tasksAt(''), { projectId: '7' })).toBe('/projects/42/tasks');
    });
  });
```

- [ ] **Step 9: Run the checks to verify they pass**

Run: `npm run typecheck && npx vitest run src/types src/lists`
Expected: PASS, with the new tests listed and no unused `@ts-expect-error`.

- [ ] **Step 10: Lint and format**

Run: `npm run lint:fix && npm run lint && npx prettier --write src test`
Expected: no lint errors. If `lint:fix` reordered imports or exports, keep its order.

- [ ] **Step 11: Commit**

```bash
git add test/fixtures/task-list.ts src/types/list-input.type.ts src/types/list-input.type.spec.ts src/types/list-definition.type.ts src/types/list-definition.type.spec.ts src/lists/define-list.ts src/index.ts src/lists/read-list-state.spec.ts src/lists/build-list-href.spec.ts
git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" commit -m "feat(lists): let a list declare a typed input (#35)"
```

---

### Task 2: Pass the input to apply from buildListRequest

**Files:**
- Modify: `src/lists/build-list-request.ts` (JSDoc, signature, one line in the body)
- Modify: `src/lists/build-list-request.spec.ts` (new imports, a helper, new tests)

**Interfaces:**
- Consumes: `ListDefinition<TParams, TInput>`, `ListInput<TList>` and the `taskList` fixture
  from Task 1.
- Produces:
  `buildListRequest<TParams extends ListParams, TInput extends NonNullable<unknown> = never>(list: ListDefinition<TParams, TInput>, state: ParamsState<TParams>, ...input: [NoInfer<TInput>] extends [never] ? [] : [input: NoInfer<TInput>]): ListRequest`

- [ ] **Step 1: Write the failing tests**

In `src/lists/build-list-request.spec.ts`, add these imports, keeping the file's grouping (type
imports first; `lint:fix` sorts them):

```ts
import type { ListDefinition } from '../types/list-definition.type';
import type { ListInput } from '../types/list-input.type';
import type { ListParams } from '../types/list-params.type';
import type { ListRequest } from '../types/list-request.type';
import type { SearchParamsInput } from '../types/search-params-input.type';

import { taskList } from '../../test/fixtures/task-list';
```

Add this helper between the imports and `describe('buildListRequest', …)`:

```ts
/**
 * Build a list's request from generic code, holding the list the way an adapter does: the
 * forwarding pattern `ListInput` documents.
 *
 * @param list - Any list
 * @param search - The page's query
 * @param args - The list's input, or `null` while it is not ready; nothing for a list without one
 * @returns The request, or `null` while the input is not ready
 */
function buildRequestFor<TList extends ListDefinition<ListParams>>(
  list: TList,
  search: SearchParamsInput,
  ...args: [ListInput<TList>] extends [never] ? [] : [input: ListInput<TList> | null]
): ListRequest | null {
  const loose: ListDefinition<ListParams> = list;
  const wide: ListDefinition<ListParams, NonNullable<unknown>> = list;
  const [input] = args;

  if (input === null) {
    return null;
  }

  const state = readListState(loose, search);

  return input === undefined ? buildListRequest(loose, state) : buildListRequest(wide, state, input);
}
```

The no-input branch must call `buildListRequest` on `loose`, not `list`: on the generic `TList`,
TypeScript does not infer "no input" and asks for a third argument.

Append inside `describe('buildListRequest', …)`, after the last existing test:

```ts
  describe('input', () => {
    it('should pass the input to apply', () => {
      expect(
        buildListRequest(taskList, readListState(taskList, '?status=open&page=2'), {
          projectId: '42',
        }).uri
      ).toBe(
        '/tasks?filters[project][$eq]=42&filters[status][$eq]=open&pagination[page]=2&pagination[pageSize]=15'
      );
    });

    it('should keep the page when apply replaces the resource', () => {
      const list = defineList({
        apply: (builder, { status }, { projectId }: { projectId: string }) => {
          builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`);

          if (status) {
            builder.addFilter('status', status);
          }
        },
        params: taskList.params,
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expect(
        buildListRequest(list, readListState(list, '?status=open&page=3'), { projectId: '42' })
          .uri
      ).toBe('/projects/42/tasks?filters[status][$eq]=open&pagination[page]=3&pagination[pageSize]=15');
    });

    it('should not encode a resource segment again', () => {
      const list = defineList({
        apply: (builder, _state, { projectId }: { projectId: string }) => {
          builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`);
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expect(buildListRequest(list, readListState(list, ''), { projectId: 'a/b c' }).uri).toBe(
        '/projects/a%2Fb%20c/tasks?pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should encode an input used as a filter value', () => {
      expect(
        buildListRequest(taskList, readListState(taskList, ''), { projectId: 'a&b c' }).uri
      ).toBe('/tasks?filters[project][$eq]=a%26b%20c&pagination[page]=1&pagination[pageSize]=15');
    });

    it('should not leak an input into the next request', () => {
      const state = readListState(taskList, '');
      const first = buildListRequest(taskList, state, { projectId: '42' });

      buildListRequest(taskList, state, { projectId: '7' });

      expect(first.uri).toBe(buildListRequest(taskList, state, { projectId: '42' }).uri);
      expect(buildListRequest(taskList, state, { projectId: '7' }).uri).toBe(
        '/tasks?filters[project][$eq]=7&pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should give apply undefined when the list is held as ListDefinition<ListParams>', () => {
      const received: unknown[] = [];
      const list = defineList({
        apply: (_builder, _state, input: { projectId: string }) => {
          received.push(input);
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });
      const loose: ListDefinition<ListParams> = list;

      buildListRequest(loose, readListState(loose, ''));

      expect(received).toEqual([undefined]);
    });
  });

  describe('input types', () => {
    const state = readListState(taskList, '');
    const articleState = readListState(articleList, '');

    it('should require a declared input', () => {
      // @ts-expect-error — taskList declares an input
      expect(() => buildListRequest(taskList, state)).toThrowError(TypeError);
    });

    it('should require an input whose fields are all optional', () => {
      const list = defineList({
        apply: (builder, _state, { tenantId }: { tenantId?: string }) => {
          if (tenantId) {
            builder.addFilter('tenant', tenantId);
          }
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });
      const listState = readListState(list, '');

      // @ts-expect-error — a declared input is required, even when every field is optional
      expect(() => buildListRequest(list, listState)).toThrowError(TypeError);
      expect(buildListRequest(list, listState, {}).uri).toBe(
        '/tasks?pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should refuse an input for a list that declares none', () => {
      // @ts-expect-error — articleList declares no input
      buildListRequest(articleList, articleState, { projectId: '42' });
    });

    it('should refuse an input of the wrong shape', () => {
      // @ts-expect-error — projectId is a string
      buildListRequest(taskList, state, { projectId: 42 });
    });

    it('should compile without the input through ListDefinition<ListParams>', () => {
      const loose: ListDefinition<ListParams> = taskList;

      expect(() => buildListRequest(loose, readListState(loose, ''))).toThrowError(TypeError);
    });

    it('should refuse a third argument through ListDefinition<ListParams>', () => {
      const loose: ListDefinition<ListParams> = taskList;
      const looseState = readListState(loose, '');

      // @ts-expect-error — through the loose type, the list declares no input
      buildListRequest(loose, looseState, { projectId: '42' });
    });
  });

  describe('forwarding from generic code', () => {
    it('should forward the input', () => {
      expect(buildRequestFor(taskList, '?page=2', { projectId: '42' })?.uri).toBe(
        '/tasks?filters[project][$eq]=42&pagination[page]=2&pagination[pageSize]=15'
      );
    });

    it('should build nothing while the input is not ready', () => {
      expect(buildRequestFor(taskList, '', null)).toBeNull();
    });

    it('should build a list without an input', () => {
      expect(buildRequestFor(articleList, '?page=3')?.uri).toBe(
        buildListRequest(articleList, readListState(articleList, '?page=3')).uri
      );
    });

    it('should keep its callers checked', () => {
      // @ts-expect-error — taskList declares an input
      expect(() => buildRequestFor(taskList, '')).toThrowError(TypeError);
      // @ts-expect-error — articleList declares no input
      buildRequestFor(articleList, '', { projectId: '42' });
    });
  });
```

Why the `TypeError`s: `taskList`'s `apply` destructures its input, so calling it with `undefined`
throws inside `apply`. Core adds no guard, and the error propagates as any error from `apply` does.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run typecheck`
Expected: FAIL. "Expected 2 arguments, but got 3" on every three-argument `buildListRequest` call,
and "Unused '@ts-expect-error' directive" on the two-argument calls that should now be refused.

- [ ] **Step 3: Implement**

In `src/lists/build-list-request.ts`, replace the JSDoc, signature and the `apply` line. The rest
of the body is unchanged:

```ts
/**
 * Turn list state into the request for its page.
 *
 * Each call builds on a fresh `createQubee()` instance: it sets the resource,
 * runs the list's `apply` with the state and the input, and applies the page
 * **last**. `addFilter()`, `addFilterOperator()`, `addSort()`, `setLimit()`,
 * `setSearch()`, `setParam()` and `setResource()` all reset the page to 1, so
 * the page must come after them to survive.
 *
 * A page the store would reject — zero, negative or fractional, as a hand-edited
 * URL can carry when the page param sets no `min` — falls back to the list's default page.
 *
 * Errors from `apply` or `generateUri()` — a capability the driver lacks, a
 * param collision, an empty resource — are programmer errors and propagate.
 *
 * ```ts
 * const request = buildListRequest(articleList, readListState(articleList, '?page=3'));
 * const response = await fetch(request.uri, { headers: request.headers ?? {} });
 * const page = request.paginate<Article>(await response.json(), response.headers);
 * ```
 *
 * A list that declares an input takes it as a third argument; one that
 * declares none refuses it:
 *
 * ```ts
 * buildListRequest(taskList, readListState(taskList, search), { projectId: '42' });
 * ```
 *
 * @param list - The list, as `defineList()` returned it
 * @param state - The list state, as `readListState()` returned it
 * @param input - What the list's request needs besides URL state, for a list that declares an
 * input. The input never reaches the URL; `[uri, headers]` stays a complete cache key
 * @returns The URI, the headers, and a parser bound to the same instance
 * @throws If `apply` asks for something the driver cannot express, or the resource is invalid
 */
export function buildListRequest<
  TParams extends ListParams,
  TInput extends NonNullable<unknown> = never,
>(
  list: ListDefinition<TParams, TInput>,
  state: ParamsState<TParams>,
  // `NoInfer`: without it, a call that leaves the input out infers `never` from the empty
  // tuple, and compiles.
  ...input: [NoInfer<TInput>] extends [never] ? [] : [input: NoInfer<TInput>]
): ListRequest {
  const { builder, paginator } = createQubee(list.qubee);

  builder.setResource(list.resource);
  // `input` is `[]` or `[input]`, a tuple TypeScript cannot resolve while `TInput` is generic. Its
  // first item is the input, or `undefined` for a list that declares none.
  list.apply?.(builder, state, input[0] as TInput);
  builder.setPage(
    Number.isInteger(state.page) && state.page >= 1 ? state.page : list.params.page.default
  );
```

- [ ] **Step 4: Run the checks to verify they pass**

Run: `npm run typecheck && npx vitest run src/lists src/types`
Expected: PASS, every existing `buildListRequest` test included.

- [ ] **Step 5: Lint and format**

Run: `npm run lint:fix && npm run lint && npx prettier --write src`
Expected: no lint errors. If Prettier rewraps a line below a `@ts-expect-error`, rerun
`npm run typecheck`. Every directive must still sit directly above the line that errors.

- [ ] **Step 6: Run the full suite with coverage**

Run: `npx vitest run --coverage --exclude test/conventions.spec.ts`
Expected: PASS, with statements ≥ 98, branches ≥ 97, functions ≥ 99, lines ≥ 98.

Run: `npx vitest run test/conventions.spec.ts`
Expected: only `uses kebab-case filenames` fails (the known Windows failure). Any other failure is
yours to fix.

- [ ] **Step 7: Commit**

```bash
git add src/lists/build-list-request.ts src/lists/build-list-request.spec.ts
git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" commit -m "feat(lists): pass a list's input to apply from buildListRequest (#35)"
```

---

### Task 3: Guide: lists that need more than the URL

**Files:**
- Modify: `docs/src/content/docs/guide/lists.mdx` (the "Declaring a list" bullets; a new section
  after "Building the request")

**Interfaces:**
- Consumes: the API from Tasks 1 and 2, as documented in their JSDoc.
- Produces: the anchor `#lists-that-need-more-than-the-url`.

- [ ] **Step 1: Update the "Declaring a list" bullets**

Replace:

```md
- **`apply`** turns state into builder calls. It runs on a fresh builder whose resource is set.
- **`qubee`** is what [`createQubee()`](/guide/factory/) takes: the driver, a base URL, key
  overrides.
```

with:

```md
- **`apply`** turns state into builder calls. It runs on a fresh builder whose resource is set. A
  list whose request needs more than the URL takes a third argument; see
  [Lists that need more than the URL](#lists-that-need-more-than-the-url).
- **`qubee`** is what [`createQubee()`](/guide/factory/) takes: the driver, a base URL, key
  overrides.
- **`resource`** is the default resource, which `apply` may replace with `setResource()`.
```

- [ ] **Step 2: Add the section**

Insert after the `:::caution[Bee aware]` block that closes "Building the request" (the end of the
file):

````md
## Lists that need more than the URL

Some lists depend on something the query string does not hold. `/projects/42/tasks?status=open`
shows the tasks of project 42, but `42` lives in the path. A list declares what its request needs
besides URL state as its **input**: `apply` receives it as a third argument, and
`buildListRequest()` takes it as a third argument too.

```ts
import {
  buildListRequest,
  defineList,
  enumParam,
  integerParam,
  readListState,
  STRAPI_DRIVER,
} from '@qubeejs/core';

export const taskList = defineList({
  apply: (builder, { status }, { projectId }: { projectId: string }) => {
    builder.addFilter('project', projectId);

    if (status) {
      builder.addFilter('status', status);
    }
  },
  params: {
    page: integerParam('page', { default: 1, min: 1 }),
    status: enumParam('status', ['open', 'done']),
  },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'tasks',
});

// projectId and search are what your router gives you for /projects/42/tasks?status=open
const request = buildListRequest(taskList, readListState(taskList, search), { projectId });

request.uri; // '/tasks?filters[project][$eq]=42&filters[status][$eq]=open&pagination[page]=1&pagination[pageSize]=15'
```

- **Annotate `apply`'s third parameter** to declare the input: its type becomes the list's input.
  Without the annotation, the input is typed `undefined`, so using it in `apply`, or passing one
  to `buildListRequest()`, fails to compile.
- **A declared input is required.** Leaving it out is a compile error, and so is passing one to a
  list that declares none.
- **Prefer an object** such as `{ projectId }`: adding a value later then breaks no call site. A
  bare value (`projectId: string`) works too. `null` and `undefined` are refused, so optional parts
  go inside the object, as in `{ tenantId?: string }`, passed as `{}` when empty.
- **The input never reaches the URL.** `readListState()` and `buildListHref()` don't take it, and
  links carry only params. `[request.uri, request.headers]` stays a complete cache key, because the
  input only reaches the request through the builder.

### Lookups and request-scoped data

The core does no I/O, so anything asynchronous is resolved before the call. When the URL holds a
slug and the API filters by id, look the id up first:

```ts
const projectId = await findProjectId(slug); // your own lookup
const request = buildListRequest(taskList, readListState(taskList, search), { projectId });
```

Session data works the same way: a tenant, or the current user for "my items", goes into the input,
not into a param.

### Nested resources

`resource` is the default, and `apply` may replace it. For an API that nests tasks under their
project, set the resource from the input:

```ts
apply: (builder, { status }, { projectId }: { projectId: string }) => {
  builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`);

  if (status) {
    builder.addFilter('status', status);
  }
},
// '/projects/42/tasks?filters[status][$eq]=open&pagination[page]=1&pagination[pageSize]=15'
```

The resource is **not encoded**, so encode every path segment that comes from data, as above. The
page is still applied after `apply` returns, so replacing the resource does not lose it.

### Generic code

A list with an input is still a `ListDefinition<ListParams>`, so generic code, such as an adapter's
hook or a helper that takes any list, accepts it. Through that type, though, the requirement is
erased: `buildListRequest(list, state)` compiles without the input, `apply` receives `undefined`,
and a third argument is refused. Generic code carries the input itself, typed with
`ListInput<TList>`, and forwards it by holding the list twice, loose and widened:

```ts
import type {
  ListDefinition,
  ListInput,
  ListParams,
  ListRequest,
  SearchParamsInput,
} from '@qubeejs/core';

function buildRequestFor<TList extends ListDefinition<ListParams>>(
  list: TList,
  search: SearchParamsInput,
  ...args: [ListInput<TList>] extends [never] ? [] : [input: ListInput<TList>]
): ListRequest {
  const loose: ListDefinition<ListParams> = list;
  const wide: ListDefinition<ListParams, NonNullable<unknown>> = list;
  const [input] = args;
  const state = readListState(loose, search);

  return input === undefined ? buildListRequest(loose, state) : buildListRequest(wide, state, input);
}
```

`ListInput<typeof list>` is `never` for a list that declares no input, and
`[ListInput<TList>] extends [never]` is how generic code tells the two apart. The no-input branch
needs the loose copy: called on the generic `TList`, `buildListRequest()` asks for a third
argument. Callers stay checked: `buildRequestFor(taskList, search)` is a compile error.
````

- [ ] **Step 3: Build the docs**

Run: `cd docs && npm run build`
Expected: `Complete!`. Then
`grep -o 'id="lists-that-need-more-than-the-url"' docs/dist/guide/lists/index.html` prints the id,
and `git status --short` shows only `docs/src/content/docs/guide/lists.mdx` modified. The build's
generators must not touch tracked files.

- [ ] **Step 4: Commit**

```bash
git add docs/src/content/docs/guide/lists.mdx
git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" commit -m "docs(lists): guide lists whose request needs more than the url (#35)"
```

---

### Task 4: README and changelog

**Files:**
- Modify: `README.md` (the "Lists in the page URL" snippet)
- Modify: `CHANGELOG.md` (under `## [Unreleased]`)

**Interfaces:**
- Consumes: the API from Tasks 1 and 2.
- Produces: nothing later tasks use.

- [ ] **Step 1: README**

In `README.md`, under `## Lists in the page URL`, replace:

```ts
const { uri, headers, paginate } = buildListRequest(articleList, state); // page applied last
```

with:

```ts
const { uri, headers, paginate } = buildListRequest(articleList, state); // page applied last

// taskList declares an input: what its request needs besides the URL
const tasks = buildListRequest(taskList, readListState(taskList, location.search), { projectId });
```

- [ ] **Step 2: Changelog**

In `CHANGELOG.md`, directly under `## [Unreleased]` and **above** any `### Fixed` that #34 added
(Keep a Changelog orders Added before Fixed):

```md
### Added

- **Lists that need more than the URL.** A list declares a typed input, what its request needs
  besides URL state (such as a project id from the route path), by annotating `apply`'s third
  parameter, and `buildListRequest(list, state, input)` passes it to `apply`. Leaving a declared
  input out is a compile error, and so is passing one to a list that declares none; `null` and
  `undefined` are refused as inputs. `ListInput<TList>` reads a list's input, for adapters. The
  input never reaches the URL: `readListState()` and `buildListHref()` are unchanged, and the page
  is still applied last. Existing lists and two-argument `apply`s are unchanged (#35)
```

- [ ] **Step 3: Check formatting**

Run: `npx prettier --check --end-of-line auto README.md CHANGELOG.md`
Expected: `All matched files use Prettier code style!`

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" commit -m "docs: changelog entry and readme line for list inputs (#35)"
```

---

### Task 5: Verify, merge and close

**Files:** none.

- [ ] **Step 1: Run every gate**

```bash
npm run lint
npm run typecheck
npx vitest run --coverage --exclude test/conventions.spec.ts
npx vitest run test/conventions.spec.ts
npm run build
npx prettier --check --end-of-line auto .
```

Expected: everything passes except `uses kebab-case filenames` (known, Windows-only). Record the
coverage figures for the closing comment.

- [ ] **Step 2: Merge into develop and push**

```bash
git switch develop
git pull --ff-only
git -c user.name="Andrea Alhena Tantimonaco" -c user.email="info@andreatantimonaco.me" merge --no-ff feature/35 -m "Merge branch 'feature/35' into develop"
git push origin develop
```

- [ ] **Step 3: Close #35**

```bash
gh issue close 35 --comment "<summary>"
```

Write the summary from what actually shipped: the commits, the API (`ListDefinition`'s `TInput`,
`ListInput`, `buildListRequest`'s third argument), the docs touched, the coverage figures, the
SemVer impact (**minor**, 1.4.0), and what is left: a release issue for 1.4.0 (the maintainer's
call), and `@qubeejs/react` adopting the input with the forwarding pattern.
