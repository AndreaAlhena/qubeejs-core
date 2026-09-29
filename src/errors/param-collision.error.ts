import type { DriverId } from '../types/driver-id.type';

import { QubeeError } from './qubee.error';

/**
 * Thrown by `generateUri()` when a parameter set with `setParam()` collides
 * with one the driver emits.
 *
 * Two keys collide when they are equal, or when one is the other followed by
 * `[` — `page` against JSON:API's `page[number]` — because a backend that
 * parses brackets would merge or overwrite them. Emitting both would silently
 * duplicate or override the driver's parameter, so the builder refuses.
 *
 * The check runs against the URI the driver actually generated, so a key is
 * free until the driver needs it: `setParam('sort', …)` works until
 * `addSort()` makes the driver emit `sort` itself. Pagination keys are the
 * exception — the next page's URI is checked too, so a key a driver leaves
 * out of page 1 (PostgREST `offset`, OData `$skip`) collides on every page.
 */
export class ParamCollisionError extends QubeeError {
  /**
   * The driver that emits the colliding parameter, when known.
   */
  public readonly driver?: DriverId;

  /**
   * The colliding key the driver emits.
   */
  public readonly driverKey: string;

  /**
   * The key passed to `setParam()`.
   */
  public readonly key: string;

  /**
   * @param key - The key passed to `setParam()`
   * @param driverKey - The colliding key the driver emits
   * @param driver - The active driver, when known
   */
  constructor(key: string, driverKey: string, driver?: DriverId) {
    const subject = driver === undefined ? 'the active driver' : `the '${driver}' driver`;

    super(
      'PARAM_COLLISION',
      `The param '${key}' collides with '${driverKey}', which ${subject} emits. Use the builder method that controls it, or remove the param with deleteParams('${key}').`,
      {
        context: { driver, driverKey, key },
      }
    );

    this.driver = driver;
    this.driverKey = driverKey;
    this.key = key;
  }
}
