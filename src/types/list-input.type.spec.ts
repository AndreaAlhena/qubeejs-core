import type { articleList } from '../../test/fixtures/article-list';
import type { taskList } from '../../test/fixtures/task-list';
import type { ListDefinition } from './list-definition.type';
import type { ListInput } from './list-input.type';
import type { ListParams } from './list-params.type';

import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { defineList } from '../lists/define-list';
import { integerParam } from '../params/integer-param';

describe('ListInput', () => {
  it('should read the input a list declares, from the annotation on apply', () => {
    expectTypeOf<ListInput<typeof taskList>>().toEqualTypeOf<{ projectId: string }>();
  });

  it('should read a bare value', () => {
    const _list = defineList({
      apply: (builder, _state, projectId: string) => {
        builder.addFilter('project', projectId);
      },
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'tasks',
    });

    expectTypeOf<ListInput<typeof _list>>().toEqualTypeOf<string>();
  });

  it('should drop undefined from an annotation, so the input never includes it', () => {
    const _list = defineList({
      apply: (builder, _state, projectId: string | undefined) => {
        if (projectId) {
          builder.addFilter('project', projectId);
        }
      },
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'tasks',
    });

    expectTypeOf<ListInput<typeof _list>>().toEqualTypeOf<string>();
  });

  it('should be never for a list that declares none', () => {
    expectTypeOf<ListInput<typeof articleList>>().toBeNever();
  });

  it('should be never through ListDefinition<ListParams>, where the requirement is erased', () => {
    expectTypeOf<ListInput<ListDefinition<ListParams>>>().toBeNever();
  });
});
