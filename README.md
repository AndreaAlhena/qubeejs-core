# @qubeejs/core

Framework-agnostic query builder and paginator with pluggable drivers for 18 backend querying
standards.

> Extracted from [ng-qubee](https://github.com/AndreaAlhena/ng-qubee), which remains fully
> supported and unaffected. Every URI is verified byte-for-byte against `ng-qubee@3.8.0` across all
> eighteen drivers, apart from the bugs fixed here and still present there, each listed with its
> issue — see `npm run test:parity`.

[![CI](https://github.com/AndreaAlhena/qubeejs-core/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreaAlhena/qubeejs-core/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**[Documentation](https://qubeejs.andreatantimonaco.me)**

## What it does

Builds query URIs and parses paginated responses. **It performs no I/O** — there is no HTTP client
and no transport layer. You fetch however you like and hand the response body back.

That is what makes it framework-agnostic: no Angular, no React, no RxJS, no Signals.

```ts
import { createQubee, STRAPI_DRIVER, SortEnum } from '@qubeejs/core';

const { builder, paginator } = createQubee({ driver: STRAPI_DRIVER });

const uri = builder
  .setResource('articles')
  .addFilter('status', 'published')
  .addSort('createdAt', SortEnum.DESC)
  .setLimit(25)
  .generateUri();
// → /articles?filters[status][$eq]=published&sort[0]=createdAt:desc
//   &pagination[page]=1&pagination[pageSize]=25
```

Then fetch it however you like, and hand the body back:

```ts
const body = await fetch(`https://example.com/api${uri}`).then((r) => r.json());
const page = STRAPI_DRIVER.createResponseStrategy().paginate(
  body,
  STRAPI_DRIVER.createResponseOptions({})
);

page.data; // rows
page.total; // 57
page.lastPage; // 6
```

## Why it is small

Zero runtime dependencies, and importing one driver leaves the other seventeen out of your bundle:

| import                       | minified | gzipped    |
| ---------------------------- | -------- | ---------- |
| `STRAPI_DRIVER` (one driver) | 6.5 kB   | **2.5 kB** |
| `DRIVERS` (all eighteen)     | 49 kB    | 9.5 kB     |

Reach for `DRIVERS` only when the backend is chosen at runtime.

## Reactivity

The core has no Signals and no RxJS. `QubeeStore` exposes the
[`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) contract, so each
adapter supplies its own:

```ts
const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
```

## Supported drivers

API Platform · Directus · Django REST Framework · Feathers · JSON:API · json-server · Laravel ·
NestJS · @nestjsx/crud · OData · Payload · PocketBase · PostgREST · Sieve · Spatie · Spring Data
REST · Strapi · WordPress REST

## Adapters

| Package                                                | Framework            |
| ------------------------------------------------------ | -------------------- |
| `@qubeejs/core`                                        | none — vanilla TS/JS |
| [`ng-qubee`](https://github.com/AndreaAlhena/ng-qubee) | Angular              |
| `@qubee/react`                                         | React _(planned)_    |

## Contributing

See [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## License

MIT © [Andrea Tantimonaco](https://andreatantimonaco.me)
