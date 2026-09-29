import type { DriverId } from '../types/driver-id.type';

import { UnsupportedCapabilityError } from './unsupported-capability.error';

/**
 * Thrown when the active driver does not support flat field selection — `addSelect()`.
 *
 * The message is generated from the capability and driver, never hardcoded.
 */
export class UnsupportedSelectError extends UnsupportedCapabilityError {
  /**
   * @param driver - The active driver, when known
   */
  constructor(driver?: DriverId) {
    super('select', driver);
  }
}
