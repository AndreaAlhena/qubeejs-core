import type { IRequestStrategy } from '../interfaces/request-strategy.interface';

import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { PaginationModeEnum } from '../enums/pagination-mode.enum';
import { SortEnum } from '../enums/sort.enum';
import { InvalidLimitError } from '../errors/invalid-limit.error';
import { InvalidPageNumberError } from '../errors/invalid-page-number.error';
import { PaginationNotSyncedError } from '../errors/pagination-not-synced.error';
import { ParamCollisionError } from '../errors/param-collision.error';
import { UnselectableModelError } from '../errors/unselectable-model.error';
import { UnsupportedEmbeddedError } from '../errors/unsupported-embedded.error';
import { UnsupportedFieldSelectionError } from '../errors/unsupported-field-selection.error';
import { UnsupportedFilterOperatorError } from '../errors/unsupported-filter-operator.error';
import { UnsupportedFilterError } from '../errors/unsupported-filter.error';
import { UnsupportedIncludesError } from '../errors/unsupported-includes.error';
import { UnsupportedSearchError } from '../errors/unsupported-search.error';
import { UnsupportedSelectError } from '../errors/unsupported-select.error';
import { UnsupportedSortError } from '../errors/unsupported-sort.error';
import { QueryBuilderOptions } from '../models/query-builder-options';
import { JsonApiRequestStrategy } from '../strategies/json-api-request.strategy';
import { LaravelRequestStrategy } from '../strategies/laravel-request.strategy';
import { NestjsRequestStrategy } from '../strategies/nestjs-request.strategy';
import { PostgrestRequestStrategy } from '../strategies/postgrest-request.strategy';
import { SpatieRequestStrategy } from '../strategies/spatie-request.strategy';
import { QubeeStore } from './qubee-store';
import { QueryBuilder } from './query-builder';

describe('QueryBuilder standard config', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new SpatieRequestStrategy());
  });

  it('should be created', () => {
    expect(builder).toBeTruthy();
  });

  it('should generate a URI', () => {
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('/users');
  });

  it('should generate a URI with a custom limit', () => {
    builder.setResource('users');
    builder.setLimit(25);

    const uri = builder.generateUri();

    expect(uri).toContain('limit=25');
  });

  it('should generate a URI with a default limit', () => {
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('limit=15');
  });

  it('should generate a URI with a custom page', () => {
    builder.setResource('users');
    builder.setPage(5);

    const uri = builder.generateUri();

    expect(uri).toContain('page=5');
  });

  it('should generate a URI with a default page', () => {
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('page=1');
  });

  it('should generate a URI with fields (single model)', () => {
    builder.addFields('users', ['email', 'name']);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('fields[users]=email,name');
  });

  it('should ignore empty fields (single model)', () => {
    builder.addFields('users', []);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).not.toContain('fields[users]=');
  });

  it('should generate a URI with included models', () => {
    builder.addIncludes('model1', 'model2');
    builder.addIncludes('model3');
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toBe('/users?include=model1,model2,model3&limit=15&page=1');
  });

  it('should generate a URI with fields (multiple models)', () => {
    builder.addFields('users', ['email', 'name']);
    builder.addFields('settings', ['field1', 'field2']);
    builder.addIncludes('settings');
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('fields[users]=email,name');
    expect(uri).toContain('fields[settings]=field1,field2');
  });

  it('should generate a URI with filter (multiple values)', () => {
    builder.addFilter('id', 1, 2, 3);
    builder.addFilter('name', 'doe');
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('filter[id]=1,2,3');
    expect(uri).toContain('filter[name]=doe');
  });

  it('should generate a URI with filter (mixed values)', () => {
    builder.addFilter('field', 1, '2', 3);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('filter[field]=1,2,3');
  });

  it('should ignore empty filters', () => {
    builder.addFilter('field');
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).not.toContain('filter[field]=');
  });

  it('should generate a URI with filter (boolean value)', () => {
    builder.addFilter('isActive', true);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('filter[isActive]=true');
  });

  it('should generate a URI with sorted field ASC', () => {
    builder.addSort('f', SortEnum.ASC);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('sort=f');
  });

  it('should generate a URI with sorted fields mixed ASC and DESC', () => {
    builder.addSort('f1', SortEnum.DESC);
    builder.addSort('f2', SortEnum.ASC);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('sort=-f1,f2');
  });

  it('should generate a URI with sorted field DESC', () => {
    builder.addSort('f', SortEnum.DESC);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('sort=-f');
  });

  it('should reset the internal state', () => {
    builder.setResource('users');
    builder.addFields('settings', ['a']);
    builder.reset();
    builder.setResource('settings');

    const uri = builder.generateUri();

    expect(uri).toBe('/settings?limit=15&page=1');
  });

  it('should generate a URL if a base url is given', () => {
    builder.setResource('users');
    builder.setBaseUrl('https://domain.com');

    const uri = builder.generateUri();

    expect(uri).toContain('https://domain.com/users');
  });

  it('should throw an error if the model requested as field is not the model property / included in the includes object', () => {
    builder.addFields('users', ['email', 'name']);
    builder.addFields('settings', ['field1', 'field2']);
    builder.setResource('users');

    expect(() => builder.generateUri()).toThrowError(
      new UnselectableModelError('settings').message
    );
  });
});

