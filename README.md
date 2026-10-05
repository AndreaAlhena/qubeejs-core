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

Builds query URIs, parses paginated responses, and reads and writes list state in the page URL.
**It performs no I/O** — there is no HTTP client and no transport layer, and it never navigates or
subscribes to a router. You fetch however you like and hand the response body back.

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

## Lists in the page URL

A list page that keeps its query in the URL — `/articles?q=react&sort=title&page=2` — declares the
list once, and the core does the string work in both directions:

```ts
import { buildListHref, buildListRequest, readListState } from '@qubeejs/core';

// articleList = defineList({ resource, qubee, params, apply }) — see the guide
const state = readListState(articleList, location.search); // typed; never throws
const href = buildListHref(articleList, location, { q: 'vue' }); // back to page 1
const { uri, headers, paginate } = buildListRequest(articleList, state); // page applied last

// taskList declares an input: what its request needs besides the URL
const tasks = buildListRequest(taskList, readListState(taskList, location.search), { projectId });
```

These are pure transformations too: the core reads and writes URLs, but never navigates, subscribes
to a router or fetches. See
[Lists & URL state](https://qubeejs.andreatantimonaco.me/guide/lists/).

## When the driver is not enough

- **A parameter no driver models** — a top-level `status`, say — goes through `setParam()`. It
  works on every driver, and throws rather than shadow a parameter the driver emits:

  ```ts
  builder.setParam('status', 'failed'); // → …&status=failed
  ```

- **A backend no driver covers** gets a `DriverDefinition` of your own, with an `id` of its own
  that errors will name. See
  [Writing a driver](https://qubeejs.andreatantimonaco.me/extending/writing-a-driver/).
- **A server-rendered page** can pass `page.toPlain()` — a plain-object copy — to a React Client
  Component, which refuses class instances.

## Why it is small

Zero runtime dependencies, and importing one driver leaves the other seventeen out of your bundle:

| import                       | minified | gzipped    |
| ---------------------------- | -------- | ---------- |
| `STRAPI_DRIVER` (one driver) | 7.1 kB   | **2.7 kB** |
| `DRIVERS` (all eighteen)     | 50 kB    | 9.6 kB     |

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

| Package                                                           | Framework            |
| ----------------------------------------------------------------- | -------------------- |
| `@qubeejs/core`                                                   | none — vanilla TS/JS |
| [`ng-qubee`](https://github.com/AndreaAlhena/ng-qubee)            | Angular              |
| [`@qubeejs/react`](https://github.com/AndreaAlhena/qubeejs-react) | React                |

## Contributing

See [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## License

MIT © [Andrea Tantimonaco](https://andreatantimonaco.me)
