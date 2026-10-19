import type { DriverDefinition } from '../types/driver-definition.type';

import { FastapiResponseOptions } from '../models/response-options';
import { FastapiRequestStrategy } from '../strategies/fastapi-request.strategy';
import { FastapiResponseStrategy } from '../strategies/fastapi-response.strategy';

/**
 * Driver definition for FastAPI, with fastapi-filter on the request and fastapi-pagination on the
 * response. Conditions are flat `field__operator=value` params with `order_by` and `search`; the
 * envelope is `Page`'s flat `{ items, total, page, size, pages }`, plus `links` when the backend
 * uses `fastapi_pagination.links`.
 */
export const FASTAPI_DRIVER: DriverDefinition = {
  id: 'fastapi',
  createRequestStrategy: () => new FastapiRequestStrategy(),
  createResponseStrategy: () => new FastapiResponseStrategy(),
  createResponseOptions: (config) => new FastapiResponseOptions(config),
};
