# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-30

### Added

- **Parameters no driver models.** `QueryBuilder.setParam(key, ...values)` and
  `deleteParams(...keys)` emit what a backend accepts beyond the driver's own parameters — a
  top-level `status`, an `include` on a driver without includes. `generateUri()` appends them
  after the request strategy returns, so all eighteen drivers emit them, and so does a custom
  strategy that implements `IRequestStrategy` directly. No capability gates them. Keys are
  literal; each value is percent-encoded like a filter value, then the values are joined with a
  literal `,` (`setParam('ids', 'a,b', 'c')` → `ids=a%2Cb,c`). Both methods reset the page to 1,
  and `reset()` clears them. They live in the new `QueryBuilderState.params` (`Params`), which
  is optional in the type so state literals written against 1.1 still compile; the store always
  sets it (#22)
- `ParamCollisionError` (`PARAM_COLLISION`), thrown by `generateUri()` when a param would
  duplicate or override one the driver emits: its key equals one in the generated URI, or one
  key is the other followed by `[` (`page` against JSON:API's `page[number]`). The check reads
  the URI the driver actually produced, so it covers custom strategies and leaves a key free
  until the driver needs it — except pagination keys: the next page's URI is checked too, so
  PostgREST's `offset` and OData's `$skip` collide on page 1, where they are not yet emitted (#22)
- `DriverId`, `Driver | (string & {})`: any string, while editors keep suggesting the eighteen
  built-in ids (#22)
- `PaginatedCollection.toPlain()`, returning a `PaginatedResult<T>`: an object literal with a new
  `data` array and every pagination field, `null` where the backend reported nothing so
  `JSON.stringify` keeps every key. React Server Components refuse to pass class instances to
  Client Components; this is the shape to hand them. The collection itself is unchanged (#22)

### Changed

- **Custom drivers can name themselves.** `DriverDefinition.id`, `QueryBuilder`'s `driver`
  argument and `UnsupportedCapabilityError.driver` (with its eight subclasses) are typed
  `DriverId` rather than `Driver`. A driver defined outside the package no longer has to borrow a
  built-in id, so its capability errors name it. `DRIVERS` stays keyed by `DriverEnum` and
  `Config.driver` stays `Driver`, since both resolve through the registry. Code that passes a
  definition's `id` somewhere typed `Driver` now needs a check first (#22)
- JSDoc names `QueryBuilder`, `Paginator` and `QubeeStore` where it still named ng-qubee's
  `NgQubeeService`, `PaginationService`, `NestService`, `nest()` and `provideNgQubee` — on
  `PaginationModeEnum`, `StrategyCapabilities`, `IRequestStrategy`, `QubeeStore`, `QueryBuilder`
  and several strategies. `QueryBuilder` and `PaginatedCollection` gain the class comments they
  lacked (#22)
- The generated API reference renders `{}`, index signatures, `keyof` and rest parameters as
  declared, so `DriverId`, `Params` and `setParam()` read as they are written (#22)
- A single-driver import is 2.7 kB gzipped, up from 2.6 kB: every response strategy now carries
  `toPlain()`. All eighteen drivers stay at 9.6 kB (#22)

### Fixed

- `PaginationNotSyncedError` told core consumers to call `PaginationService.paginate()`, which
  exists only in ng-qubee. It now names `Paginator.paginate()`; the code is unchanged (#22)

## [1.1.0] - 2026-09-25

### Changed

- Documentation site now matches the provided design: a custom 404, a changelog page generated
  from `CHANGELOG.md`, top-level section navigation with a version chip, and the bee mark inside
  "Bee aware" callouts (#19)
- Landing page rebuilt against the design markup: two-column hero with the bee mark, radial glow,
  pill badge, hexagon feature icons, framed code sample and the driver grid
- Doc-page chrome matched to the design — sidebar rails, table of contents, previous/next cards,
  heading scale, honey-tinted inline code, and a breadcrumb above each title
- Repository renamed from `qubee-core` to `qubeejs-core`, matching the `@qubeejs/core` package
  name. All repository links — the CI badge, the docs edit and GitHub links, and the changelog
  comparison links — now point at the new URL; GitHub redirects the old one
- A single-driver import is 2.6 kB gzipped, up from 2.5 kB: every driver now carries the value
  encoder (#21)
- `package.json` declares its `repository`. npm trusted publishing requires `repository.url` to
  match the publishing GitHub repository, and the npm page now links back to it

### Fixed

- `PaginatedObject` is `object` rather than `Record<string, unknown>`, so `paginate<User>()` and
  `PaginatedCollection<User>` accept an `interface` or a class row again, as `ng-qubee` 3.x did.
  TypeScript grants an implicit index signature to a `type` alias but never to an interface, and
  the old constraint depended on it (#20)
- **Filter values and search terms are percent-encoded.** No driver encoded them, so a `&` split
  the value into a new parameter, a `#` cut off everything after it — pagination included — and
  a `%` became an invalid escape; user input could inject parameters of its own. Values are now
  encoded once, in `AbstractRequestStrategy.buildUri()`, while keys, operator syntax and the `,`
  joining several values stay literal. **If you called `encodeURIComponent()` on values yourself,
  remove it** — it will now double-encode. Custom strategies extending the base receive encoded
  values and must not encode them again (#21)
- PocketBase joined filter clauses with a raw `&&`, so any filter with more than one condition
  reached the server cut off at the first `&`. It is now sent as `%26%26` (#21)
- PostgREST `CONTAINS` and PocketBase `SW` wrote a bare `%` wildcard into the URI — an invalid
  escape. PostgREST now uses its documented `*` wildcard; PocketBase sends `%25` (#21)

### Internal

- The parity harness records deliberate divergences from `ng-qubee@3.8.0`, each with its issue
  and a rewrite of `ng-qubee`'s URI into the expected one, so the comparison stays byte for byte.
  PocketBase is the first: 17 drivers identical, 1 diverged as documented (#21)

## [1.0.0] - 2026-09-08

First release. `@qubeejs/core` is the framework-agnostic engine extracted from
[ng-qubee](https://github.com/AndreaAlhena/ng-qubee), which remains supported and unaffected.

Every URI this library builds was verified byte-for-byte against `ng-qubee@3.8.0` across all
eighteen drivers before release — see `test/parity/` and `npm run test:parity`.

### Added

- **The core**, with no Angular, no React, no RxJS and no Signals, and **zero runtime
  dependencies**: 18 backend drivers, each with a request and a response strategy (#1)
- `QueryBuilder` — the fluent, capability-checked builder. `generateUri()` is synchronous and
  throws; URI construction never performed I/O (#6)
- `QubeeStore` — state exposed as `getSnapshot()` + `subscribe()`, deliberately React's
  `useSyncExternalStore` contract, so each adapter supplies its own reactivity (#5)
- `Paginator` — parses a response through the driver's response strategy and syncs the page and
  last page back into the store, so navigation helpers stop throwing (#16)
- `createQubee({ driver })` — wires the three together sharing one store, at a measured cost of
  108 bytes over hand-wiring. Takes a driver _definition_ rather than an id, so it never pulls the
  registry into a consumer's bundle (#18)
- `QubeeError` base carrying a machine-readable `code`, diagnostic `context` and ES2022 `cause`,
  with `Object.setPrototypeOf` hardening so `instanceof` survives downlevelling (#8)
- Derived union types — `Driver`, `FilterOperator`, `PaginationMode`, `SortDirection` — alongside
  the enums, so `{ driver: 'strapi' }` and `{ driver: DriverEnum.STRAPI }` both typecheck (#2)
- `RawResponse`, modelling the bare-array body PostgREST and the WordPress REST API return, which
  the previous types could not express (#7)
- `PaginatedCollection.normalize()` accepts a selector function as well as a key name (#7)
- `id` on `DriverDefinition`, so a driver passed on its own can still name itself in errors (#18)
- Public API as named re-exports from `src/index.ts` — including the three `Abstract*` bases,
  `StrategyCapabilities` and the registry, so third parties can author a driver (#11)
- One file per driver under `src/drivers/`, which is what makes a single-driver import
  tree-shakeable (#15)
- A [documentation site](https://qubeejs.andreatantimonaco.me): 145 pages, with the API
  reference, all 18 driver pages and the capability matrix generated from source (#17)

### Fixed

Carried over from `ng-qubee`, where these are still present:

- `ResponseOptions` merged with `||`, so a subclass passing `''` to mean "this driver derives the
  field" had its intent replaced by the Laravel default. Affected 11 of 14 drivers (#9)
- All eight `Unsupported*Error` messages named specific drivers, and every one had become
  factually wrong — _"Filters are only supported by the Spatie and NestJS drivers"_ when 16 of 18
  support them. Messages are now derived from the capability and the active driver (#8)
- `KeyNotFoundError` and `UnselectableModelError` never set `this.name`, so `err.name` was
  `'Error'` (#8)
- Response strategies widened `paginate()` to `Record<string, any>` while the interface declared
  `Record<string, unknown>`; TypeScript's bivariance hid the mismatch (#7)
- Dot-path resolution could not read OData envelope keys, which contain literal dots
  (`@odata.count`). An exact key match is now preferred before splitting (#7)
- The two response bases disagreed about a missing page: one defaulted to 1, the other yielded
  `undefined` for a field declared `number`, which then threw from the store (#18)
- `hasOwnProperty` called directly on instances, and `${array}` relying on implicit
  `Array.toString()` coercion (#13)

### Changed

- **`qs` is gone.** It was used only for `stringify(payload, { encode: false })`; a 40-line
  internal serialiser replaces it, verified against `qs` case by case. A single-driver import fell
  from 15.7 kB to **2.5 kB gzipped** (#10)
- Data shapes are un-prefixed `type`s in `*.type.ts`. `I` and `*.interface.ts` are reserved for the
  two interfaces a class actually implements (#2)
- `header-bag.interface.ts` split into a type and a util — it exported a runtime function from a
  `.interface.ts` file, which type-only elision could have dropped (#3)
- Snapshots handed out by `QubeeStore` are deeply frozen. Identity stays stable between writes, as
  `useSyncExternalStore` requires, and tampering throws instead of silently corrupting a later
  read (#5)

### Internal

- 1,270 tests ported and added; 98.6% statement coverage, enforced in CI (#4)
- `test/conventions.spec.ts` enforces the structural standards — one declaration kind per file,
  filename suffixes, the `I` prefix, constant casing — so a slip fails the build (#14)
- CI verifies both entry points resolve, that there are no runtime dependencies, and that a
  single-driver import still tree-shakes (#12)

[unreleased]: https://github.com/AndreaAlhena/qubeejs-core/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/AndreaAlhena/qubeejs-core/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/AndreaAlhena/qubeejs-core/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AndreaAlhena/qubeejs-core/releases/tag/v1.0.0
