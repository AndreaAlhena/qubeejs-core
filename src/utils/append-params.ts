import type { DriverId } from '../types/driver-id.type';
import type { Params } from '../types/params.type';

import { ParamCollisionError } from '../errors/param-collision.error';

/**
 * Append extra query parameters to the URI a request strategy generated.
 *
 * Runs after the strategy rather than inside it, so every driver emits them —
 * including a custom one that implements `IRequestStrategy` directly and never
 * reaches `AbstractRequestStrategy.parts()`.
 *
 * Keys stay literal, so bracketed names such as `page[cursor]` work. Each
 * value is percent-encoded like a filter value, then the values are joined
 * with a literal `,`; a key with no values is skipped:
 *
 * ```
 * { status: ['failed'] }  -> /jobs?limit=15&page=1&status=failed
 * { ids: ['a,b', 'c'] }   -> /jobs?limit=15&page=1&ids=a%2Cb,c
 * ```
 *
 * @param uri - The URI the request strategy returned
 * @param params - The extra parameters, in emission order; absent from a state written before they existed
 * @param driver - The active driver, named in a collision error
 * @param nextPageUri - Builds the URI for the next page. Its keys are reserved too, so a
 *   pagination key a driver leaves out of page 1 — PostgREST `offset`, OData `$skip` — collides
 *   on every page rather than only once the user navigates. Called only when there are params.
 * @returns The URI with the parameters appended
 * @throws {ParamCollisionError} If a key collides with one the driver emits
 */
export function appendParams(
  uri: string,
  params?: Params,
  driver?: DriverId,
  nextPageUri?: () => string
): string {
  const entries = Object.entries(params ?? {}).filter(([, values]) => values.length);

  if (!entries.length) {
    return uri;
  }

  const emitted = [...emittedKeys(uri), ...emittedKeys(nextPageUri?.() ?? '')];

  const segments = entries.map(([key, values]) => {
    const clash = emitted.find((emittedKey) => collides(key, emittedKey));

    if (clash !== undefined) {
      throw new ParamCollisionError(key, clash, driver);
    }

    return `${key}=${values.map((value) => encodeURIComponent(String(value))).join(',')}`;
  });

  return `${uri}${uri.includes('?') ? '&' : '?'}${segments.join('&')}`;
}

/**
 * Whether two query keys address the same parameter.
 *
 * Equal keys collide, and so do `a` and `a[…]`: a bracket-parsing backend
 * reads both into the same slot. `page` and `pageSize` do not.
 *
 * @param key - A key passed to `setParam()`
 * @param emittedKey - A key the strategy emitted
 * @returns `true` when the two would clash on the server
 */
function collides(key: string, emittedKey: string): boolean {
  return key === emittedKey || key.startsWith(`${emittedKey}[`) || emittedKey.startsWith(`${key}[`);
}

/**
 * Read the parameter names out of a URI a strategy emitted.
 *
 * Values never contain a raw `&` — they arrive percent-encoded — so each
 * `&`-separated segment is one parameter, named by what precedes its first
 * `=`.
 *
 * @param uri - A URI as a request strategy returned it
 * @returns The emitted keys, in order, duplicates included; none when there is no query string
 */
function emittedKeys(uri: string): string[] {
  const query = uri.indexOf('?');

  if (query === -1) {
    return [];
  }

  return uri
    .slice(query + 1)
    .split('&')
    .map((segment) => segment.split('=', 1)[0]);
}
