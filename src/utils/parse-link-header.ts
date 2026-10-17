import type { LinkRelations } from '../types/link-relations.type';

/**
 * One link value: `<url>` and its `; name=value` parameters. A quoted value
 * may hold `,` and `;` (`title="Next, please"`), so it is matched whole
 * rather than split on.
 */
const LINK_VALUE = /<([^>]*)>((?:\s*;\s*[^\s;,=]+(?:\s*=\s*(?:"[^"]*"|[^\s;,]*))?)*)/g;

/**
 * The `rel` parameter among a link value's parameters, quoted or not. Its
 * value may list several relations separated by spaces (`rel="next last"`).
 */
const REL_PARAM = /;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;,]+))/i;

/**
 * The relation names this parser keeps, keyed by their lower-cased
 * spelling on the wire
 */
const RELATIONS: Record<string, keyof LinkRelations> = {
  first: 'first',
  last: 'last',
  next: 'next',
  prev: 'prev',
  previous: 'prev',
};

/**
 * Extract the `first` / `prev` / `next` / `last` URLs from an RFC 8288
 * `Link` header value
 *
 * Tolerates any ordering, a missing header, and relations it does not
 * model (`rel="collection"` and the like are skipped). `rel` may sit
 * anywhere among a link's parameters, quoted or not; relation names match
 * case-insensitively, and `rel="previous"` is read as `prev`. Other
 * parameters (`type`, `title`, …) are ignored.
 *
 * @param value - Raw header value (possibly null/undefined)
 * @returns The navigation URLs found, keyed by relation
 *
 * @example
 * ```ts
 * parseLinkHeader('<https://x.io/items?page=3>; rel="next"');
 * // { next: 'https://x.io/items?page=3' }
 * ```
 */
export function parseLinkHeader(value: string | null | undefined): LinkRelations {
  const relations: LinkRelations = {};

  if (!value) {
    return relations;
  }

  for (const [, url, params] of value.matchAll(LINK_VALUE)) {
    const rel = params.match(REL_PARAM);

    if (!rel) {
      continue;
    }

    (rel[1] ?? rel[2])
      .toLowerCase()
      .split(/\s+/)
      .forEach((name) => {
        if (!Object.hasOwn(RELATIONS, name)) {
          return;
        }

        relations[RELATIONS[name]] = url;
      });
  }

  return relations;
}
