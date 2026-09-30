/**
 * Generate the driver pages and the capability matrix from the library itself.
 *
 * Every request strategy exposes `capabilities` as eight public booleans, so
 * the 18 x 8 matrix is read from the shipped code rather than transcribed —
 * it cannot drift the way the hardcoded error messages did.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'src', 'content', 'docs', 'drivers');

// import() takes a URL, not a path: a bare `C:\…` path fails on Windows.
const { DRIVERS, DriverEnum, QubeeStore, QueryBuilder, SortEnum } = await import(
  pathToFileURL(join(here, '..', '..', 'dist', 'index.js')).href
);

const CAPABILITIES = [
  ['filters', 'Filters', 'addFilter()'],
  ['operatorFilters', 'Operators', 'addFilterOperator()'],
  ['sort', 'Sort', 'addSort()'],
  ['select', 'Select', 'addSelect()'],
  ['fields', 'Fields', 'addFields()'],
  ['includes', 'Includes', 'addIncludes()'],
  ['search', 'Search', 'setSearch()'],
  ['embedded', 'Embedded', 'addEmbedded()'],
];

/** Human-facing name for each driver id. */
const LABELS = {
  'api-platform': 'API Platform',
  directus: 'Directus',
  drf: 'Django REST Framework',
  feathers: 'FeathersJS',
  'json-api': 'JSON:API',
  'json-server': 'json-server',
  laravel: 'Laravel',
  nestjs: 'nestjs-paginate',
  'nestjsx-crud': '@nestjsx/crud',
  odata: 'OData v4',
  payload: 'Payload CMS',
  pocketbase: 'PocketBase',
  postgrest: 'PostgREST',
  sieve: 'Sieve',
  spatie: 'spatie/laravel-query-builder',
  spring: 'Spring Data REST',
  strapi: 'Strapi',
  wordpress: 'WordPress REST API',
};

const ids = Object.values(DriverEnum).sort();
const caps = new Map(
  ids.map((id) => [id, DRIVERS[id].createRequestStrategy('query').capabilities])
);

/** Build a sample URI for a driver, skipping anything it cannot express. */
function sampleUri(id) {
  const store = new QubeeStore();
  const qb = new QueryBuilder(store, DRIVERS[id].createRequestStrategy('query'), undefined, id);
  qb.setResource('articles').setLimit(25);
  if (caps.get(id).filters) qb.addFilter('status', 'published');
  if (caps.get(id).sort) qb.addSort('createdAt', SortEnum.DESC);
  return qb.generateUri();
}

rmSync(join(outDir, 'reference'), { force: true, recursive: true });
mkdirSync(join(outDir, 'reference'), { recursive: true });

// --- capability matrix ---------------------------------------------------

const header = `| Driver | ${CAPABILITIES.map(([, label]) => label).join(' | ')} |`;
const rule = `| --- | ${CAPABILITIES.map(() => ':---:').join(' | ')} |`;
const rows = ids.map((id) => {
  const c = caps.get(id);
  return `| [${LABELS[id]}](/drivers/reference/${id}/) | ${CAPABILITIES.map(
    ([key]) => (c[key] ? '✅' : '—')
  ).join(' | ')} |`;
});

const totals = CAPABILITIES.map(
  ([key]) => ids.filter((id) => caps.get(id)[key]).length
);

writeFileSync(
  join(outDir, 'capabilities.mdx'),
  `---
title: Capability matrix
description: Which of the eight query features each of the 18 drivers supports.
sidebar:
  order: 2
---

{/* Generated from DRIVERS by scripts/generate-drivers.mjs — do not edit. */}

Not every backend can express every query. Each request strategy declares what it supports, and
the builder throws rather than emitting a URI the server would silently ignore.

This table is read from the shipped \`capabilities\` flags, so it is always what the code does.

${header}
${rule}
${rows.join('\n')}
| **Supported by** | ${totals.map((t) => `**${t}/18**`).join(' | ')} |

## What each column means

| Capability | Method | Meaning |
| --- | --- | --- |
${CAPABILITIES.map(
  ([key, label, method]) =>
    `| ${label} | \`${method}\` | \`capabilities.${key}\` |`
).join('\n')}

:::caution[Bee aware]
Calling an unsupported method throws immediately — it does not fail silently at request time. Catch
\`UnsupportedCapabilityError\`, or check \`strategy.capabilities\` first.
:::
`
);

// --- one page per driver -------------------------------------------------

for (const [i, id] of ids.entries()) {
  const c = caps.get(id);
  const supported = CAPABILITIES.filter(([k]) => c[k]);
  const missing = CAPABILITIES.filter(([k]) => !c[k]);
  const constName = `${id.toUpperCase().replace(/-/g, '_')}_DRIVER`;

  writeFileSync(
    join(outDir, 'reference', `${id}.mdx`),
    `---
title: ${JSON.stringify(LABELS[id])}
description: Using the ${LABELS[id]} driver with @qubeejs/core.
sidebar:
  order: ${i + 1}
---

{/* Generated from DRIVERS by scripts/generate-drivers.mjs — do not edit. */}

<div class="qb-chips">
<span class="qb-chip">driver</span>
<span class="qb-chip">${id}</span>
<span class="qb-chip">${supported.length}/8 capabilities</span>
</div>

## Setup

Import the driver directly so the other seventeen tree-shake away.

\`\`\`ts title="${id}.ts"
import { ${constName}, QubeeStore, QueryBuilder, Paginator } from '@qubeejs/core';

const store = new QubeeStore();
const qb = new QueryBuilder(store, ${constName}.createRequestStrategy('query'));
const paginator = new Paginator(
  store,
  ${constName}.createResponseStrategy(),
  ${constName}.createResponseOptions({}),
);
\`\`\`

## Example query

\`\`\`ts
${
  `qb.setResource('articles')${c.filters ? "\n  .addFilter('status', 'published')" : ''}${
    c.sort ? "\n  .addSort('createdAt', SortEnum.DESC)" : ''
  }\n  .setLimit(25)\n  .generateUri();`
}
\`\`\`

Produces:

\`\`\`
${sampleUri(id)}
\`\`\`

## Capabilities

| Capability | Supported |
| --- | :---: |
${CAPABILITIES.map(([key, label]) => `| ${label} | ${c[key] ? '✅' : '—'} |`).join('\n')}
${
  missing.length
    ? `\n:::caution[Bee aware]\nThis driver does not support ${missing
        .map(([, label]) => label.toLowerCase())
        .join(', ')}. Calling ${missing
        .map(([, , method]) => `\`${method}\``)
        .join(', ')} throws \`UnsupportedCapabilityError\`.\n:::\n`
    : '\nThis driver supports every capability the builder offers.\n'
}
## Reading a response

\`\`\`ts
const body = await fetch(\`https://example.com/api\${uri}\`).then((r) => r.json());
const page = paginator.paginate(body);

page.data; // rows
page.total; // total rows the backend reported
page.lastPage; // final page number
\`\`\`
`
  );
}

console.log(`  generated capabilities.mdx + ${ids.length} driver pages`);
