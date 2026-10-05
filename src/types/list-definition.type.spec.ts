import type { ListDefinition } from './list-definition.type';
import type { ListParams } from './list-params.type';
import type { ListState } from './list-state.type';

import { articleList } from '../../test/fixtures/article-list';
import { taskList } from '../../test/fixtures/task-list';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { defineList } from '../lists/define-list';
import { readListState } from '../lists/read-list-state';
import { integerParam } from '../params/integer-param';
import { createQubee } from '../services/create-qubee';

describe('ListDefinition', () => {
  it('should keep every list assignable to ListDefinition<ListParams>', () => {
    expectTypeOf(articleList).toExtend<ListDefinition<ListParams>>();
    expectTypeOf(taskList).toExtend<ListDefinition<ListParams>>();
  });

  it('should infer the state of a list with an input', () => {
    expectTypeOf<ListState<typeof taskList>['page']>().toEqualTypeOf<number>();
    expectTypeOf<ListState<typeof taskList>['status']>().toEqualTypeOf<
      'done' | 'open' | undefined
    >();
  });

  it('should refuse null and undefined as an input', () => {
    // @ts-expect-error — null is left for adapters to mean "input not ready yet"
    expectTypeOf<ListDefinition<ListParams, string | null>>();
    // @ts-expect-error — undefined reads as "no input passed"
    expectTypeOf<ListDefinition<ListParams, string | undefined>>();
  });

  it('should refuse a null annotation where the list is declared', () => {
    expect(() =>
      defineList({
        // @ts-expect-error — null is left for adapters to mean "input not ready yet"
        apply: (builder, _state, projectId: string | null) => {
          builder.addFilter('project', String(projectId));
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      })
    ).not.toThrow();
  });

  it('should keep a two-argument apply call compiling', () => {
    // Code that re-implemented buildListRequest to work around 1.3 calls apply with two
    // arguments. The input parameter is optional so that it keeps compiling.
    const { builder } = createQubee({ driver: STRAPI_DRIVER });

    builder.setResource('articles');

    expect(() =>
      articleList.apply?.(builder, readListState(articleList, '?q=react'))
    ).not.toThrow();
  });
});
