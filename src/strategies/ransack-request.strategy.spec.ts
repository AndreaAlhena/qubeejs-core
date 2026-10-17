import type { QueryBuilderState } from '../types/query-builder-state.type';

import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { SortEnum } from '../enums/sort.enum';
import { InvalidFilterOperatorValueError } from '../errors/invalid-filter-operator-value.error';
import { InvalidLimitError } from '../errors/invalid-limit.error';
import { UnsupportedFilterOperatorError } from '../errors/unsupported-filter-operator.error';
import { QueryBuilderOptions } from '../models/query-builder-options';
import { RansackRequestStrategy } from './ransack-request.strategy';

describe('RansackRequestStrategy', () => {
  let strategy: RansackRequestStrategy;
  let options: QueryBuilderOptions;

  const baseState: QueryBuilderState = {
    baseUrl: '',
    embedded: {},
    fields: {},
    filters: {},
    includes: [],
    isLastPageKnown: false,
    lastPage: 1,
    limit: 10,
    operatorFilters: [],
    page: 1,
    resource: 'articles',
    search: '',
    select: [],
    sorts: [],
  };

  beforeEach(() => {
    strategy = new RansackRequestStrategy();
    options = new QueryBuilderOptions({});
  });

  it('should emit only the Pagy pagination params for a default state', () => {
    expect(strategy.buildUri(baseState, options)).toBe('/articles?page=1&limit=10');
  });

  it('should throw when the resource is not set', () => {
    const state = { ...baseState, resource: '' };

    expect(() => strategy.buildUri(state, options)).toThrowError(
      'Set the resource property BEFORE adding filters or calling the url() / get() methods'
    );
  });

  it('should honour baseUrl', () => {
    const state = { ...baseState, baseUrl: 'https://api.example.com/' };

    expect(strategy.buildUri(state, options)).toBe(
      'https://api.example.com/articles?page=1&limit=10'
    );
  });

  describe('pagination', () => {
    it('should emit the configured page and limit keys', () => {
      const state = { ...baseState, limit: 25, page: 3 };
      const kaminari = new QueryBuilderOptions({ limit: 'per_page' });

      expect(strategy.buildUri(state, kaminari)).toBe('/articles?page=3&per_page=25');
    });
  });

  describe('simple filters', () => {
    it('should fold a single value to _eq', () => {
      const state = { ...baseState, filters: { status: ['published'] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[status_eq]=published&page=1&limit=10'
      );
    });

    it('should fold several values to repeated _in[] keys', () => {
      const state = { ...baseState, filters: { status: ['draft', 'published'] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[status_in][]=draft&q[status_in][]=published&page=1&limit=10'
      );
    });

    it('should skip a filter with no values', () => {
      const state = { ...baseState, filters: { status: [] } };

      expect(strategy.buildUri(state, options)).toBe('/articles?page=1&limit=10');
    });

    it('should emit numbers and booleans as they are', () => {
      const state = { ...baseState, filters: { featured: [true], views: [10] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[featured_eq]=true&q[views_eq]=10&page=1&limit=10'
      );
    });

    it('should percent-encode string values', () => {
      const state = { ...baseState, filters: { title: ['Tom & Jerry'] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[title_eq]=Tom%20%26%20Jerry&page=1&limit=10'
      );
    });
  });

  describe('operator filters', () => {
    it.each([
      [FilterOperatorEnum.EQ, 'q[views_eq]=10'],
      [FilterOperatorEnum.GT, 'q[views_gt]=10'],
      [FilterOperatorEnum.GTE, 'q[views_gteq]=10'],
      [FilterOperatorEnum.LT, 'q[views_lt]=10'],
      [FilterOperatorEnum.LTE, 'q[views_lteq]=10'],
      [FilterOperatorEnum.CONTAINS, 'q[views_cont]=10'],
      [FilterOperatorEnum.ILIKE, 'q[views_i_cont]=10'],
      [FilterOperatorEnum.SW, 'q[views_start]=10'],
    ])('should translate %s to its Ransack predicate', (operator, segment) => {
      const state = { ...baseState, operatorFilters: [{ field: 'views', operator, values: [10] }] };

      expect(strategy.buildUri(state, options)).toBe(`/articles?${segment}&page=1&limit=10`);
    });

    it('should emit IN as repeated _in[] keys', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'id', operator: FilterOperatorEnum.IN, values: [1, 2, 3] }],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[id_in][]=1&q[id_in][]=2&q[id_in][]=3&page=1&limit=10'
      );
    });

    it('should emit NOT with one value as _not_eq', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'status', operator: FilterOperatorEnum.NOT, values: ['draft'] }],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[status_not_eq]=draft&page=1&limit=10'
      );
    });

    it('should emit NOT with several values as repeated _not_in[] keys', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'status', operator: FilterOperatorEnum.NOT, values: ['draft', 'archived'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[status_not_in][]=draft&q[status_not_in][]=archived&page=1&limit=10'
      );
    });

    it('should split BTW into a _gteq and a _lteq condition', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.BTW, values: [10, 50] }],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[views_gteq]=10&q[views_lteq]=50&page=1&limit=10'
      );
    });

    it('should reject BTW without exactly two values', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.BTW, values: [10] }],
      };

      expect(() => strategy.buildUri(state, options)).toThrowError(InvalidFilterOperatorValueError);
    });

    it('should emit NULL true as _null=1', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'deleted_at', operator: FilterOperatorEnum.NULL, values: [true] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[deleted_at_null]=1&page=1&limit=10'
      );
    });

    it('should emit NULL false as _not_null=1', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'deleted_at', operator: FilterOperatorEnum.NULL, values: [false] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[deleted_at_not_null]=1&page=1&limit=10'
      );
    });

    it.each([[['yes']], [[true, false]], [[]]])(
      'should reject NULL with %j instead of exactly one boolean',
      (values) => {
        const state = {
          ...baseState,
          operatorFilters: [{ field: 'deleted_at', operator: FilterOperatorEnum.NULL, values }],
        };

        expect(() => strategy.buildUri(state, options)).toThrowError(
          InvalidFilterOperatorValueError
        );
      }
    );

    it.each([
      FilterOperatorEnum.FTS,
      FilterOperatorEnum.PHFTS,
      FilterOperatorEnum.PLFTS,
      FilterOperatorEnum.WFTS,
    ])('should reject the full-text operator %s', (operator) => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'body', operator, values: ['rails'] }],
      };

      expect(() => strategy.buildUri(state, options)).toThrowError(UnsupportedFilterOperatorError);
    });

    it('should pass a combinator field name through, for a search across columns', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'title_or_body', operator: FilterOperatorEnum.ILIKE, values: ['rails'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[title_or_body_i_cont]=rails&page=1&limit=10'
      );
    });

    it('should percent-encode operator values', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'title', operator: FilterOperatorEnum.CONTAINS, values: ['a+b'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[title_cont]=a%2Bb&page=1&limit=10'
      );
    });
  });

  describe('sort', () => {
    it('should emit one q[s][] entry per sort, in order', () => {
      const state = {
        ...baseState,
        sorts: [
          { field: 'created_at', order: SortEnum.DESC },
          { field: 'title', order: SortEnum.ASC },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?q[s][]=created_at+desc&q[s][]=title+asc&page=1&limit=10'
      );
    });
  });

  it('should emit filters, operator filters, sorts, then pagination', () => {
    const state = {
      ...baseState,
      filters: { status: ['published'] },
      limit: 25,
      operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.GTE, values: [10] }],
      page: 2,
      sorts: [{ field: 'created_at', order: SortEnum.DESC }],
    };

    expect(strategy.buildUri(state, options)).toBe(
      '/articles?q[status_eq]=published&q[views_gteq]=10&q[s][]=created_at+desc&page=2&limit=25'
    );
  });

  describe('validateLimit', () => {
    it('should accept positive integers', () => {
      expect(() => strategy.validateLimit(1)).not.toThrow();
      expect(() => strategy.validateLimit(100)).not.toThrow();
    });

    it('should reject 0, negatives, and non-integers', () => {
      expect(() => strategy.validateLimit(0)).toThrowError(InvalidLimitError);
      expect(() => strategy.validateLimit(-1)).toThrowError(InvalidLimitError);
      expect(() => strategy.validateLimit(1.5)).toThrowError(InvalidLimitError);
    });
  });

  describe('capabilities', () => {
    it('should declare filters, operators and sort only', () => {
      expect(strategy.capabilities).toEqual({
        embedded: false,
        fields: false,
        filters: true,
        includes: false,
        operatorFilters: true,
        search: false,
        select: false,
        sort: true,
      });
    });
  });
});
