# qubee

Framework-agnostic query builder and paginator. Extracted from `ng-qubee`; consumed by
`@qubee/angular` and `@qubee/react` adapters.

## Coding standards

See **[CODING-STANDARDS.md](./CODING-STANDARDS.md)** — it is the single source of truth. Read it
before writing code. Highlights that are easy to get wrong:

- `private` members require a leading `_`; `protected` and `public` must not have one.
- `interface` + `I` prefix + `*.interface.ts` **only** when a class implements it (2 files in this
  repo). Everything else is a `type` in `*.type.ts`.
- Ordering is auto-fixed by `eslint-plugin-perfectionist` — run `npm run lint:fix`, don't reorder
  by hand.
- No `any`. No AI credits in commit messages.
- **Every issue ships code + changelog entry + stated SemVer impact + docs.** Not code alone.

## Commands

```bash
npm run build         # tsup → dual ESM + CJS
npm test              # vitest run
npm run test:coverage
npm run lint          # eslint
npm run lint:fix
npm run typecheck     # tsc --noEmit
npm run format
```

## Architecture

The library **builds URIs and parses responses — it performs no I/O.** There is no HTTP client and
no transport layer; consumers fetch however they like and hand the response body back.

```
src/
├─ drivers/      one <driver>.driver.ts per backend + driver-registry.ts composing them
├─ enums/        DriverEnum, FilterOperatorEnum, PaginationModeEnum, SortEnum
├─ errors/       QubeeError base + 15 concrete errors
├─ interfaces/   IRequestStrategy, IResponseStrategy — the only two class contracts
├─ models/       PaginatedCollection, QueryBuilderOptions, ResponseOptions
├─ services/     QueryBuilder, QubeeStore, Paginator
├─ strategies/   18 request + 18 response strategies, over 3 abstract bases
├─ types/        data shapes and derived unions
└─ utils/        read-header, stringify
```

**Adding a driver:** four steps — a `DriverEnum` member, a request strategy extending
`AbstractRequestStrategy` (override `parts()`), a response strategy, and `drivers/<id>.driver.ts`
exporting one `<ID>_DRIVER` const plus a line in `DRIVERS`. The `Record<DriverEnum, …>` registry is
deliberately closed, so the compiler tells you what's missing. Copy any existing `*.driver.ts` as
the template.

**Bundle note:** `DRIVERS` reaches every driver by construction (~50 kB minified). A consumer that
knows its backend at build time should `import { STRAPI_DRIVER } from '@qubeejs/core'` instead
(~6.7 kB minified / 2.6 kB gzipped).

**Reactivity:** `QubeeStore` exposes `getSnapshot()` + `subscribe()` — deliberately the
`useSyncExternalStore` contract. The core has no Signals and no RxJS; adapters supply their own.
