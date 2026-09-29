import type { DriverId } from '../types/driver-id.type';

import { UnsupportedCapabilityError } from './unsupported-capability.error';

/**
 * Thrown when the active driver does not support PostgREST embedded resources — `addEmbedded()` / `deleteEmbedded()`.
 *
 * The message is generated from the capability and driver, never hardcoded.
 */
export class UnsupportedEmbeddedError extends UnsupportedCapabilityError {
  /**
   * @param driver - The active driver, when known
   */
  constructor(driver?: DriverId) {
    super('embedded', driver);
  }
}
