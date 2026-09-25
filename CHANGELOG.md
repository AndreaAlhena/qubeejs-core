# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Documentation site now matches the provided design: a custom 404, a changelog page generated
  from `CHANGELOG.md`, top-level section navigation with a version chip, and the bee mark inside
  "Bee aware" callouts (#19)
- Landing page rebuilt against the design markup: two-column hero with the bee mark, radial glow,
  pill badge, hexagon feature icons, framed code sample and the driver grid (#20)
- Doc-page chrome matched to the design — sidebar rails, table of contents, previous/next cards,
  heading scale, honey-tinted inline code, and a breadcrumb above each title (#21)
- Repository renamed from `qubee-core` to `qubeejs-core`, matching the `@qubeejs/core` package
  name. All repository links — the CI badge, the docs edit and GitHub links, and the changelog
  comparison links — now point at the new URL; GitHub redirects the old one

### Fixed

- `PaginatedObject` is `object` rather than `Record<string, unknown>`, so `paginate<User>()` and
  `PaginatedCollection<User>` accept an `interface` or a class row again, as `ng-qubee` 3.x did.
  TypeScript grants an implicit index signature to a `type` alias but never to an interface, and
  the old constraint depended on it (#20)

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

[unreleased]: https://github.com/AndreaAlhena/qubeejs-core/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AndreaAlhena/qubeejs-core/releases/tag/v1.0.0
