import type { DriverId } from '../types/driver-id.type';

import { UnsupportedCapabilityError } from './unsupported-capability.error';

/**
 * Thrown when the active driver does not support full-text search — `setSearch()`.
 *
 * The message is generated from the capability and driver, never hardcoded.
 */
export class UnsupportedSearchError extends UnsupportedCapabilityError {
  /**
   * @param driver - The active driver, when known
   */
  constructor(driver?: DriverId) {
    super('search', driver);
  }
}
