import type { QueryBuilderState } from '../types/query-builder-state.type';

import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { SortEnum } from '../enums/sort.enum';
import { InvalidFilterOperatorValueError } from '../errors/invalid-filter-operator-value.error';
import { InvalidLimitError } from '../errors/invalid-limit.error';
import { UnsupportedFilterOperatorError } from '../errors/unsupported-filter-operator.error';
import { QueryBuilderOptions } from '../models/query-builder-options';
import { FastapiRequestStrategy } from './fastapi-request.strategy';

describe('FastapiRequestStrategy', () => {
  let strategy: FastapiRequestStrategy;
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
    strategy = new FastapiRequestStrategy();
    options = new QueryBuilderOptions({});
  });

  it('should emit only the fastapi-pagination params for a default state', () => {
    expect(strategy.buildUri(baseState, options)).toBe('/articles?page=1&size=10');
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
      'https://api.example.com/articles?page=1&size=10'
    );
  });

  describe('pagination', () => {
    it('should emit the configured page key and the fixed size key', () => {
      const state = { ...baseState, limit: 25, page: 3 };
      const renamed = new QueryBuilderOptions({ limit: 'per_page', page: 'p' });

      expect(strategy.buildUri(state, renamed)).toBe('/articles?p=3&size=25');
    });
  });

  describe('simple filters', () => {
    it('should emit a single value as a bare equality', () => {
      const state = { ...baseState, filters: { status: ['published'] } };

      expect(strategy.buildUri(state, options)).toBe('/articles?status=published&page=1&size=10');
    });

    it('should fold several values to one comma-separated __in', () => {
      const state = { ...baseState, filters: { status: ['draft', 'published'] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?status__in=draft,published&page=1&size=10'
      );
    });

    it('should skip a filter with no values', () => {
      const state = { ...baseState, filters: { status: [] } };

      expect(strategy.buildUri(state, options)).toBe('/articles?page=1&size=10');
    });

    it('should emit numbers and booleans as they are', () => {
      const state = { ...baseState, filters: { featured: [true], views: [10] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?featured=true&views=10&page=1&size=10'
      );
    });

    it('should percent-encode string values, commas included', () => {
      const state = { ...baseState, filters: { title: ['Tom & Jerry', 'a,b'] } };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?title__in=Tom%20%26%20Jerry,a%2Cb&page=1&size=10'
      );
    });
  });

  describe('operator filters', () => {
    it.each([
      [FilterOperatorEnum.EQ, 'views=10'],
      [FilterOperatorEnum.GT, 'views__gt=10'],
      [FilterOperatorEnum.GTE, 'views__gte=10'],
      [FilterOperatorEnum.LT, 'views__lt=10'],
      [FilterOperatorEnum.LTE, 'views__lte=10'],
    ])('should translate %s to its fastapi-filter suffix', (operator, segment) => {
      const state = { ...baseState, operatorFilters: [{ field: 'views', operator, values: [10] }] };

      expect(strategy.buildUri(state, options)).toBe(`/articles?${segment}&page=1&size=10`);
    });

    it.each([
      [FilterOperatorEnum.CONTAINS, 'title__like=%25rails%25'],
      [FilterOperatorEnum.ILIKE, 'title__ilike=%25rails%25'],
      [FilterOperatorEnum.SW, 'title__like=rails%25'],
    ])('should send %s as a like pattern with its wildcards', (operator, segment) => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'title', operator, values: ['rails'] }],
      };

      expect(strategy.buildUri(state, options)).toBe(`/articles?${segment}&page=1&size=10`);
    });

    it('should emit IN as one comma-separated __in', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'id', operator: FilterOperatorEnum.IN, values: [1, 2, 3] }],
      };

      expect(strategy.buildUri(state, options)).toBe('/articles?id__in=1,2,3&page=1&size=10');
    });

    it('should emit NOT with one value as __neq', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'status', operator: FilterOperatorEnum.NOT, values: ['draft'] }],
      };

      expect(strategy.buildUri(state, options)).toBe('/articles?status__neq=draft&page=1&size=10');
    });

    it('should emit NOT with several values as one comma-separated __not_in', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'status', operator: FilterOperatorEnum.NOT, values: ['draft', 'archived'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?status__not_in=draft,archived&page=1&size=10'
      );
    });

    it('should split BTW into a __gte and a __lte condition', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.BTW, values: [10, 50] }],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?views__gte=10&views__lte=50&page=1&size=10'
      );
    });

    it('should reject BTW without exactly two values', () => {
      const state = {
        ...baseState,
        operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.BTW, values: [10] }],
      };

      expect(() => strategy.buildUri(state, options)).toThrowError(InvalidFilterOperatorValueError);
    });

    it.each([
      [true, 'deleted_at__isnull=true'],
      [false, 'deleted_at__isnull=false'],
    ])('should emit NULL %s as __isnull', (value, segment) => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'deleted_at', operator: FilterOperatorEnum.NULL, values: [value] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(`/articles?${segment}&page=1&size=10`);
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
        operatorFilters: [{ field: 'body', operator, values: ['fastapi'] }],
      };

      expect(() => strategy.buildUri(state, options)).toThrowError(UnsupportedFilterOperatorError);
    });

    it('should pass a prefixed related field through', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'author__name', operator: FilterOperatorEnum.ILIKE, values: ['ada'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?author__name__ilike=%25ada%25&page=1&size=10'
      );
    });

    it('should percent-encode operator values, wildcards in the value included', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'title', operator: FilterOperatorEnum.CONTAINS, values: ['100% a+b'] },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?title__like=%25100%25%20a%2Bb%25&page=1&size=10'
      );
    });
  });

  describe('sort', () => {
    it('should emit one comma-separated order_by, - for descending', () => {
      const state = {
        ...baseState,
        sorts: [
          { field: 'created_at', order: SortEnum.DESC },
          { field: 'title', order: SortEnum.ASC },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?order_by=-created_at,title&page=1&size=10'
      );
    });

    it('should send a repeated field once, keeping its first sort', () => {
      const state = {
        ...baseState,
        sorts: [
          { field: 'title', order: SortEnum.ASC },
          { field: 'created_at', order: SortEnum.DESC },
          { field: 'title', order: SortEnum.DESC },
        ],
      };

      expect(strategy.buildUri(state, options)).toBe(
        '/articles?order_by=title,-created_at&page=1&size=10'
      );
    });
  });

  describe('search', () => {
    it('should emit the configured search key', () => {
      const state = { ...baseState, search: 'orm tips' };

      expect(strategy.buildUri(state, options)).toBe('/articles?search=orm%20tips&page=1&size=10');
      expect(strategy.buildUri(state, new QueryBuilderOptions({ search: 'q' }))).toBe(
        '/articles?q=orm%20tips&page=1&size=10'
      );
    });
  });

  it('should emit filters, operator filters, sort, search, then pagination', () => {
    const state = {
      ...baseState,
      filters: { status: ['published'] },
      limit: 25,
      operatorFilters: [{ field: 'views', operator: FilterOperatorEnum.GTE, values: [10] }],
      page: 2,
      search: 'orm',
      sorts: [{ field: 'created_at', order: SortEnum.DESC }],
    };

    expect(strategy.buildUri(state, options)).toBe(
      '/articles?status=published&views__gte=10&order_by=-created_at&search=orm&page=2&size=25'
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
    it('should declare filters, operators, sort and search only', () => {
      expect(strategy.capabilities).toEqual({
        embedded: false,
        fields: false,
        filters: true,
        includes: false,
        operatorFilters: true,
        search: true,
        select: false,
        sort: true,
      });
    });
  });
});