describe('QueryBuilder custom config', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(
      store,
      new SpatieRequestStrategy(),
      new QueryBuilderOptions({
        appends: 'app',
        fields: 'fld',
        filters: 'flt',
        includes: 'inc',
        limit: 'lmt',
        page: 'p',
        sort: 'srt',
      })
    );
  });

  it('should generate a URI with fields (single model)', () => {
    builder.addFields('users', ['email', 'name']);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('fld[users]=email,name');
  });

  it('should generate a URI with filter', () => {
    builder.addFilter('id', 1, 2, 3);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('flt[id]=1,2,3');
  });

  it('should generate a URI with included models', () => {
    builder.addIncludes('model1', 'model2');
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('inc=model1,model2');
  });

  it('should generate a URI with a custom limit', () => {
    builder.setResource('users');
    builder.setLimit(25);

    const uri = builder.generateUri();

    expect(uri).toContain('lmt=25');
  });

  it('should generate a URI with a custom page', () => {
    builder.setResource('users');
    builder.setPage(5);

    const uri = builder.generateUri();

    expect(uri).toContain('p=5');
  });

  it('should generate a URI with sorted field ASC', () => {
    builder.addSort('f', SortEnum.ASC);
    builder.setResource('users');

    const uri = builder.generateUri();

    expect(uri).toContain('srt=f');
  });
});

describe('QueryBuilder driver validation (Spatie)', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new SpatieRequestStrategy());
  });

  it('should throw UnsupportedFilterOperatorError when calling addFilterOperator', () => {
    expect(() => builder.addFilterOperator('field', FilterOperatorEnum.EQ, 'value')).toThrowError(
      UnsupportedFilterOperatorError
    );
  });

  it('should throw UnsupportedSelectError when calling addSelect', () => {
    expect(() => builder.addSelect('col1', 'col2')).toThrowError(UnsupportedSelectError);
  });

  it('should throw UnsupportedSearchError when calling setSearch', () => {
    expect(() => builder.setSearch('term')).toThrowError(UnsupportedSearchError);
  });

  it('should throw UnsupportedSearchError when calling deleteSearch', () => {
    expect(() => builder.deleteSearch()).toThrowError(UnsupportedSearchError);
  });

  it('should throw UnsupportedSelectError when calling deleteSelect', () => {
    expect(() => builder.deleteSelect('col1')).toThrowError(UnsupportedSelectError);
  });

  it('should throw UnsupportedFilterOperatorError when calling deleteOperatorFilters', () => {
    expect(() => builder.deleteOperatorFilters('field')).toThrowError(
      UnsupportedFilterOperatorError
    );
  });

  it('should delegate setLimit validation to the active strategy (rejects -1 for Spatie)', () => {
    expect(() => builder.setLimit(-1)).toThrowError(InvalidLimitError);
  });

  it('should throw UnsupportedEmbeddedError when calling addEmbedded', () => {
    expect(() => builder.addEmbedded('author', 'id')).toThrowError(UnsupportedEmbeddedError);
  });

  it('should throw UnsupportedEmbeddedError when calling deleteEmbedded', () => {
    expect(() => builder.deleteEmbedded('author')).toThrowError(UnsupportedEmbeddedError);
  });
});

describe('QueryBuilder driver id', () => {
  it('names a driver id this package does not ship in capability errors', () => {
    const builder = new QueryBuilder(
      new QubeeStore(),
      new LaravelRequestStrategy(),
      undefined,
      'studio-api'
    );

    expect(() => builder.addFilter('status', 'published')).toThrowError(
      expect.objectContaining({
        driver: 'studio-api',
        message: "The 'studio-api' driver does not support filters.",
      })
    );
  });
});

