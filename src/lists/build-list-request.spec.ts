import type { ListDefinition } from '../types/list-definition.type';
import type { ListInput } from '../types/list-input.type';
import type { ListParams } from '../types/list-params.type';
import type { ListRequest } from '../types/list-request.type';
import type { SearchParamsInput } from '../types/search-params-input.type';

import { articleList } from '../../test/fixtures/article-list';
import { taskList } from '../../test/fixtures/task-list';
import { JSON_API_DRIVER } from '../drivers/json-api.driver';
import { LARAVEL_DRIVER } from '../drivers/laravel.driver';
import { POSTGREST_DRIVER } from '../drivers/postgrest.driver';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { PaginationModeEnum } from '../enums/pagination-mode.enum';
import { InvalidResourceNameError } from '../errors/invalid-resource-name.error';
import { UnsupportedFilterError } from '../errors/unsupported-filter.error';
import { integerParam } from '../params/integer-param';
import { sortParam } from '../params/sort-param';
import { stringParam } from '../params/string-param';
import { buildListRequest } from './build-list-request';
import { defineList } from './define-list';
import { readListState } from './read-list-state';

/**
 * Build a list's request from generic code, holding the list the way an adapter does: the
 * forwarding pattern `ListInput` documents.
 *
 * @param list - Any list
 * @param search - The page's query
 * @param args - The list's input, or `null` while it is not ready; nothing for a list without one
 * @returns The request, or `null` while the input is not ready
 */
function buildRequestFor<TList extends ListDefinition<ListParams>>(
  list: TList,
  search: SearchParamsInput,
  ...args: [ListInput<TList>] extends [never] ? [] : [input: ListInput<TList> | null]
): ListRequest | null {
  const loose: ListDefinition<ListParams> = list;
  const wide: ListDefinition<ListParams, NonNullable<unknown>> = list;
  const [input] = args;

  if (input === null) {
    return null;
  }

  const state = readListState(loose, search);

  return input === undefined
    ? buildListRequest(loose, state)
    : buildListRequest(wide, state, input);
}

