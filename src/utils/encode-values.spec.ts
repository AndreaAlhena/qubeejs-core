import type { QueryBuilderState } from '../types/query-builder-state.type';

import { FilterOperatorEnum } from '../enums/filter-operator.enum';
import { SortEnum } from '../enums/sort.enum';
import { encodeValues } from './encode-values';

describe('encodeValues', () => {
  const baseState: QueryBuilderState = {
    baseUrl: '',
    embedded: {},
    fields: {},
    filters: {},
    includes: [],
    isLastPageKnown: false,
    lastPage: 1,
    limit: 15,
    operatorFilters: [],
    page: 1,
    resource: 'users',
    search: '',
    select: [],
    sorts: [],
  };

  describe('filters', () => {
    it('should percent-encode every URI-reserved character in a string value', () => {
      const state = { ...baseState, filters: { name: ['%foo & bar#+,'] } };

      expect(encodeValues(state).filters).toEqual({ name: ['%25foo%20%26%20bar%23%2B%2C'] });
    });

    it('should encode each value separately so a joining comma stays distinguishable', () => {
      const state = { ...baseState, filters: { id: ['a,b', 'c'] } };

      expect(encodeValues(state).filters['id'].join(',')).toBe('a%2Cb,c');
    });

    it('should keep numbers and booleans with their type', () => {
      const state = { ...baseState, filters: { active: [true], age: [42] } };

      expect(encodeValues(state).filters).toEqual({ active: [true], age: [42] });
    });

    it('should leave the single quote unencoded so strategies can still escape it', () => {
      const state = { ...baseState, filters: { name: ["O'Brien"] } };

      expect(encodeValues(state).filters['name']).toEqual(["O'Brien"]);
    });
  });

  describe('operator filters', () => {
    it('should encode string values and keep field and operator literal', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'name', operator: FilterOperatorEnum.ILIKE, values: ['%jo n%'] },
        ],
      };

      expect(encodeValues(state).operatorFilters).toEqual([
        { field: 'name', operator: FilterOperatorEnum.ILIKE, values: ['%25jo%20n%25'] },
      ]);
    });

    it('should keep numbers and booleans with their type', () => {
      const state = {
        ...baseState,
        operatorFilters: [
          { field: 'age', operator: FilterOperatorEnum.BTW, values: [18, 65] },
          { field: 'deleted', operator: FilterOperatorEnum.NULL, values: [true] },
        ],
      };

      expect(encodeValues(state).operatorFilters.map((filter) => filter.values)).toEqual([
        [18, 65],
        [true],
      ]);
    });
  });

  describe('search', () => {
    it('should encode the search term', () => {
      const state = { ...baseState, search: 'a&page[size]=100000' };

      expect(encodeValues(state).search).toBe('a%26page%5Bsize%5D%3D100000');
    });

    it('should keep an empty search empty', () => {
      expect(encodeValues(baseState).search).toBe('');
    });
  });

  describe('developer-supplied names', () => {
    it('should leave fields, includes, select, sorts and resource untouched', () => {
      const state = {
        ...baseState,
        fields: { users: ['first name'] },
        includes: ['author posts'],
        resource: 'user profiles',
        select: ['a b'],
        sorts: [{ field: 'created at', order: SortEnum.DESC }],
      };
      const encoded = encodeValues(state);

      expect(encoded.fields).toBe(state.fields);
      expect(encoded.includes).toBe(state.includes);
      expect(encoded.resource).toBe(state.resource);
      expect(encoded.select).toBe(state.select);
      expect(encoded.sorts).toBe(state.sorts);
    });
  });

  describe('immutability', () => {
    it('should not mutate the input state', () => {
      const state = {
        ...baseState,
        filters: { name: ['a b'] },
        operatorFilters: [{ field: 'x', operator: FilterOperatorEnum.EQ, values: ['c d'] }],
        search: 'e f',
      };

      encodeValues(state);

      expect(state.filters.name).toEqual(['a b']);
      expect(state.operatorFilters[0].values).toEqual(['c d']);
      expect(state.search).toBe('e f');
    });
  });
});
