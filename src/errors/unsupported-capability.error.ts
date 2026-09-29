import type { DriverId } from '../types/driver-id.type';
import type { StrategyCapabilities } from '../types/strategy-capabilities.type';

import { QubeeError } from './qubee.error';

/**
 * Human-readable name for each capability flag, used to build error messages.
 */
const CAPABILITY_LABELS: Record<keyof StrategyCapabilities, string> = {
  embedded: 'embedded resources',
  fields: 'per-model field selection',
  filters: 'filters',
  includes: 'relation includes',
  operatorFilters: 'filter operators',
  search: 'full-text search',
  select: 'flat field selection',
  sort: 'sorting',
};

/**
 * Thrown when a query uses a feature the active driver does not implement.
 *
 * The message is derived from the capability and the active driver rather than
 * hardcoded, so it cannot drift as drivers gain features — every one of the
 * previous hardcoded messages had become factually wrong.
 *
 * Concrete subclasses exist per capability so consumers can keep catching a
 * specific type; all of them share the `UNSUPPORTED_CAPABILITY` code.
 */
export class UnsupportedCapabilityError extends QubeeError {
  /**
   * The capability that was requested.
   */
  public readonly capability: keyof StrategyCapabilities;

  /**
   * The driver that does not support it, when known.
   */
  public readonly driver?: DriverId;

  /**
   * @param capability - The capability flag that was not supported
   * @param driver - The active driver, when known
   */
  constructor(capability: keyof StrategyCapabilities, driver?: DriverId) {
    const subject = driver === undefined ? 'The active driver' : `The '${driver}' driver`;

    super(
      'UNSUPPORTED_CAPABILITY',
      `${subject} does not support ${CAPABILITY_LABELS[capability]}.`,
      {
        context: { capability, driver },
      }
    );

    this.capability = capability;
    this.driver = driver;
  }
}
