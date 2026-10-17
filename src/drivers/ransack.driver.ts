import type { DriverDefinition } from '../types/driver-definition.type';

import { RansackResponseOptions } from '../models/response-options';
import { RansackRequestStrategy } from '../strategies/ransack-request.strategy';
import { RansackResponseStrategy } from '../strategies/ransack-response.strategy';

/**
 * Driver definition for Ransack (Rails). Conditions nest under the `q` search key as
 * `q[field_predicate]`; the body is a bare array and the totals arrive in the pagination gem's
 * headers — Pagy's `total-count` / `total-pages` or api-pagination's `total` / `per-page`, both
 * read without configuration.
 */
export const RANSACK_DRIVER: DriverDefinition = {
  id: 'ransack',
  createRequestStrategy: () => new RansackRequestStrategy(),
  createResponseStrategy: () => new RansackResponseStrategy(),
  createResponseOptions: (config) => new RansackResponseOptions(config),
};
