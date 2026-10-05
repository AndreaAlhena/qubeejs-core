import { STRAPI_DRIVER } from '../../src/drivers/strapi.driver';
import { defineList } from '../../src/lists/define-list';
import { enumParam } from '../../src/params/enum-param';
import { integerParam } from '../../src/params/integer-param';

/**
 * A list whose request needs more than the URL: the tasks of one project, filterable by status.
 * The project lives in the route path, so the list takes it as its input.
 */
export const taskList = defineList({
  apply: (builder, { status }, { projectId }: { projectId: string }) => {
    builder.addFilter('project', projectId);

    if (status) {
      builder.addFilter('status', status);
    }
  },
  params: {
    page: integerParam('page', { default: 1, min: 1 }),
    status: enumParam('status', ['open', 'done']),
  },
  qubee: { driver: STRAPI_DRIVER },
  resource: 'tasks',
});