describe('QueryBuilder driver validation (Laravel)', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new LaravelRequestStrategy());
  });

  it('should throw UnsupportedFilterError when calling addFilter', () => {
    expect(() => builder.addFilter('field', 'value')).toThrowError(UnsupportedFilterError);
  });

  it('should throw UnsupportedSortError when calling addSort', () => {
    expect(() => builder.addSort('field', SortEnum.ASC)).toThrowError(UnsupportedSortError);
  });

  it('should throw UnsupportedFieldSelectionError when calling addFields', () => {
    expect(() => builder.addFields('users', ['id'])).toThrowError(UnsupportedFieldSelectionError);
  });

  it('should throw UnsupportedIncludesError when calling addIncludes', () => {
    expect(() => builder.addIncludes('model1')).toThrowError(UnsupportedIncludesError);
  });

  it('should throw UnsupportedFilterOperatorError when calling addFilterOperator', () => {
    expect(() => builder.addFilterOperator('field', FilterOperatorEnum.EQ, 'value')).toThrowError(
      UnsupportedFilterOperatorError
    );
  });

  it('should throw UnsupportedSelectError when calling addSelect', () => {
    expect(() => builder.addSelect('col1', 'col2')).toThrowError(UnsupportedSelectError);
  });

  it('should throw UnsupportedSearchError when calling setSearch', () => {
    expect(() => builder.setSearch('term')).toThrowError(UnsupportedSearchError);
  });

  it('should throw UnsupportedFilterError when calling deleteFilters with args', () => {
    expect(() => builder.deleteFilters('field')).toThrowError(UnsupportedFilterError);
  });

  it('should throw UnsupportedSortError when calling deleteSorts with args', () => {
    expect(() => builder.deleteSorts('field')).toThrowError(UnsupportedSortError);
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFields', () => {
    expect(() => builder.deleteFields({ users: ['id'] })).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFieldsByModel', () => {
    expect(() => builder.deleteFieldsByModel('users', 'id')).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedIncludesError when calling deleteIncludes', () => {
    expect(() => builder.deleteIncludes('model1')).toThrowError(UnsupportedIncludesError);
  });

  it('should throw UnsupportedFilterOperatorError when calling deleteOperatorFilters', () => {
    expect(() => builder.deleteOperatorFilters('field')).toThrowError(
      UnsupportedFilterOperatorError
    );
  });

  it('should throw UnsupportedSelectError when calling deleteSelect', () => {
    expect(() => builder.deleteSelect('col1')).toThrowError(UnsupportedSelectError);
  });

  it('should throw UnsupportedSearchError when calling deleteSearch', () => {
    expect(() => builder.deleteSearch()).toThrowError(UnsupportedSearchError);
  });

  it('should not throw when calling setResource', () => {
    expect(() => builder.setResource('users')).not.toThrow();
  });

  it('should not throw when calling setBaseUrl', () => {
    expect(() => builder.setBaseUrl('https://api.example.com')).not.toThrow();
  });

  it('should not throw when calling setLimit', () => {
    expect(() => builder.setLimit(10)).not.toThrow();
  });

  it('should not throw when calling setPage', () => {
    expect(() => builder.setPage(1)).not.toThrow();
  });

  it('should not throw when calling reset', () => {
    expect(() => builder.reset()).not.toThrow();
  });

  it('should not throw when calling generateUri', () => {
    builder.setResource('users');
    const uri = builder.generateUri();

    expect(uri).toContain('/users');
  });
});

describe('QueryBuilder driver validation (NestJS)', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new NestjsRequestStrategy());
  });

  it('should throw UnsupportedFieldSelectionError when calling addFields', () => {
    expect(() => builder.addFields('users', ['id'])).toThrowError(UnsupportedFieldSelectionError);
  });

  it('should throw UnsupportedIncludesError when calling addIncludes', () => {
    expect(() => builder.addIncludes('model1')).toThrowError(UnsupportedIncludesError);
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFields', () => {
    expect(() => builder.deleteFields({ users: ['id'] })).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFieldsByModel', () => {
    expect(() => builder.deleteFieldsByModel('users', 'id')).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedIncludesError when calling deleteIncludes', () => {
    expect(() => builder.deleteIncludes('model1')).toThrowError(UnsupportedIncludesError);
  });

  it('should not throw when calling addFilter', () => {
    expect(() => builder.addFilter('status', 'active')).not.toThrow();
  });

  it('should not throw when calling addSort', () => {
    expect(() => builder.addSort('name', SortEnum.ASC)).not.toThrow();
  });

  it('should not throw when calling deleteFilters', () => {
    builder.addFilter('status', 'active');
    expect(() => builder.deleteFilters('status')).not.toThrow();
  });

  it('should not throw when calling deleteSorts', () => {
    builder.addSort('name', SortEnum.ASC);
    expect(() => builder.deleteSorts('name')).not.toThrow();
  });

  it('should allow NestJS-specific methods', () => {
    expect(() => builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18)).not.toThrow();
    expect(() => builder.addSelect('col1', 'col2')).not.toThrow();
    expect(() => builder.setSearch('test')).not.toThrow();
    expect(() => builder.deleteSearch()).not.toThrow();
    expect(() => builder.deleteSelect('col1')).not.toThrow();
    expect(() => builder.deleteOperatorFilters('age')).not.toThrow();
  });

  it('should generate a URI with NestJS format', () => {
    builder.setResource('users');
    builder.addFilter('status', 'active');
    builder.addSort('name', SortEnum.ASC);

    const uri = builder.generateUri();

    expect(uri).toContain('/users?');
    expect(uri).toContain('filter.status=active');
    expect(uri).toContain('sortBy=name:ASC');
    expect(uri).toContain('limit=15');
    expect(uri).toContain('page=1');
  });

  it('should generate a URI with operator filters', () => {
    builder.setResource('users');
    builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18);

    const uri = builder.generateUri();

    expect(uri).toContain('filter.age=$gte:18');
  });

  it('should generate a URI with select', () => {
    builder.setResource('users');
    builder.addSelect('id', 'name', 'email');

    const uri = builder.generateUri();

    expect(uri).toContain('select=id,name,email');
  });

  it('should generate a URI with search', () => {
    builder.setResource('users');
    builder.setSearch('john');

    const uri = builder.generateUri();

    expect(uri).toContain('search=john');
  });

  it('should accept setLimit(-1) (fetch all) and propagate to the generated URI', () => {
    builder.setResource('users');
    expect(() => builder.setLimit(-1)).not.toThrow();

    const uri = builder.generateUri();

    expect(uri).toContain('limit=-1');
  });
});

