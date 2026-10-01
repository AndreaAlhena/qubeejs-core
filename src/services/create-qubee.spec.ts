import { DRIVERS } from '../drivers/driver-registry';
import { LARAVEL_DRIVER } from '../drivers/laravel.driver';
import { POSTGREST_DRIVER } from '../drivers/postgrest.driver';
import { STRAPI_DRIVER } from '../drivers/strapi.driver';
import { DriverEnum } from '../enums/driver.enum';
import { PaginationModeEnum } from '../enums/pagination-mode.enum';
import { SortEnum } from '../enums/sort.enum';
import { UnsupportedFilterError } from '../errors/unsupported-filter.error';
import { createQubee } from './create-qubee';
import { Paginator } from './paginator';
import { QubeeStore } from './qubee-store';
import { QueryBuilder } from './query-builder';

describe('createQubee', () => {
  it('returns a builder, a paginator and a store', () => {
    const qubee = createQubee({ driver: STRAPI_DRIVER });

    expect(qubee.builder).toBeInstanceOf(QueryBuilder);
    expect(qubee.paginator).toBeInstanceOf(Paginator);
    expect(qubee.store).toBeInstanceOf(QubeeStore);
  });

  it('wires all three to the same store', () => {
    const { builder, paginator, store } = createQubee({ driver: STRAPI_DRIVER });

    builder.setResource('articles').setPage(4);
    expect(store.getSnapshot().page).toBe(4);

    paginator.paginate({
      data: [{ id: 1 }],
      meta: { pagination: { page: 2, pageCount: 6, pageSize: 10, total: 57 } },
    });

    // The paginated response taught the builder where it is.
    expect(store.getSnapshot().page).toBe(2);
    expect(builder.currentPage()).toBe(2);
    expect(builder.totalPages()).toBe(6);
  });

  it('builds the same URI as hand-wiring', () => {
    const store = new QubeeStore();
    const manual = new QueryBuilder(
      store,
      STRAPI_DRIVER.createRequestStrategy(PaginationModeEnum.QUERY)
    );
    const { builder } = createQubee({ driver: STRAPI_DRIVER });

    for (const qb of [manual, builder]) {
      qb.setResource('articles')
        .addFilter('status', 'published')
        .addSort('createdAt', SortEnum.DESC);
    }

    expect(builder.generateUri()).toBe(manual.generateUri());
  });

  it('names the driver in capability errors', () => {
    const { builder } = createQubee({ driver: LARAVEL_DRIVER });

    // Without `id` on the definition this would say "The active driver".
    expect(() => builder.addFilter('status', 'published')).toThrowError(
      "The 'laravel' driver does not support filters."
    );
    expect(() => builder.addFilter('status', 'published')).toThrowError(UnsupportedFilterError);
  });

  it('names a custom driver by its own id', () => {
    // #22: a driver defined outside the package could not name itself, so a
    // JSON:API variant had to borrow 'json-api' and its errors named the wrong
    // driver.
    const { builder } = createQubee({ driver: { ...LARAVEL_DRIVER, id: 'studio-api' } });

    expect(() => builder.addFilter('status', 'published')).toThrowError(
      "The 'studio-api' driver does not support filters."
    );
  });

  it('honours request key overrides', () => {
    // Strapi hardcodes `pagination[pageSize]`; Laravel reads `options.limit`.
    const { builder } = createQubee({
      driver: LARAVEL_DRIVER,
      request: { limit: 'perPage', page: 'pageNumber' },
    });

    const uri = builder.setResource('articles').setLimit(5).setPage(2).generateUri();

    expect(uri).toContain('perPage=5');
    expect(uri).toContain('pageNumber=2');
  });

  it('honours response key overrides', () => {
    const { paginator } = createQubee({
      driver: STRAPI_DRIVER,
      response: { data: 'rows', total: 'count' },
    });

    expect(paginator.paginate({ count: 12, rows: [{ id: 1 }, { id: 2 }] }).total).toBe(12);
  });

  it('passes the pagination mode to the request strategy', () => {
    const query = createQubee({ driver: POSTGREST_DRIVER, pagination: PaginationModeEnum.QUERY });
    const range = createQubee({ driver: POSTGREST_DRIVER, pagination: PaginationModeEnum.RANGE });

    query.builder.setResource('articles').setLimit(10);
    range.builder.setResource('articles').setLimit(10);

    // RANGE mode moves pagination out of the query string and into a header.
    expect(query.builder.generateUri()).toContain('limit=10');
    expect(range.builder.generateUri()).not.toContain('limit=10');
    expect(range.builder.paginationHeaders()).not.toBeNull();
  });

  it('defaults to query-mode pagination', () => {
    const { builder } = createQubee({ driver: POSTGREST_DRIVER });

    expect(builder.setResource('articles').setLimit(10).generateUri()).toContain('limit=10');
  });

  it('prefixes every URI with baseUrl', () => {
    const { builder } = createQubee({ baseUrl: 'https://example.com/api', driver: STRAPI_DRIVER });

    expect(builder.setResource('articles').setPage(2).generateUri()).toBe(
      'https://example.com/api/articles?pagination[page]=2&pagination[pageSize]=15'
    );
  });

  it('keeps URIs root-relative without baseUrl', () => {
    const { builder } = createQubee({ driver: STRAPI_DRIVER });

    expect(builder.setResource('articles').generateUri()).toMatch(/^\/articles\?/);
  });

  it('lets reset() clear baseUrl, as it clears setBaseUrl()', () => {
    const { builder, store } = createQubee({
      baseUrl: 'https://example.com/api',
      driver: STRAPI_DRIVER,
    });

    builder.reset();

    expect(store.getSnapshot().baseUrl).toBe('');
  });

  it('gives each call an independent store', () => {
    const a = createQubee({ driver: STRAPI_DRIVER });
    const b = createQubee({ driver: STRAPI_DRIVER });

    a.builder.setResource('articles').setPage(3);

    expect(b.store.getSnapshot().page).toBe(1);
    expect(b.store.getSnapshot().resource).toBe('');
  });

  it('accepts a definition looked up from the registry at runtime', () => {
    const { builder } = createQubee({ driver: DRIVERS[DriverEnum.POCKETBASE] });

    expect(builder.setResource('articles').generateUri()).toContain('/articles');
  });

  describe.each(Object.values(DriverEnum))('%s', (id) => {
    it('constructs and builds a URI', () => {
      const { builder } = createQubee({ driver: DRIVERS[id] });

      expect(builder.setResource('articles').generateUri()).toContain('/articles');
    });
  });
});
