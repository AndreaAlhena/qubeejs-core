import type { Driver } from './driver.type';

/**
 * A driver's identifier: one of the built-in {@link Driver} ids, or the id of
 * a driver defined outside this package.
 *
 * `string & {}` accepts any string without letting the union collapse to
 * plain `string`, so editors still suggest the eighteen built-in ids. A
 * custom driver can therefore name itself, and capability errors name it
 * rather than a built-in id it had to borrow:
 *
 * ```ts
 * const STUDIO_API_DRIVER: DriverDefinition = { ...JSON_API_DRIVER, id: 'studio-api' };
 * // UnsupportedSearchError: The 'studio-api' driver does not support full-text search.
 * ```
 *
 * Only built-in ids resolve through `DRIVERS`, which stays keyed by
 * `DriverEnum`; a custom driver is always passed as its definition.
 */
export type DriverId = Driver | (string & {});
