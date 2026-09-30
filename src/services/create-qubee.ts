import type { QubeeConfig } from '../types/qubee-config.type';
import type { Qubee } from '../types/qubee.type';

import { PaginationModeEnum } from '../enums/pagination-mode.enum';
import { QueryBuilderOptions } from '../models/query-builder-options';
import { Paginator } from './paginator';
import { QubeeStore } from './qubee-store';
import { QueryBuilder } from './query-builder';

/**
 * Wire up a store, a builder and a paginator for one driver.
 *
 * The three share a store, which is what lets a parsed response teach the
 * builder where it is:
 *
 * ```ts
 * import { createQubee, STRAPI_DRIVER } from '@qubeejs/core';
 *
 * const { builder, paginator } = createQubee({ driver: STRAPI_DRIVER });
 *
 * const uri = builder.setResource('articles').setLimit(25).generateUri();
 * const page = paginator.paginate(await fetch(uri).then((r) => r.json()));
 * ```
 *
 * Constructing the three by hand remains supported, and is what you want when
 * they should not share state.
 *
 * @param config - The driver, plus an optional base URL and request and response key overrides
 * @returns The builder, paginator and the store they share
 */
export function createQubee(config: QubeeConfig): Qubee {
  const {
    baseUrl,
    driver,
    pagination = PaginationModeEnum.QUERY,
    request = {},
    response = {},
  } = config;

  const store = new QubeeStore();

  if (baseUrl) {
    store.baseUrl = baseUrl;
  }

  return {
    builder: new QueryBuilder(
      store,
      driver.createRequestStrategy(pagination),
      new QueryBuilderOptions(request),
      driver.id
    ),
    paginator: new Paginator(
      store,
      driver.createResponseStrategy(),
      driver.createResponseOptions(response)
    ),
    store,
  };
}
