import type { articleList } from '../../test/fixtures/article-list';
import type { taskList } from '../../test/fixtures/task-list';
import type { QueryBuilder } from '../services/query-builder';
import type { ListDefinition } from './list-definition.type';
import type { ListInput } from './list-input.type';
import type { ListParam } from './list-param.type';
import type { ListParams } from './list-params.type';
import type { ParamsState } from './params-state.type';
import type { QubeeConfig } from './qubee-config.type';

import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { defineList } from '../lists/define-list';
import { integerParam } from '../params/integer-param';

/** The loose list through an alias of its own, as an adapter declares it. */
type LooseList = ListDefinition<ListParams>;

/** The params of the lists written by hand below. */
type PlainParams = { page: ListParam<number> };

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

  it('should be never for a list written by hand with no apply', () => {
    // A plain object type satisfies ListDefinition<ListParams> too; with no apply to infer from,
    // its input must not fall back to the constraint.
    expectTypeOf<
      ListInput<{ params: { page: ListParam<number> }; qubee: QubeeConfig; resource: string }>
    >().toBeNever();
  });

  it('should be never through ListDefinition<ListParams>, where the requirement is erased', () => {
    expectTypeOf<ListInput<ListDefinition<ListParams>>>().toBeNever();
  });

  it('should be never through another alias of ListDefinition<ListParams>', () => {
    expectTypeOf<ListInput<LooseList>>().toBeNever();
  });

  it('should read the input through an intersection', () => {
    expectTypeOf<ListInput<typeof taskList & { label: string }>>().toEqualTypeOf<{
      projectId: string;
    }>();
    expectTypeOf<ListInput<typeof articleList & { label: string }>>().toBeNever();
  });

  it('should be never for a list written by hand whose apply takes two parameters', () => {
    expectTypeOf<
      ListInput<{
        apply(builder: QueryBuilder, state: ParamsState<PlainParams>): void;
        params: PlainParams;
        qubee: QubeeConfig;
        resource: string;
      }>
    >().toBeNever();
  });

  it('should be never for a list written by hand whose input is never', () => {
    expectTypeOf<
      ListInput<{
        apply?(builder: QueryBuilder, state: ParamsState<PlainParams>, input?: never): void;
        params: PlainParams;
        qubee: QubeeConfig;
        resource: string;
      }>
    >().toBeNever();
  });

  it('should read the input of a list written by hand', () => {
    expectTypeOf<
      ListInput<{
        apply(
          builder: QueryBuilder,
          state: ParamsState<PlainParams>,
          input: { projectId: string }
        ): void;
        params: PlainParams;
        qubee: QubeeConfig;
        resource: string;
      }>
    >().toEqualTypeOf<{ projectId: string }>();
  });
});