describe('buildListRequest', () => {
  it('should apply the page after apply resets it', () => {
    // apply() calls setLimit(), addSort() and addFilter(), each of which resets
    // the page to 1; the page must still be 3.
    const request = buildListRequest(
      articleList,
      readListState(articleList, '?page=3&status=published')
    );

    expect(request.uri).toBe(
      '/articles?filters[status][$eq]=published&sort[0]=publishedAt:desc&pagination[page]=3&pagination[pageSize]=20'
    );
  });

  it('should return null headers when the driver pages in the query string', () => {
    expect(buildListRequest(articleList, readListState(articleList, '')).headers).toBeNull();
  });

  it('should build a JSON:API request', () => {
    const list = defineList({
      apply: (builder, { q, sort }) => {
        builder.setLimit(20);
        sort.forEach(({ field, order }) => builder.addSort(field, order));

        if (q) {
          builder.addFilter('title', q);
        }
      },
      params: {
        page: integerParam('page', { default: 1, min: 1 }),
        q: stringParam('q'),
        sort: sortParam('sort', { fields: ['title'] }),
      },
      qubee: { driver: JSON_API_DRIVER },
      resource: 'articles',
    });

    expect(buildListRequest(list, readListState(list, '?page=2&q=react&sort=title')).uri).toBe(
      '/articles?filter[title]=react&page[number]=2&page[size]=20&sort=title'
    );
  });

  it('should carry PostgREST range headers', () => {
    const list = defineList({
      apply: (builder) => {
        builder.setLimit(20);
      },
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { driver: POSTGREST_DRIVER, pagination: PaginationModeEnum.RANGE },
      resource: 'articles',
    });

    const request = buildListRequest(list, readListState(list, '?page=3'));

    expect(request.uri).toBe('/articles');
    expect(request.headers).toEqual({ Range: '40-59', 'Range-Unit': 'items' });
  });

  it('should prefix the base URL and work without apply', () => {
    const list = defineList({
      params: { page: integerParam('page', { default: 1, min: 1 }) },
      qubee: { baseUrl: 'https://example.com/api', driver: STRAPI_DRIVER },
      resource: 'articles',
    });

    expect(buildListRequest(list, readListState(list, '?page=2')).uri).toBe(
      'https://example.com/api/articles?pagination[page]=2&pagination[pageSize]=15'
    );
  });

  it('should parse with the same instance', () => {
    const request = buildListRequest(articleList, readListState(articleList, '?page=3'));

    const page = request.paginate<{ id: number }>({
      data: [{ id: 1 }, { id: 2 }],
      meta: { pagination: { page: 3, pageCount: 5, pageSize: 20, total: 82 } },
    });

    expect([page.page, page.lastPage, page.total]).toEqual([3, 5, 82]);
    expect(page.data[0].id).toBe(1);
  });

  it('should build each request on a fresh instance', () => {
    const state = readListState(articleList, '?page=3');
    const first = buildListRequest(articleList, state);

    first.paginate({
      data: [],
      meta: { pagination: { page: 1, pageCount: 1, pageSize: 20, total: 0 } },
    });

    expect(buildListRequest(articleList, state).uri).toBe(first.uri);
  });

  it('should let capability errors from apply propagate', () => {
    const list = defineList({
      apply: (builder) => {
        builder.addFilter('status', 'published');
      },
      params: { page: integerParam('page', { default: 1 }) },
      qubee: { driver: LARAVEL_DRIVER },
      resource: 'articles',
    });

    expect(() => buildListRequest(list, readListState(list, ''))).toThrowError(
      UnsupportedFilterError
    );
  });

  it.each(['?page=0', '?page=-2'])(
    'should fall back to the default page when %s is one the store rejects',
    (search) => {
      const list = defineList({
        params: { page: integerParam('page', { default: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'articles',
      });

      expect(buildListRequest(list, readListState(list, search)).uri).toBe(
        buildListRequest(list, readListState(list, '')).uri
      );
    }
  );

  it('should refuse an empty resource', () => {
    const list = defineList({
      params: { page: integerParam('page', { default: 1 }) },
      qubee: { driver: STRAPI_DRIVER },
      resource: '',
    });

    expect(() => buildListRequest(list, readListState(list, ''))).toThrowError(
      InvalidResourceNameError
    );
  });

  describe('input', () => {
    it('should pass the input to apply', () => {
      expect(
        buildListRequest(taskList, readListState(taskList, '?status=open&page=2'), {
          projectId: '42',
        }).uri
      ).toBe(
        '/tasks?filters[project][$eq]=42&filters[status][$eq]=open&pagination[page]=2&pagination[pageSize]=15'
      );
    });

    it('should keep the page when apply replaces the resource', () => {
      const list = defineList({
        apply: (builder, { status }, { projectId }: { projectId: string }) => {
          builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`);

          if (status) {
            builder.addFilter('status', status);
          }
        },
        params: taskList.params,
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expect(
        buildListRequest(list, readListState(list, '?status=open&page=3'), { projectId: '42' }).uri
      ).toBe(
        '/projects/42/tasks?filters[status][$eq]=open&pagination[page]=3&pagination[pageSize]=15'
      );
    });

    it('should not encode a resource segment again', () => {
      const list = defineList({
        apply: (builder, _state, { projectId }: { projectId: string }) => {
          builder.setResource(`projects/${encodeURIComponent(projectId)}/tasks`);
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });

      expect(buildListRequest(list, readListState(list, ''), { projectId: 'a/b c' }).uri).toBe(
        '/projects/a%2Fb%20c/tasks?pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should encode an input used as a filter value', () => {
      expect(
        buildListRequest(taskList, readListState(taskList, ''), { projectId: 'a&b c' }).uri
      ).toBe('/tasks?filters[project][$eq]=a%26b%20c&pagination[page]=1&pagination[pageSize]=15');
    });

    it('should not leak an input into the next request', () => {
      const state = readListState(taskList, '');
      const first = buildListRequest(taskList, state, { projectId: '42' });

      buildListRequest(taskList, state, { projectId: '7' });

      expect(first.uri).toBe(buildListRequest(taskList, state, { projectId: '42' }).uri);
      expect(buildListRequest(taskList, state, { projectId: '7' }).uri).toBe(
        '/tasks?filters[project][$eq]=7&pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should give apply undefined when the list is held as ListDefinition<ListParams>', () => {
      const received: unknown[] = [];
      const list = defineList({
        apply: (_builder, _state, input: { projectId: string }) => {
          received.push(input);
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });
      const loose: ListDefinition<ListParams> = list;

      buildListRequest(loose, readListState(loose, ''));

      expect(received).toEqual([undefined]);
    });
  });

  describe('input types', () => {
    const state = readListState(taskList, '');
    const articleState = readListState(articleList, '');

    it('should require a declared input', () => {
      // @ts-expect-error — taskList declares an input
      expect(() => buildListRequest(taskList, state)).toThrowError(TypeError);
    });

    it('should require an input whose fields are all optional', () => {
      const list = defineList({
        apply: (builder, _state, { tenantId }: { tenantId?: string }) => {
          if (tenantId) {
            builder.addFilter('tenant', tenantId);
          }
        },
        params: { page: integerParam('page', { default: 1, min: 1 }) },
        qubee: { driver: STRAPI_DRIVER },
        resource: 'tasks',
      });
      const listState = readListState(list, '');

      // @ts-expect-error — a declared input is required, even when every field is optional
      expect(() => buildListRequest(list, listState)).toThrowError(TypeError);
      expect(buildListRequest(list, listState, {}).uri).toBe(
        '/tasks?pagination[page]=1&pagination[pageSize]=15'
      );
    });

    it('should refuse an input for a list that declares none', () => {
      // @ts-expect-error — articleList declares no input
      buildListRequest(articleList, articleState, { projectId: '42' });
    });

    it('should refuse an input of the wrong shape', () => {
      // @ts-expect-error — projectId is a string
      buildListRequest(taskList, state, { projectId: 42 });
    });

    it('should compile without the input through ListDefinition<ListParams>', () => {
      const loose: ListDefinition<ListParams> = taskList;

      expect(() => buildListRequest(loose, readListState(loose, ''))).toThrowError(TypeError);
    });

    it('should refuse a third argument through ListDefinition<ListParams>', () => {
      const loose: ListDefinition<ListParams> = taskList;
      const looseState = readListState(loose, '');

      // @ts-expect-error — through the loose type, the list declares no input
      buildListRequest(loose, looseState, { projectId: '42' });
    });
  });

  describe('forwarding from generic code', () => {
    it('should forward the input', () => {
      expect(buildRequestFor(taskList, '?page=2', { projectId: '42' })?.uri).toBe(
        '/tasks?filters[project][$eq]=42&pagination[page]=2&pagination[pageSize]=15'
      );
    });

    it('should build nothing while the input is not ready', () => {
      expect(buildRequestFor(taskList, '', null)).toBeNull();
    });

    it('should build a list without an input', () => {
      expect(buildRequestFor(articleList, '?page=3')?.uri).toBe(
        buildListRequest(articleList, readListState(articleList, '?page=3')).uri
      );
    });

    it('should keep its callers checked', () => {
      // @ts-expect-error — taskList declares an input
      expect(() => buildRequestFor(taskList, '')).toThrowError(TypeError);
      // @ts-expect-error — articleList declares no input
      buildRequestFor(articleList, '', { projectId: '42' });
    });
  });
});