describe('QueryBuilder pagination navigation helpers', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new NestjsRequestStrategy());
  });

  describe('currentPage', () => {
    it('should return state.page', () => {
      expect(builder.currentPage()).toBe(1);
      builder.setPage(7);
      expect(builder.currentPage()).toBe(7);
    });
  });

  describe('firstPage', () => {
    it('should set page to 1', () => {
      builder.setPage(5);
      builder.firstPage();
      expect(builder.currentPage()).toBe(1);
    });

    it('should be idempotent when already on page 1', () => {
      builder.firstPage();
      expect(builder.currentPage()).toBe(1);
    });

    it('should return this for chaining', () => {
      expect(builder.firstPage()).toBe(builder);
    });
  });

  describe('nextPage', () => {
    it('should increment page by 1 when bounds are unknown', () => {
      builder.setPage(3);
      builder.nextPage();
      expect(builder.currentPage()).toBe(4);
    });

    it('should no-op when already at lastPage (bounds known)', () => {
      store.syncLastPage(5);
      builder.setPage(5);
      builder.nextPage();
      expect(builder.currentPage()).toBe(5);
    });

    it('should increment when below lastPage (bounds known)', () => {
      store.syncLastPage(5);
      builder.setPage(3);
      builder.nextPage();
      expect(builder.currentPage()).toBe(4);
    });

    it('should return this for chaining', () => {
      expect(builder.nextPage()).toBe(builder);
    });
  });

  describe('previousPage', () => {
    it('should decrement page by 1', () => {
      builder.setPage(4);
      builder.previousPage();
      expect(builder.currentPage()).toBe(3);
    });

    it('should be floored at 1 (idempotent on page 1)', () => {
      builder.previousPage();
      expect(builder.currentPage()).toBe(1);
    });

    it('should return this for chaining', () => {
      expect(builder.previousPage()).toBe(builder);
    });
  });

  describe('lastPage', () => {
    it('should throw PaginationNotSyncedError before any paginate()', () => {
      expect(() => builder.lastPage()).toThrowError(PaginationNotSyncedError);
    });

    it('should set page to state.lastPage after sync', () => {
      store.syncLastPage(8);
      builder.lastPage();
      expect(builder.currentPage()).toBe(8);
    });

    it('should return this for chaining after sync', () => {
      store.syncLastPage(3);
      expect(builder.lastPage()).toBe(builder);
    });
  });

  describe('goToPage', () => {
    it('should set page to n', () => {
      builder.goToPage(4);
      expect(builder.currentPage()).toBe(4);
    });

    it('should throw InvalidPageNumberError for 0', () => {
      expect(() => builder.goToPage(0)).toThrowError(InvalidPageNumberError);
    });

    it('should throw InvalidPageNumberError for a negative page', () => {
      expect(() => builder.goToPage(-3)).toThrowError(InvalidPageNumberError);
    });

    it('should throw InvalidPageNumberError for a non-integer', () => {
      expect(() => builder.goToPage(2.5)).toThrowError(InvalidPageNumberError);
    });

    it('should throw InvalidPageNumberError when n > lastPage and bounds known', () => {
      store.syncLastPage(5);
      expect(() => builder.goToPage(10)).toThrowError(InvalidPageNumberError);
    });

    it('should allow n === lastPage when bounds known', () => {
      store.syncLastPage(5);
      builder.goToPage(5);
      expect(builder.currentPage()).toBe(5);
    });

    it('should allow any positive n when bounds unknown', () => {
      builder.goToPage(999);
      expect(builder.currentPage()).toBe(999);
    });

    it('should return this for chaining', () => {
      expect(builder.goToPage(2)).toBe(builder);
    });
  });

  describe('isFirstPage', () => {
    it('should return true on page 1', () => {
      expect(builder.isFirstPage()).toBe(true);
    });

    it('should return false on other pages', () => {
      builder.setPage(3);
      expect(builder.isFirstPage()).toBe(false);
    });
  });

  describe('isLastPage', () => {
    it('should return false when bounds unknown (conservative default)', () => {
      expect(builder.isLastPage()).toBe(false);
      builder.setPage(99);
      expect(builder.isLastPage()).toBe(false);
    });

    it('should return true when page === lastPage (bounds known)', () => {
      store.syncLastPage(5);
      builder.setPage(5);
      expect(builder.isLastPage()).toBe(true);
    });

    it('should return false when page < lastPage (bounds known)', () => {
      store.syncLastPage(5);
      builder.setPage(3);
      expect(builder.isLastPage()).toBe(false);
    });
  });

  describe('hasNextPage', () => {
    it('should return true when bounds unknown (conservative default)', () => {
      expect(builder.hasNextPage()).toBe(true);
    });

    it('should return true when page < lastPage', () => {
      store.syncLastPage(5);
      builder.setPage(3);
      expect(builder.hasNextPage()).toBe(true);
    });

    it('should return false when page === lastPage', () => {
      store.syncLastPage(5);
      builder.setPage(5);
      expect(builder.hasNextPage()).toBe(false);
    });
  });

  describe('hasPreviousPage', () => {
    it('should return false on page 1', () => {
      expect(builder.hasPreviousPage()).toBe(false);
    });

    it('should return true on any page > 1', () => {
      builder.setPage(2);
      expect(builder.hasPreviousPage()).toBe(true);
    });
  });

  describe('totalPages', () => {
    it('should throw PaginationNotSyncedError before any paginate()', () => {
      expect(() => builder.totalPages()).toThrowError(PaginationNotSyncedError);
    });

    it('should return state.lastPage after sync', () => {
      store.syncLastPage(12);
      expect(builder.totalPages()).toBe(12);
    });
  });
});

