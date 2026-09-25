import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { QueryBuilderState } from '../src/types/query-builder-state.type';

import { DRIVERS } from '../src/drivers/driver-registry';
import { DriverEnum } from '../src/enums/driver.enum';
import { PaginationModeEnum } from '../src/enums/pagination-mode.enum';
import { QueryBuilderOptions } from '../src/models/query-builder-options';
import { ResponseOptions } from '../src/models/response-options';

const driversDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'drivers');

// Every URI-reserved character that has broken a real query: `%` (invalid
// escape), `&` (ends the parameter), `#` (starts the fragment), `+` (decoded as
// a space), `,` (the multi-value separator).
const reserved = '%foo & bar#+,';

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
  resource: 'items',
  search: '',
  select: [],
  sorts: [],
};

// A well-formed parameter name: `filter[name][_eq]`, `$filter`, `name:in`,
// `page[number]`. A clause split off by a raw `&` (` status='live')`) is not.
const parameterName = /^[\w$.:[\]-]+$/;

/**
 * Parse a generated URI the way a server would.
 *
 * @param uri - A URI produced by a request strategy
 * @returns The decoded query parameters
 */
function parseQuery(uri: string): URLSearchParams {
  return new URL(uri, 'http://localhost').searchParams;
}

describe('DRIVERS registry', () => {
  it('covers every DriverEnum member', () => {
    expect(Object.keys(DRIVERS).sort()).toEqual(Object.values(DriverEnum).sort());
  });

  it('gives every definition an id matching its registry key', () => {
    // createQubee() reads `driver.id` to name the driver in capability errors,
    // so a mismatch would produce a confidently wrong message.
    const mismatched = Object.entries(DRIVERS)
      .filter(([key, definition]) => key !== definition.id)
      .map(([key, definition]) => `${key} declares id '${definition.id}'`);

    expect(mismatched).toEqual([]);
  });

  it('has no orphaned driver file', () => {
    // The one hazard the per-file split introduces: a *.driver.ts nothing imports.
    const onDisk = globSync('*.driver.ts', { cwd: driversDir }).length;
    expect(onDisk).toBe(Object.keys(DRIVERS).length);
  });

  describe.each(Object.entries(DRIVERS))('%s', (_driver, definition) => {
    it('constructs a request strategy exposing capabilities', () => {
      const strategy = definition.createRequestStrategy(PaginationModeEnum.QUERY);
      expect(strategy.capabilities).toBeDefined();
      expect(typeof strategy.buildUri).toBe('function');
    });

    it('constructs a response strategy', () => {
      expect(typeof definition.createResponseStrategy().paginate).toBe('function');
    });

    it('constructs response options', () => {
      expect(definition.createResponseOptions({})).toBeInstanceOf(ResponseOptions);
    });

    describe('value encoding', () => {
      const strategy = definition.createRequestStrategy(PaginationModeEnum.QUERY);
      const options = new QueryBuilderOptions({});

      /**
       * Build the URI for a state, then parse it back.
       *
       * @param state - Overrides applied to the base state
       * @returns The decoded query parameters
       */
      const roundTrip = (state: Partial<QueryBuilderState>): URLSearchParams =>
        parseQuery(strategy.buildUri({ ...baseState, ...state }, options));

      it.runIf(strategy.capabilities.filters)(
        'delivers a filter value intact and splits off no parameter',
        () => {
          const plain = roundTrip({ filters: { name: ['plain'], status: ['live'] } });
          const encoded = roundTrip({ filters: { name: [reserved], status: ['live'] } });

          expect([...encoded.keys()]).toEqual([...plain.keys()]);
          expect([...encoded.keys()].filter((key) => !parameterName.test(key))).toEqual([]);
          expect([...encoded.values()].some((value) => value.includes(reserved))).toBe(true);
        }
      );

      it.runIf(strategy.capabilities.search)(
        'delivers a search term intact and splits off no parameter',
        () => {
          const plain = roundTrip({ search: 'plain' });
          const encoded = roundTrip({ search: reserved });

          expect([...encoded.keys()]).toEqual([...plain.keys()]);
          expect([...encoded.keys()].filter((key) => !parameterName.test(key))).toEqual([]);
          expect([...encoded.values()]).toContain(reserved);
        }
      );
    });
  });
});
