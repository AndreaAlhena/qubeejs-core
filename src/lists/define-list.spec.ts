import type { ArticleStatusEnum } from '../../test/fixtures/article-status.enum';
import type { ListInput } from '../types/list-input.type';
import type { ListState } from '../types/list-state.type';
import type { Sort } from '../types/sort.type';

import { articleList } from '../../test/fixtures/article-list';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { DuplicateListParamError } from '../errors/duplicate-list-param.error';
import { integerParam } from '../params/integer-param';
import { stringParam } from '../params/string-param';
import { buildListRequest } from './build-list-request';
import { defineList } from './define-list';
import { readListState } from './read-list-state';

describe('defineList', () => {
  it('should return a frozen copy of the definition, leaving the definition passed in unfrozen', () => {
    const definition = {
      params: { page: integerParam('page', { default: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: 'articles',
    };
    const list = defineList(definition);

    expect(list).not.toBe(definition);
    expect(list.resource).toBe('articles');
    expect(Object.isFrozen(definition)).toBe(false);
    expect(Object.isFrozen(definition.params)).toBe(false);
  });

  it('should keep the params in the order they were declared', () => {
    expect(Object.keys(articleList.params)).toEqual(['page', 'q', 'status', 'sort']);
  });

  it('should freeze the definition and its params map', () => {
    expect(Object.isFrozen(articleList)).toBe(true);
    expect(Object.isFrozen(articleList.params)).toBe(true);
  });

  it('should leave the shared driver unfrozen', () => {
    expect(Object.isFrozen(STRAPI_DRIVER)).toBe(false);
  });

  it('should refuse two params sharing a key', () => {
    const declare = (): unknown =>
      defineList({
        params: {
          page: integerParam('page', { default: 1 }),
          search: stringParam('q'),
          term: stringParam('q'),
        },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'articles',
      });

    expect(declare).toThrowError(DuplicateListParamError);
    expect(declare).toThrowError(
      "The list params 'search' and 'term' share the key 'q'. Give each param a key of its own."
    );
  });

  it('should refuse an empty key', () => {
    expect(() =>
      defineList({
        params: { page: integerParam('', { default: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'articles',
      })
    ).toThrowError("Give 'page' a page-URL key: an empty key cannot be read from a URL.");
  });

  describe('ListState', () => {
    it('should type each value by its param', () => {
      expectTypeOf<ListState<typeof articleList>['page']>().toEqualTypeOf<number>();
      expectTypeOf<ListState<typeof articleList>['q']>().toEqualTypeOf<string | undefined>();
      expectTypeOf<ListState<typeof articleList>['status']>().toEqualTypeOf<
        ArticleStatusEnum | undefined
      >();
      expectTypeOf<ListState<typeof articleList>['sort']>().toEqualTypeOf<readonly Sort[]>();
    });

    it('should require a numeric page with a default', () => {
      expect(() =>
        defineList({
          // @ts-expect-error — `page` must be a ListParam<number>
          params: { page: stringParam('page') },
          qubee: { driver: STRAPI_DRIVER },
          resource: 'articles',
        })
      ).not.toThrow();

      expect(() =>
        defineList({
          // @ts-expect-error — without a default, `page` could be undefined
          params: { page: integerParam('page') },
          qubee: { driver: STRAPI_DRIVER },
          resource: 'articles',
        })
      ).not.toThrow();
    });
  });

  describe('input', () => {
    it('should declare no input for an apply whose input is never', () => {
      const list = defineList({
        apply: (builder, _state, _input?: never) => {
          builder.setLimit(5);
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expectTypeOf<ListInput<typeof list>>().toBeNever();
      expect(buildListRequest(list, readListState(list, '?page=2')).uri).toBe(
        '/tasks?pagination[page]=2&pagination[pageSize]=5'
      );
    });

    it('should declare no input for an apply whose input is undefined', () => {
      const _required = defineList({
        apply: (_builder, _state, _input: undefined) => {},
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });
      const _optional = defineList({
        apply: (_builder, _state, _input?: undefined) => {},
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expectTypeOf<ListInput<typeof _required>>().toBeNever();
      expectTypeOf<ListInput<typeof _optional>>().toBeNever();
    });
  });
});