describe('QueryBuilder auto-reset page on result-set-changing mutations', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new NestjsRequestStrategy());
    builder.setResource('users');
    builder.setPage(5);
  });

  it('setLimit should reset page to 1', () => {
    builder.setLimit(25);
    expect(builder.currentPage()).toBe(1);
  });

  it('setResource should reset page to 1', () => {
    builder.setResource('posts');
    expect(builder.currentPage()).toBe(1);
  });

  it('setSearch should reset page to 1', () => {
    builder.setSearch('term');
    expect(builder.currentPage()).toBe(1);
  });

  it('deleteSearch should reset page to 1', () => {
    builder.setSearch('term');
    builder.setPage(5);
    builder.deleteSearch();
    expect(builder.currentPage()).toBe(1);
  });

  it('addFilter should reset page to 1', () => {
    builder.addFilter('status', 'active');
    expect(builder.currentPage()).toBe(1);
  });

  it('deleteFilters should reset page to 1', () => {
    builder.addFilter('status', 'active');
    builder.setPage(5);
    builder.deleteFilters('status');
    expect(builder.currentPage()).toBe(1);
  });

  it('addFilterOperator should reset page to 1', () => {
    builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18);
    expect(builder.currentPage()).toBe(1);
  });

  it('deleteOperatorFilters should reset page to 1', () => {
    builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18);
    builder.setPage(5);
    builder.deleteOperatorFilters('age');
    expect(builder.currentPage()).toBe(1);
  });

  it('addSort should reset page to 1', () => {
    builder.addSort('name', SortEnum.ASC);
    expect(builder.currentPage()).toBe(1);
  });

  it('deleteSorts should reset page to 1', () => {
    builder.addSort('name', SortEnum.ASC);
    builder.setPage(5);
    builder.deleteSorts('name');
    expect(builder.currentPage()).toBe(1);
  });

  it('setBaseUrl should NOT reset page', () => {
    builder.setBaseUrl('https://api.example.com');
    expect(builder.currentPage()).toBe(5);
  });

  it('addSelect should NOT reset page', () => {
    builder.addSelect('id', 'name');
    expect(builder.currentPage()).toBe(5);
  });

  it('deleteSelect should NOT reset page', () => {
    builder.addSelect('id', 'name');
    builder.setPage(5);
    builder.deleteSelect('id');
    expect(builder.currentPage()).toBe(5);
  });
});

