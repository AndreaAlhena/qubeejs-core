import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SourceDeclaration, SourceFile } from './source-file.type';

const rootDir = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = join(rootDir, 'src');
const testDir = join(rootDir, 'test');

const DECL =
  /^(export\s+)?(?:declare\s+)?(abstract class|class|interface|type|enum|const|function)\s+(\w+)/gm;

const read = (dir: string, prefix: string): SourceFile[] =>
  globSync('**/*.ts', { cwd: dir }).map((p: string): SourceFile => {
    const text = readFileSync(join(dir, p), 'utf8');
    const rel = p.replaceAll('\\', '/');
    const declarations = [...text.matchAll(DECL)].map((m) => ({
      exported: Boolean(m[1]),
      kind: m[2].replace('abstract class', 'class'),
      name: m[3],
    }));
    return { declarations, name: rel.split('/').pop() as string, path: `${prefix}${rel}`, text };
  });

/** Everything under src/, excluding specs — the shipped library. */
const files: SourceFile[] = read(srcDir, 'src/').filter((f) => !f.name.endsWith('.spec.ts'));

/** Every TypeScript file in the repo, specs and test helpers included. */
const allFiles: SourceFile[] = [...read(srcDir, 'src/'), ...read(testDir, 'test/')];

const exportedOf = (f: SourceFile): SourceDeclaration[] => f.declarations.filter((d) => d.exported);

describe('repository conventions', () => {
  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never mixes declaration kinds in one file', () => {
    const offenders = files
      .filter((f) => new Set(exportedOf(f).map((d) => d.kind)).size > 1)
      .map(
        (f) =>
          `${f.path} exports ${[...new Set(exportedOf(f).map((d) => d.kind))].sort().join(' + ')}`
      );
    expect(offenders).toEqual([]);
  });

  it('declares interfaces only in *.interface.ts', () => {
    const offenders = files
      .filter(
        (f) =>
          f.declarations.some((d) => d.kind === 'interface') && !f.name.endsWith('.interface.ts')
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('exports types only from *.type.ts', () => {
    // File-local (non-exported) helper types may live beside their only consumer.
    const offenders = files
      .filter((f) => exportedOf(f).some((d) => d.kind === 'type') && !f.name.endsWith('.type.ts'))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('reserves the I prefix for interfaces a class implements', () => {
    const all = files.map((f) => f.text).join('\n');
    const offenders = files
      .flatMap((f) => f.declarations.map((d) => ({ ...d, path: f.path })))
      // Type-like declarations only: UPPER_CASE consts such as INITIAL_STATE
      // also start with I followed by a capital.
      .filter((d) => d.kind === 'interface' || d.kind === 'type')
      .filter((d) => /^I[A-Z]/.test(d.name))
      .filter((d) => !new RegExp(`implements\\s+${d.name}\\b`).test(all))
      .map((d) => `${d.path}: ${d.name} is I-prefixed but no class implements it`);
    expect(offenders).toEqual([]);
  });

  it('names enums *Enum and puts them in *.enum.ts', () => {
    const offenders = files
      .flatMap((f) =>
        f.declarations.filter((d) => d.kind === 'enum').map((d) => ({ ...d, path: f.path }))
      )
      .filter((d) => !d.name.endsWith('Enum') || !d.path.endsWith('.enum.ts'))
      .map((d) => `${d.path}: ${d.name}`);
    expect(offenders).toEqual([]);
  });

  it('uses kebab-case filenames', () => {
    const offenders = files
      .filter((f) => !/^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z-]+)*\.ts$/.test(f.name))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('keeps the core framework-agnostic', () => {
    const offenders = files
      .filter((f) => /@angular|from 'rxjs'|from "rxjs"/.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('imports nothing from node:', () => {
    // `@types/node` is available project-wide for this very spec; the core itself
    // must stay runnable in a browser.
    const offenders = files.filter((f) => /from 'node:/.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('uses UPPER_CASE only for literal constants', () => {
    // UPPER_CASE means a static, literal value. Anything computed at runtime is camelCase.
    const declaration = /^\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(.*)$/gm;
    const literal = /^[{['"`/]|^-?\d|^true\b|^false\b|^null\b/;
    const offenders = allFiles.flatMap((f) =>
      [...f.text.matchAll(declaration)]
        .filter((m) => !literal.test(m[2].trim()))
        .map((m) => `${f.path}: ${m[1]} is computed at runtime — use camelCase`)
    );
    expect(offenders).toEqual([]);
  });

  it('declares types outside *.type.ts only as non-exported local helpers', () => {
    // A private shape used by one file may live beside its consumer; an EXPORTED
    // type is public API and belongs in a *.type.ts of its own.
    const offenders = allFiles
      .filter((f) => !f.name.endsWith('.type.ts'))
      .flatMap((f) =>
        f.declarations
          .filter((d) => d.kind === 'type' && d.exported)
          .map((d) => `${f.path}: ${d.name}`)
      );
    expect(offenders).toEqual([]);
  });

  it('orders package.json export conditions with types first', () => {
    // Condition order is SEMANTIC — the first match wins. Alphabetical sorting puts
    // "default" before "types", which makes the type declarations unreachable.
    // This bit once; prettier-plugin-sort-json is disabled for package.json because of it.
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
      exports: Record<string, Record<string, Record<string, string>>>;
    };
    const conditions = Object.values(pkg.exports['.'] ?? {});
    expect(conditions.length).toBeGreaterThan(0);
    for (const condition of conditions) {
      expect(Object.keys(condition)[0]).toBe('types');
    }
  });

  it('points every package.json entry at a path that tsup emits', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const declared = new Set<string>();
    for (const key of ['main', 'module', 'types']) {
      if (typeof pkg[key] === 'string') declared.add(pkg[key]);
    }
    for (const c of Object.values(
      (pkg['exports'] as Record<string, Record<string, Record<string, string>>>)['.'] ?? {}
    )) {
      Object.values(c).forEach((v) => declared.add(v));
    }
    // Paths must be well-formed and inside dist/; existence is asserted by the build job.
    expect([...declared].filter((p) => !p.startsWith('./dist/'))).toEqual([]);
  });

  it('performs no network I/O', () => {
    const offenders = files
      .filter((f) =>
        /\b(fetch|XMLHttpRequest|axios)\s*\(/.test(f.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''))
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });
});
