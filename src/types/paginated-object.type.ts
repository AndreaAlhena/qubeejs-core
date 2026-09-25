/**
 * The minimum a row must satisfy to live in a {@link PaginatedCollection}.
 *
 * Deliberately permissive — the library never inspects rows except in
 * `normalize()`, which reads one identifier key and guards it at runtime.
 *
 * `object` rather than `Record<string, unknown>`: TypeScript grants an implicit
 * index signature to object-literal types and `type` aliases but never to an
 * `interface` or a class, so the record form rejected `paginate<User>()` for
 * the two shapes consumers write most. Only an `any`-valued index signature is
 * exempt from that rule, and `any` is banned here.
 */
export type PaginatedObject = object;
