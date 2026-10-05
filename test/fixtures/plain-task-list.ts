import type { QueryBuilder } from '../../src/services/query-builder';
import type { ListParam } from '../../src/types/list-param.type';
import type { ParamsState } from '../../src/types/params-state.type';
import type { QubeeConfig } from '../../src/types/qubee-config.type';

import { STRAPI_DRIVER } from '../../src/drivers/strapi.driver';
import { integerParam } from '../../src/params/integer-param';
import { stringParam } from '../../src/params/string-param';

/** The params of `plainTaskList`. */
type PlainTaskParams = { page: ListParam<number>; q: ListParam<string | undefined> };

/**
 * A list written by hand, not with `defineList()`: the tasks of one project, searchable by title.
 * Its `apply` requires its input, so it is not assignable to `ListDefinition<ListParams>`, whose
 * input is `never`.
 */
export const plainTaskList: {
  apply(
    builder: QueryBuilder,
    state: ParamsState<PlainTaskParams>,
    input: { projectId: string }
  ): void;
  params: PlainTaskParams;
  qubee: QubeeConfig;
  resource: string;
} = {
  apply: (builder, { q }, { projectId }) => {
    builder.addFilter('project', projectId);

    if (q) {
      builder.addFilter('title', q);
    }
  },
  params: { page: integerParam('page', { default: 1, min: 1 }), q: stringParam('q') },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'tasks',
};
