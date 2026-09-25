/**
 * Parity harness — run with `npm run test:parity`.
 *
 * Not part of the unit suite: it installs ng-qubee and Angular on demand, which
 * is far too heavy for every `npm test`. Run it before a release, or whenever a
 * request strategy changes.
 *
 * Prove the extraction is faithful: for every driver, build the same query with
 * ng-qubee@3.8.0 and with @qubeejs/core, and compare the emitted URI byte for byte.
 *
 * ng-qubee's request strategies are pure and framework-free, so they can be
 * driven directly without Angular DI.
 */
import '@angular/compiler';
import * as ng from 'ng-qubee';
import * as core from '../../dist/index.js';

const DRIVERS = Object.values(core.DriverEnum).sort();

/** Apply the same query to a state object both libraries understand. */
function buildState(caps) {
  const state = {
    baseUrl: '',
    embedded: {},
    fields: {},
    filters: {},
    includes: [],
    isLastPageKnown: false,
    lastPage: 1,
    limit: 25,
    operatorFilters: [],
    page: 2,
    resource: 'articles',
    search: '',
    select: [],
    sorts: [],
  };
  if (caps.filters) state.filters = { status: ['published'], type: ['news', 'blog'] };
  if (caps.sort)
    state.sorts = [
      { field: 'createdAt', order: 'desc' },
      { field: 'title', order: 'asc' },
    ];
  if (caps.select) state.select = ['id', 'title'];
  if (caps.fields) state.fields = { articles: ['id', 'title'] };
  if (caps.includes) state.includes = ['author', 'comments'];
  if (caps.search) state.search = 'typescript';
  if (caps.embedded) state.embedded = { author: ['name', 'email'] };
  if (caps.operatorFilters) {
    state.operatorFilters = [
      { field: 'price', operator: '$gte', values: [10] },
      { field: 'views', operator: '$btw', values: [5, 500] },
    ];
  }
  return state;
}

const NG_STRATEGY = {
  'api-platform': 'ApiPlatformRequestStrategy',
  directus: 'DirectusRequestStrategy',
  drf: 'DrfRequestStrategy',
  feathers: 'FeathersRequestStrategy',
  'json-api': 'JsonApiRequestStrategy',
  'json-server': 'JsonServerRequestStrategy',
  laravel: 'LaravelRequestStrategy',
  nestjs: 'NestjsRequestStrategy',
  'nestjsx-crud': 'NestjsxCrudRequestStrategy',
  odata: 'OdataRequestStrategy',
  payload: 'PayloadRequestStrategy',
  pocketbase: 'PocketbaseRequestStrategy',
  postgrest: 'PostgrestRequestStrategy',
  sieve: 'SieveRequestStrategy',
  spatie: 'SpatieRequestStrategy',
  spring: 'SpringRequestStrategy',
  strapi: 'StrapiRequestStrategy',
  wordpress: 'WordpressRequestStrategy',
};

/**
 * Deliberate departures from ng-qubee, each a bug fixed here and still present
 * there. The expected URI is derived from ng-qubee's own output by the stated
 * rewrite, so the comparison stays byte for byte — against a documented rule
 * rather than a hand-copied string.
 */
const DIVERGENCES = {
  pocketbase: {
    issue: '#21',
    reason: 'the && conjunction is sent as %26%26 — a raw & ends the filter parameter',
    rewrite: (uri) => uri.replaceAll(' && ', ' %26%26 '),
  },
};

let pass = 0,
  diverged = 0,
  fail = 0;
const failures = [];

for (const id of DRIVERS) {
  const NgClass = ng[NG_STRATEGY[id]];
  if (!NgClass) {
    console.log(`  ?  ${id.padEnd(14)} not exported by ng-qubee`);
    continue;
  }

  const ngStrategy = new NgClass();
  const coreStrategy = core.DRIVERS[id].createRequestStrategy('query');
  const state = buildState(coreStrategy.capabilities);

  const ngOptions = new ng.QueryBuilderOptions({});
  const coreOptions = new core.QueryBuilderOptions({});

  let a, b;
  try {
    a = ngStrategy.buildUri(state, ngOptions);
  } catch (e) {
    a = `THREW: ${e.message}`;
  }
  try {
    b = coreStrategy.buildUri(state, coreOptions);
  } catch (e) {
    b = `THREW: ${e.message}`;
  }

  const divergence = DIVERGENCES[id];

  if (!divergence && a === b) {
    pass += 1;
    console.log(`  ok ${id.padEnd(14)} ${b.slice(0, 78)}`);
  } else if (divergence && divergence.rewrite(a) === b && a !== b) {
    diverged += 1;
    console.log(`  ~~ ${id.padEnd(14)} ${divergence.issue}: ${divergence.reason}`);
  } else {
    fail += 1;
    failures.push({ id, ng: a, core: b });
    console.log(`  XX ${id.padEnd(14)} MISMATCH`);
  }
}

console.log(`\n  ${pass} identical, ${diverged} diverged as documented, ${fail} mismatched`);
for (const f of failures) {
  console.log(`\n  --- ${f.id} ---\n    ng-qubee : ${f.ng}\n    qubee    : ${f.core}`);
}
process.exit(fail ? 1 : 0);
