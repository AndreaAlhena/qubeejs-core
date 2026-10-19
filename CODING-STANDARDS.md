# Coding Standards

These rules are derived from measured practice in `ng-qubee`, not aspiration. Where a number is
given, it is the compliance rate in the source this library was extracted from.

Anything marked **[auto]** is enforced and auto-fixed by ESLint or Prettier — don't hand-maintain it.

## Naming

### Files

`kebab-case`, with a suffix that states the kind:

| Suffix           | Contents                                                 |
| ---------------- | -------------------------------------------------------- |
| `*.interface.ts` | An interface a class actually `implements`               |
| `*.type.ts`      | Any other type — data shapes, unions, DTOs, mapped types |
| `*.enum.ts`      | An enum                                                  |
| `*.error.ts`     | An error class                                           |
| `*.strategy.ts`  | A request or response strategy                           |
| `*.spec.ts`      | Tests, colocated beside the file under test              |

### Interface vs type — the decision rule

Ask: **will a class `implements` this?**

- **Yes** → `interface`, named with an `I` prefix, in `*.interface.ts`.
- **No** → `type`, no prefix, in `*.type.ts`.

In this library exactly **two** files qualify: `IRequestStrategy` and `IResponseStrategy`.
Everything else is data and must be a `type`.

A class _can_ technically `implements` a type alias — the rule is a readability convention, not a
compiler constraint. The substantive reason to prefer `type` for data is that **`interface` is
open**: two declarations of the same name merge silently, so in a published library a consumer or a
stray `.d.ts` can augment your public shapes with no error. `type` is closed.

ESLint cannot express this rule (`consistent-type-definitions` is all-or-nothing), so it is
enforced by review and by the filename split.

### Symbols

- Classes, interfaces, types, enums: `PascalCase` **[auto]**
- Enums end in `Enum`; members are `UPPER_CASE` **[auto]**
- Variables, functions, members: `camelCase` **[auto]**
- **Constants — casing states how the value is produced** _(enforced by
  `test/conventions.spec.ts`)_:
  - `UPPER_SNAKE_CASE` for **literal / static** values — a string, number, regex, or an object or
    array literal written out in the source. `DRIVERS`, `STRAPI_DRIVER`, `DECL`.
  - `camelCase` for anything **computed at runtime**, even when it never reassigns.
    `const rootDir = join(...)` is camelCase because a function call produced it.

    ```ts
    const DEFAULT_PAGE_SIZE = 15; // literal        -> UPPER_SNAKE_CASE
    const DECL = /^export\s+/gm; // regex literal  -> UPPER_SNAKE_CASE
    const rootDir = join(base, '..'); // computed       -> camelCase
    ```
- A leading `_` on a **parameter** means "intentionally unused" and is exempt from
  `no-unused-vars`. That is a separate convention from the private-member prefix below; both are
  in use and they do not conflict.

### Member visibility prefixes **[auto]**

- `private` members **must** carry a leading underscore — `_assertCapability`, `_uri`
- `protected` and `public` members **must not** — `parts()`, `buildUri()`

Both halves are enforced by `naming-convention` (`leadingUnderscore: 'require'` / `'forbid'`).

### Enums at the API boundary

Enums stay as `enum` declarations. Alongside each, a **derived union** widens the _public_ input
surface:

```ts
export type Driver = `${DriverEnum}`; // 'laravel' | 'strapi' | …
```

This lets a consumer write `{ driver: 'strapi' }` as well as `{ driver: DriverEnum.STRAPI }`, which
matters for React and plain-JS callers and for config that arrives as a string from an env var.

**The widening applies to public method parameters only. Internal state keeps the enum type.**
Widening state breaks two things that were verified to matter here:

- the per-driver `switch` statements over `FilterOperatorEnum`, one in every driver with operators,
  enumerate every member with **no `default:`** — that is what makes them provably exhaustive, and
  a string union defeats the narrowing;
- every request strategy that sorts, and the sort utilities, compare `sort.order === SortEnum.DESC`,
  which `no-unsafe-enum-comparison` rejects across a union.

So: widen at the door, normalize inward.

## One kind per file

