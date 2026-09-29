import type { PaginationModeEnum } from '../enums/pagination-mode.enum';
import type { IRequestStrategy } from '../interfaces/request-strategy.interface';
import type { IResponseStrategy } from '../interfaces/response-strategy.interface';
import type { ResponseOptions } from '../models/response-options';
import type { DriverId } from './driver-id.type';
import type { PaginationConfig } from './pagination-config.type';

/**
 * Per-driver factory bundle
 *
 * Names the four pieces a driver contributes — request strategy, response
 * strategy, response-options subclass — so adding a driver is one entry
 * in `DRIVERS` instead of three parallel `switch` cases in the provider
 * builder.
 */
export type DriverDefinition = {
  /**
   * The driver's identifier.
   *
   * For a built-in driver it duplicates its key in `DRIVERS`, which
   * `test/drivers.spec.ts` asserts stays true. Carrying it on the definition
   * lets a driver be passed around on its own — `createQubee({ driver:
   * STRAPI_DRIVER })` — while still naming the driver in capability errors.
   *
   * A driver defined outside this package uses its own id rather than
   * borrowing a built-in one, so those errors name it correctly.
   */
  id: DriverId;

  /**
   * Build the request strategy for this driver
   *
   * Receives the configured `PaginationModeEnum`; only PostgREST
   * actually consults it today (RANGE-header mode), other drivers
   * ignore the argument.
   *
   * @param paginationMode - Wire-level pagination mechanism
   * @returns A fresh request strategy instance
   */
  createRequestStrategy(paginationMode: PaginationModeEnum): IRequestStrategy;

  /**
   * Build the response strategy for this driver
   *
   * @returns A fresh response strategy instance
   */
  createResponseStrategy(): IResponseStrategy;

  /**
   * Build the driver-specific `ResponseOptions` instance
   *
   * Honours user-supplied key-path overrides via `PaginationConfig`.
   *
   * @param config - User-supplied response key overrides
   * @returns A `ResponseOptions` (or subclass) carrying the resolved defaults
   */
  createResponseOptions(config: PaginationConfig): ResponseOptions;
};
