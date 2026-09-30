/**
 * Turn TypeDoc JSON into API reference pages that match the Qubee design.
 *
 * The library carries 500+ JSDoc blocks; this reads them rather than asking
 * anyone to restate them in markdown. Every page here is generated — never
 * hand-edit `src/content/docs/api/`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const outDir = join(here, '..', 'src', 'content', 'docs', 'api');
const jsonPath = join(here, '..', '.typedoc.json');

const KIND = {
  8: 'enum',
  32: 'const',
  64: 'function',
  128: 'class',
  256: 'interface',
  1024: 'property',
  2048: 'method',
  262144: 'accessor',
  2097152: 'type',
};

/** Flatten a TypeDoc comment part list into plain markdown. */
const text = (comment) =>
  (comment?.summary ?? []).map((p) => (p.kind === 'code' ? p.text : p.text)).join('').trim();

/** Read the first block tag of a given name. */
const tag = (comment, name) => {
  const found = (comment?.blockTags ?? []).find((b) => b.tag === name);
  return found ? found.content.map((c) => c.text).join('').trim() : '';
};

/** Render a TypeDoc type node as readable TypeScript. */
function typeName(t) {
  if (!t) return 'unknown';
  switch (t.type) {
    case 'intrinsic':
    case 'reference':
      return t.typeArguments?.length
        ? `${t.name}<${t.typeArguments.map(typeName).join(', ')}>`
        : t.name;
    case 'array': {
      const inner = typeName(t.elementType);
      // A union inside an array needs parentheses or it reads as a union of an array.
      return /[|&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
    }
    case 'union':
      // `&` binds tighter than `|`, but `Driver | (string & {})` reads better bracketed.
      return t.types
        .map((u) => (u.type === 'intersection' ? `(${typeName(u)})` : typeName(u)))
        .join(' | ');
    case 'intersection':
      return t.types.map(typeName).join(' & ');
    case 'literal':
      return typeof t.value === 'string' ? `'${t.value}'` : String(t.value);
    case 'reflection': {
      const d = t.declaration ?? {};
      if (d.signatures?.length) return 'function';
      const index = d.indexSignatures?.[0];
      if (index && !d.children?.length) {
        const [key] = index.parameters ?? [];
        return `{ [${key?.name ?? 'key'}: ${typeName(key?.type)}]: ${typeName(index.type)} }`;
      }
      // The empty object type, as in the `string & {}` autocomplete idiom.
      return d.children?.length ? 'object' : '{}';
    }
    case 'typeOperator':
      return `${t.operator} ${typeName(t.target)}`;
    case 'templateLiteral':
      return 'template literal';
    case 'tuple':
      return `[${(t.elements ?? []).map(typeName).join(', ')}]`;
    case 'predicate':
      return `${t.name} is ${typeName(t.targetType)}`;
    default:
      return t.name ?? t.type ?? 'unknown';
  }
}

/** Escape a value for use inside a markdown table cell. */
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

/** Render one parameter as it reads in a signature: rest, optional, type. */
const param = (p) =>
  `${p.flags?.isRest ? '...' : ''}${p.name}${p.flags?.isOptional ? '?' : ''}: ${typeName(p.type)}`;

/** Render one method or function as a section. */
function renderMember(member) {
  const sig = member.signatures?.[0];
  if (!sig) return '';

  const params = sig.parameters ?? [];
  const args = params.map(param).join(', ');

  const lines = [
    `### ${member.name}()`,
    '',
    '```ts',
    `${member.name}(${args}): ${typeName(sig.type)}`,
    '```',
    '',
  ];

  const summary = text(sig.comment);
  if (summary) lines.push(summary, '');

  if (params.length) {
    lines.push(
      '| Parameter | Type | Description |',
      '| --- | --- | --- |',
      ...params.map(
        (p) =>
          `| \`${p.name}\` | \`${cell(typeName(p.type))}\` | ${cell(text(p.comment)) || '—'} |`
      ),
      ''
    );
  }

  const returns = tag(sig.comment, '@returns');
  if (returns) lines.push(`**Returns** — ${returns}`, '');

  const throws = (sig.comment?.blockTags ?? []).filter((b) => b.tag === '@throws');
  for (const t of throws) {
    const raw = t.content.map((c) => c.text).join('').trim();
    // TypeDoc consumes `{ErrorClass}` as the tag's type and drops it, so the text
    // starts mid-sentence ("If the active driver…"). Make it a sentence again.
    const body = /^(If|When|Unless)\b/.test(raw)
      ? `Throws ${raw.charAt(0).toLowerCase()}${raw.slice(1)}`
      : raw;
    lines.push(':::caution[Bee aware]', body.replace(/\.?$/, '.'), ':::', '');
  }

  return lines.join('\n');
}

/** Render one exported symbol as a full page. */
function renderPage(node, order) {
  const kind = KIND[node.kind] ?? 'symbol';
  const source = node.sources?.[0]?.fileName ?? '';
  const methods = (node.children ?? []).filter((c) => c.kind === 2048 && !c.flags?.isPrivate);
  const props = (node.children ?? []).filter(
    (c) => (c.kind === 1024 || c.kind === 262144) && !c.flags?.isPrivate
  );

  const badges = [source, methods.length ? `${methods.length} public methods` : '', kind]
    .filter(Boolean)
    .map((b) => `<span class="qb-chip">${b}</span>`)
    .join('\n');

  const front = [
    '---',
    `title: ${JSON.stringify(node.name)}`,
    `description: ${JSON.stringify(text(node.comment).split('\n')[0] || `${kind} ${node.name}`)}`,
    `sidebar:`,
    `  order: ${order}`,
    '---',
    '',
    '{/* Generated from source JSDoc by scripts/generate-api.mjs — do not edit. */}',
    '',
    `<div class="qb-chips">`,
    badges,
    '</div>',
    '',
  ];

  const body = [text(node.comment), ''];

  const ctor = (node.children ?? []).find((c) => c.kind === 512);
  if (ctor?.signatures?.[0]) {
    const params = ctor.signatures[0].parameters ?? [];
    body.push(
      '## Constructor',
      '',
      '```ts',
      `new ${node.name}(${params.map(param).join(', ')})`,
      '```',
      ''
    );
    if (params.length) {
      body.push(
        '| Parameter | Type | Description |',
        '| --- | --- | --- |',
        ...params.map(
          (p) => `| \`${p.name}\` | \`${cell(typeName(p.type))}\` | ${cell(text(p.comment)) || '—'} |`
        ),
        ''
      );
    }
  }

  if (props.length) {
    body.push(
      '## Properties',
      '',
      '| Property | Type | Description |',
      '| --- | --- | --- |',
      ...props.map(
        (p) =>
          `| \`${p.name}\` | \`${cell(typeName(p.type ?? p.getSignature?.type))}\` | ${cell(text(p.comment ?? p.getSignature?.comment)) || '—'} |`
      ),
      ''
    );
  }

  if (node.kind === 8) {
    const members = (node.children ?? []).filter((c) => c.kind === 16);
    body.push(
      '## Members',
      '',
      '| Member | Value | Description |',
      '| --- | --- | --- |',
      ...members.map(
        (m) => `| \`${m.name}\` | \`${cell(typeName(m.type))}\` | ${cell(text(m.comment)) || '—'} |`
      ),
      ''
    );
  }

  if (node.kind === 2097152 && node.type) {
    body.push('## Definition', '', '```ts', `type ${node.name} = ${typeName(node.type)}`, '```', '');
  }

  if (methods.length) {
    body.push('## Methods', '');
    for (const m of [...methods].sort((a, b) => a.name.localeCompare(b.name))) {
      body.push(renderMember(m));
    }
  }

  const sig = node.signatures?.[0];
  if (sig && node.kind === 64) body.push(renderMember(node));

  return front.join('\n') + body.join('\n');
}

// ---- run ----------------------------------------------------------------

// Run the repo's TypeDoc bin with this Node rather than through `npx`: on Windows
// `npx` is `npx.cmd`, which execFileSync can only launch through a shell.
execFileSync(
  process.execPath,
  [
    join(repo, 'node_modules', 'typedoc', 'bin', 'typedoc'),
    '--json',
    jsonPath,
    '--entryPoints',
    'src/index.ts',
    '--tsconfig',
    'tsconfig.json',
    '--excludeInternal',
    '--excludePrivate',
    '--logLevel',
    'Error',
  ],
  { cwd: repo, stdio: 'inherit' }
);

const project = JSON.parse(readFileSync(jsonPath, 'utf8'));
rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

const GROUPS = [
  { dir: 'services', match: (n) => ['QueryBuilder', 'QubeeStore', 'Paginator'].includes(n.name) },
  { dir: 'models', match: (n) => (n.kind === 128 && n.name.endsWith('Options')) || n.name === 'PaginatedCollection' },
  { dir: 'errors', match: (n) => n.name.endsWith('Error') },
  { dir: 'enums', match: (n) => n.kind === 8 },
  { dir: 'strategies', match: (n) => n.name.endsWith('Strategy') },
  { dir: 'types', match: (n) => n.kind === 2097152 || n.kind === 256 },
  { dir: 'reference', match: () => true },
];

let written = 0;
const index = new Map(GROUPS.map((g) => [g.dir, []]));

for (const node of project.children ?? []) {
  if (node.kind === 32 && node.name.endsWith('_DRIVER')) continue; // covered by the driver pages
  const group = GROUPS.find((g) => g.match(node));
  const slug = node.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const dir = join(outDir, group.dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.mdx`), renderPage(node, written));
  index.get(group.dir).push(node.name);
  written += 1;
}

rmSync(jsonPath, { force: true });
console.log(`  generated ${written} API pages`);
for (const [dir, names] of index) {
  if (names.length) console.log(`    ${dir.padEnd(12)} ${names.length}`);
}
