import type { DriverId } from '../types/driver-id.type';

import { UnsupportedCapabilityError } from './unsupported-capability.error';

/**
 * Thrown when the active driver does not support operator filters — `addFilterOperator()`.
 *
 * The message is generated from the capability and driver, never hardcoded.
 */
export class UnsupportedFilterOperatorError extends UnsupportedCapabilityError {
  /**
   * @param driver - The active driver, when known
   */
  constructor(driver?: DriverId) {
    super('operatorFilters', driver);
  }
}