A file declares **one kind of thing**, and its name says which. A file that exports a `const` does
not also export an `interface`; a file that exports a class does not also export a type.

The one exception: a **non-exported** helper type used by a single private method may live beside
it, rather than being hoisted into a public `*.type.ts` for no one's benefit.

`test/conventions.spec.ts` enforces all of this — one kind per file, interfaces only in
`*.interface.ts`, exported types only in `*.type.ts`, the `I` prefix only on interfaces a class
implements, `*Enum` naming, kebab-case filenames, no framework imports, and no network I/O.

## Ordering **[auto]**

**Alphabetise everything that can be alphabetised** — imports, named import bindings, class
members, object literals, JSON keys, ESLint rules, `tsconfig` options, `package.json` fields.

`prettier-plugin-sort-json` sorts every JSON file recursively (including `package.json`, which
needs the `parser: "json"` override to be reachable). `perfectionist` sorts imports and class
members in TypeScript.

### The one place alphabetical order is wrong

`perfectionist/sort-objects` is enabled for **config files only**, never for `src/`. The request
strategies pass object literals to `qs.stringify`, which emits keys in **insertion order** — so
literal order is wire-significant, and sorting it silently reorders query strings. This is not
theoretical: enabling the rule across `src/` broke 4 driver tests.

Where key order carries meaning, meaning wins.

Class members are grouped in this order:

```
index signatures → static props → private props → protected props → public props
→ constructor → private methods → protected methods → public methods
```

Imports are sorted alphabetically, as are named import bindings. All of this is auto-fixed by
`eslint-plugin-perfectionist`; never reorder by hand.

## Type safety

- **No `any`.** `no-explicit-any` is an error, not a warning. Use `unknown` and narrow.
- **Explicit return types** on every function and method **[auto-checked]**.
- **`import type`** for type-only imports **[auto]** — they are erased at build time, and a
  runtime export accidentally treated as type-only will silently vanish from the bundle.
- **Exhaustive switches** over enums are enforced (`switch-exhaustiveness-check`). Adding a driver
  must not silently skip a `case`.

## Structure

- **Guard clauses over nesting.** Return early; avoid `else`.
- **Small, focused functions.** Break up walls of logic.
- **Separate declarative blocks from logic blocks.**

## Documentation

Every exported class, method, function, type and enum carries JSDoc. In this library the JSDoc is
load-bearing — it encodes per-backend wire-format quirks that are not obvious from the code.

## Testing

- Every new feature ships with tests; every bug fix ships with a regression test.
- Unit specs are colocated: `laravel-request.strategy.spec.ts` beside
  `laravel-request.strategy.ts`.
- Repo-wide checks that belong to no single source file live in `test/` —
  `test/conventions.spec.ts`, `test/drivers.spec.ts`. Their helper types follow the same rule as
  everything else and live in `test/*.type.ts`.
- **`test/` is covered by the convention checks too.** It was not at first, which is precisely why
  the first two test files shipped with `UPPER_CASE` names on computed values and a type declared
  inline. A guard that skips the code you are currently writing is not a guard.
- Structure: `describe('Subject') > describe('method') > it('should …')`, arrange/act/assert.
- Coverage thresholds are enforced in `vitest.config.ts` and must not be lowered to make a build
  pass.

## Git

### Commits

[Conventional Commits](https://www.conventionalcommits.org/), lowercase, imperative, scoped, short.
Reference the issue number.

```
feat(postgrest): support embedded resources (#12)
fix(response-options): stop '' collapsing to the laravel default (#31)
test(driver-registry): cover every driver definition (#8)
chore(deps): bump vitest to 5.0 (#40)
docs(readme): document the react adapter (#22)
```

**Commit messages must not contain AI assistant credits or co-author trailers.**

Keep commits **atomic** — one logical change each. A formatting pass and a behaviour change never
share a commit.

### Definition of done

Code, **plus** a `CHANGELOG.md` entry, an explicit SemVer impact, and any docs the change
invalidates. See [CONTRIBUTING.md](./CONTRIBUTING.md#definition-of-done).

### Branching

```
feature/<issue-number>  →  develop  →  master
```

One branch per operational block, tracked by a GitHub issue. `master` is release-only.