describe('QueryBuilder auto-reset page — Spatie-only mutations', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new SpatieRequestStrategy());
    builder.setResource('users');
    builder.setPage(5);
  });

  it('addFields should NOT reset page', () => {
    builder.addFields('users', ['id', 'email']);
    expect(builder.currentPage()).toBe(5);
  });

  it('deleteFields should NOT reset page', () => {
    builder.addFields('users', ['id', 'email']);
    builder.setPage(5);
    builder.deleteFields({ users: ['id'] });
    expect(builder.currentPage()).toBe(5);
  });

  it('deleteFieldsByModel should NOT reset page', () => {
    builder.addFields('users', ['id', 'email']);
    builder.setPage(5);
    builder.deleteFieldsByModel('users', 'id');
    expect(builder.currentPage()).toBe(5);
  });

  it('addIncludes should NOT reset page', () => {
    builder.addIncludes('profile');
    expect(builder.currentPage()).toBe(5);
  });

  it('deleteIncludes should NOT reset page', () => {
    builder.addIncludes('profile');
    builder.setPage(5);
    builder.deleteIncludes('profile');
    expect(builder.currentPage()).toBe(5);
  });
});

describe('QueryBuilder driver validation (PostgREST)', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new PostgrestRequestStrategy());
  });

  // Supported: filters, sorts, flat select, pagination
  it('should accept addFilter', () => {
    expect(() => builder.addFilter('status', 'active')).not.toThrow();
  });

  it('should accept deleteFilters', () => {
    builder.addFilter('status', 'active');
    expect(() => builder.deleteFilters('status')).not.toThrow();
  });

  it('should accept addSort', () => {
    expect(() => builder.addSort('name', SortEnum.ASC)).not.toThrow();
  });

  it('should accept deleteSorts', () => {
    builder.addSort('name', SortEnum.ASC);
    expect(() => builder.deleteSorts('name')).not.toThrow();
  });

  it('should accept addSelect', () => {
    expect(() => builder.addSelect('id', 'email')).not.toThrow();
  });

  it('should accept deleteSelect', () => {
    builder.addSelect('id', 'email');
    expect(() => builder.deleteSelect('id')).not.toThrow();
  });

  it('should accept addEmbedded', () => {
    expect(() => builder.addEmbedded('author', 'id', 'name')).not.toThrow();
  });

  it('should accept deleteEmbedded', () => {
    builder.addEmbedded('author', 'id', 'name');
    expect(() => builder.deleteEmbedded('author')).not.toThrow();
  });

  // Unsupported: fields, includes, operator filters, search
  it('should throw UnsupportedFieldSelectionError when calling addFields', () => {
    expect(() => builder.addFields('users', ['id'])).toThrowError(UnsupportedFieldSelectionError);
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFields', () => {
    expect(() => builder.deleteFields({ users: ['id'] })).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedFieldSelectionError when calling deleteFieldsByModel', () => {
    expect(() => builder.deleteFieldsByModel('users', 'id')).toThrowError(
      UnsupportedFieldSelectionError
    );
  });

  it('should throw UnsupportedIncludesError when calling addIncludes', () => {
    expect(() => builder.addIncludes('profile')).toThrowError(UnsupportedIncludesError);
  });

  it('should throw UnsupportedIncludesError when calling deleteIncludes', () => {
    expect(() => builder.deleteIncludes('profile')).toThrowError(UnsupportedIncludesError);
  });

  it('should accept addFilterOperator', () => {
    expect(() => builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18)).not.toThrow();
  });

  it('should accept deleteOperatorFilters', () => {
    builder.addFilterOperator('age', FilterOperatorEnum.GTE, 18);
    expect(() => builder.deleteOperatorFilters('age')).not.toThrow();
  });

  it('should throw UnsupportedSearchError when calling setSearch', () => {
    expect(() => builder.setSearch('term')).toThrowError(UnsupportedSearchError);
  });

  it('should throw UnsupportedSearchError when calling deleteSearch', () => {
    expect(() => builder.deleteSearch()).toThrowError(UnsupportedSearchError);
  });

  // URI generation end-to-end
  it('should generate a URI with PostgREST format', () => {
    builder.setResource('users');
    builder.addFilter('status', 'active');
    builder.addSort('created_at', SortEnum.DESC);

    const uri = builder.generateUri();

    expect(uri).toContain('/users?');
    expect(uri).toContain('status=eq.active');
    expect(uri).toContain('order=created_at.desc');
    expect(uri).toContain('limit=15');
  });

  it('should splice embedded relations into the select param end-to-end', () => {
    builder.setResource('articles');
    builder.addEmbedded('author', 'id', 'name').addEmbedded('comments').addSelect('title');

    const uri = builder.generateUri();

    expect(uri).toContain('select=title,author(id,name),comments(*)');
  });

  it('should merge-dedup columns when addEmbedded is called repeatedly for the same relation', () => {
    builder.setResource('articles');
    builder.addEmbedded('author', 'id').addEmbedded('author', 'id', 'name').addSelect('title');

    const uri = builder.generateUri();

    expect(uri).toContain('select=title,author(id,name)');
  });

  it('should drop a relation from the URI after deleteEmbedded', () => {
    builder.setResource('articles');
    builder.addEmbedded('author', 'id', 'name').addSelect('title').deleteEmbedded('author');

    const uri = builder.generateUri();

    expect(uri).toContain('select=title');
    expect(uri).not.toContain('author');
  });

  it('should return null from paginationHeaders in QUERY mode (default)', () => {
    expect(builder.paginationHeaders()).toBeNull();
  });
});

