/**
 * The navigation URLs parsed out of an RFC 8288 `Link` header
 *
 * Every relation is optional: page 1 has no `prev`, the last page has no
 * `next`, and servers differ on whether they emit `first` and `last` at all
 * (api-pagination omits both on the boundary pages, Pagy always sends
 * `first`). `prev` also carries a `rel="previous"`, the spelling Pagy used
 * before 43.7.
 */
export type LinkRelations = {
  first?: string;
  last?: string;
  next?: string;
  prev?: string;
};
