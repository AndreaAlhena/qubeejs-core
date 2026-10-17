import type { LinkRelations } from '../types/link-relations.type';

/**
 * One `<url>; rel="…"` entry. The rel value may list several relations
 * separated by spaces (`rel="next last"`), as RFC 8288 allows.
 */
const LINK_ENTRY = /<([^>]+)>\s*;\s*rel="([^"]+)"/g;

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
 * model (`rel="collection"` and the like are skipped). Relation names
 * match case-insensitively, and `rel="previous"` is read as `prev`.
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

  for (const [, url, rel] of value.matchAll(LINK_ENTRY)) {
    rel
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