describe('QueryBuilder paginationHeaders (PostgREST, RANGE mode)', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new PostgrestRequestStrategy(PaginationModeEnum.RANGE));
  });

  it('should return Range-Unit and Range headers', () => {
    builder.setLimit(10);
    builder.setPage(3);

    expect(builder.paginationHeaders()).toEqual({
      'Range-Unit': 'items',

      Range: '20-29',
    });
  });

  it('should omit limit/offset from the generated URI in RANGE mode', () => {
    builder.setResource('users');
    builder.setLimit(10);
    builder.setPage(2);

    const uri = builder.generateUri();

    expect(uri).not.toContain('limit=');
    expect(uri).not.toContain('offset=');
  });
});

describe('QueryBuilder paginationHeaders (other drivers return null)', () => {
  it('should return null for the Spatie driver', () => {
    const builder = new QueryBuilder(new QubeeStore(), new SpatieRequestStrategy());

    expect(builder.paginationHeaders()).toBeNull();
  });
});

describe('QueryBuilder params', () => {
  let builder: QueryBuilder;
  let store: QubeeStore;

  beforeEach(() => {
    store = new QubeeStore();
    builder = new QueryBuilder(store, new NestjsRequestStrategy()).setResource('jobs');
  });

  describe('setParam', () => {
    it('should append a param after the parameters the driver emits', () => {
      // The thekage-fe case: a top-level `status`, not `filter.status` (#22).
      expect(builder.setParam('status', 'failed').generateUri()).toBe(
        '/jobs?limit=15&page=1&status=failed'
      );
    });

    it('should append params in the order their keys were first set', () => {
      builder.setParam('include', 'queue').setParam('status', 'failed').setParam('include', 'user');

      expect(builder.generateUri()).toBe('/jobs?limit=15&page=1&include=user&status=failed');
    });

    it('should replace the values of a key that is set again', () => {
      builder.setParam('status', 'failed').setParam('status', 'done');

      expect(builder.generateUri()).toBe('/jobs?limit=15&page=1&status=done');
    });

    it('should join several values with a literal comma, encoding each', () => {
      expect(builder.setParam('ids', 'a,b', 'c').generateUri()).toBe(
        '/jobs?limit=15&page=1&ids=a%2Cb,c'
      );
    });

    it('should percent-encode values the way filter values are', () => {
      builder.setParam('q', '%foo & bar#+').addFilter('name', '%foo & bar#+');

      const uri = builder.generateUri();

      expect(uri).toContain('filter.name=%25foo%20%26%20bar%23%2B');
      expect(uri).toContain('q=%25foo%20%26%20bar%23%2B');
    });

    it('should accept numbers and booleans', () => {
      expect(builder.setParam('flags', 1, true).generateUri()).toContain('flags=1,true');
    });

    it('should emit the key verbatim', () => {
      expect(builder.setParam('meta[tag]', 'news').generateUri()).toContain('meta[tag]=news');
    });

    it('should reset the page to 1', () => {
      builder.setPage(4).setParam('status', 'failed');

      expect(builder.currentPage()).toBe(1);
    });

    it('should do nothing when called with no values', () => {
      builder.setPage(4).setParam('status');

      expect(builder.currentPage()).toBe(4);
      expect(store.getSnapshot().params).toEqual({});
    });

    it('should not be gated by capabilities', () => {
      // Laravel declares no filters, sorts, includes or search at all.
      const laravel = new QueryBuilder(
        new QubeeStore(),
        new LaravelRequestStrategy(),
        undefined,
        'laravel'
      );

      expect(laravel.setResource('jobs').setParam('include', 'author').generateUri()).toBe(
        '/jobs?limit=15&page=1&include=author'
      );
    });

    it('should start the query string when the driver emits none', () => {
      const range = new QueryBuilder(
        new QubeeStore(),
        new PostgrestRequestStrategy(PaginationModeEnum.RANGE)
      );

      expect(range.setResource('jobs').setParam('status', 'eq.failed').generateUri()).toBe(
        '/jobs?status=eq.failed'
      );
    });
  });

  describe('deleteParams', () => {
    it('should remove the named params', () => {
      builder.setParam('include', 'queue').setParam('status', 'failed').deleteParams('include');

      expect(builder.generateUri()).toBe('/jobs?limit=15&page=1&status=failed');
    });

    it('should reset the page to 1', () => {
      builder.setParam('status', 'failed').setPage(4).deleteParams('status');

      expect(builder.currentPage()).toBe(1);
    });

    it('should do nothing when called with no keys', () => {
      builder.setParam('status', 'failed').setPage(4).deleteParams();

      expect(builder.currentPage()).toBe(4);
      expect(builder.generateUri()).toContain('status=failed');
    });
  });

  describe('reset', () => {
    it('should clear params', () => {
      builder.setParam('status', 'failed').reset().setResource('jobs');

      expect(builder.generateUri()).toBe('/jobs?limit=15&page=1');
    });
  });

  describe('collisions', () => {
    it('should throw ParamCollisionError for a key the driver emits', () => {
      builder.setParam('page', 2);

      expect(() => builder.generateUri()).toThrowError(ParamCollisionError);
    });

    it('should throw for a plain key the driver emits in bracket form', () => {
      const jsonApi = new QueryBuilder(
        new QubeeStore(),
        new JsonApiRequestStrategy(),
        undefined,
        'json-api'
      );

      jsonApi.setResource('jobs').setParam('page', 2);

      expect(() => jsonApi.generateUri()).toThrowError(
        "The param 'page' collides with 'page[number]', which the 'json-api' driver emits. Use the builder method that controls it, or remove the param with deleteParams('page')."
      );
    });

    it('should allow a sibling of a bracketed key the driver emits', () => {
      const jsonApi = new QueryBuilder(new QubeeStore(), new JsonApiRequestStrategy());

      expect(jsonApi.setResource('jobs').setParam('page[cursor]', 'abc').generateUri()).toBe(
        '/jobs?page[number]=1&page[size]=15&page[cursor]=abc'
      );
    });

    it('should leave a key free until the driver emits it', () => {
      builder.setParam('sortBy', 'name:DESC');

      expect(builder.generateUri()).toContain('sortBy=name%3ADESC');

      builder.addSort('name', SortEnum.ASC);

      expect(() => builder.generateUri()).toThrowError(ParamCollisionError);
    });

    it('should reserve a pagination key the driver leaves out of page 1', () => {
      // PostgREST emits `offset` from page 2 on. Without looking ahead, the
      // param would work on page 1 and throw once the user navigated (#22).
      const postgrest = new QueryBuilder(new QubeeStore(), new PostgrestRequestStrategy());

      postgrest.setResource('jobs').setParam('offset', 5);

      expect(() => postgrest.generateUri()).toThrowError(
        expect.objectContaining({ driverKey: 'offset', key: 'offset' })
      );
    });

    it('should reserve pagination keys on later pages too', () => {
      const postgrest = new QueryBuilder(new QubeeStore(), new PostgrestRequestStrategy());

      postgrest.setResource('jobs').setParam('offset', 5).setPage(3);

      expect(() => postgrest.generateUri()).toThrowError(ParamCollisionError);
    });

    it('should name an unknown driver generically', () => {
      builder.setParam('limit', 5);

      expect(() => builder.generateUri()).toThrowError(
        "The param 'limit' collides with 'limit', which the active driver emits."
      );
    });
  });

  describe('custom request strategies', () => {
    // A strategy that implements the contract directly and never reaches
    // AbstractRequestStrategy.parts() must still get its params (#22).
    const bare = (uri: string): IRequestStrategy => ({
      buildUri: () => uri,
      capabilities: {
        embedded: false,
        fields: false,
        filters: false,
        includes: false,
        operatorFilters: false,
        search: false,
        select: false,
        sort: false,
      },
      validateLimit: () => undefined,
    });

    it('should append params to a URI with no query string', () => {
      const custom = new QueryBuilder(new QubeeStore(), bare('/jobs'), undefined, 'studio-api');

      expect(custom.setParam('status', 'failed').generateUri()).toBe('/jobs?status=failed');
    });

    it('should append params to a URI with a query string', () => {
      const custom = new QueryBuilder(new QubeeStore(), bare('/jobs?cursor=abc'));

      expect(custom.setParam('status', 'failed').generateUri()).toBe(
        '/jobs?cursor=abc&status=failed'
      );
    });

    it('should detect a collision with a key the custom strategy emits', () => {
      const custom = new QueryBuilder(
        new QubeeStore(),
        bare('/jobs?cursor=abc'),
        undefined,
        'studio-api'
      );

      custom.setParam('cursor', 'def');

      expect(() => custom.generateUri()).toThrowError(
        expect.objectContaining({ driver: 'studio-api', driverKey: 'cursor', key: 'cursor' })
      );
    });
  });
});
