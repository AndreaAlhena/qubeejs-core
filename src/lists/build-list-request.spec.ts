import { articleList } from '../../test/fixtures/article-list';
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
});
